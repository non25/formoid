import { useState } from "react";
import {
  ValidatedValues,
  ValidationSchema,
  initializeForm,
  makeFieldGroups,
  makeFieldProps,
  validateFieldArray,
  validateForm,
} from "./Form";
import { isFailure, isSuccess } from "./Result";
import { UseFieldArrayConfig, UseFieldArrayReturn } from "./useFieldArray";
import { useFieldArrayState } from "./useFieldArrayState";
import { UseFormConfig, UseFormReturn } from "./useForm";
import { useFormState } from "./useFormState";

type Overwrite<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U;

type UseCompoundFormConfig<A, B extends ValidationSchema<A>, C, D extends ValidationSchema<C>> = {
  form: Overwrite<
    UseFormConfig<A, B>,
    {
      validators: (values: { form: A; fieldArray: Array<C> }) => B;
    }
  >;
  fieldArray: Overwrite<
    UseFieldArrayConfig<C, D>,
    {
      validators: (values: { form: A; fieldArray: Array<C> }) => D;
    }
  >;
};

type OnSubmitCompound<A, B extends ValidationSchema<A>, C, D extends ValidationSchema<C>> = {
  (form: ValidatedValues<A, B>, fieldArray: Array<ValidatedValues<C, D>>): Promise<unknown>;
};

type OnSubmitCompoundMatch<A, B extends ValidationSchema<A>, C, D extends ValidationSchema<C>> = {
  onSuccess: OnSubmitCompound<A, B, C, D>;
  onFailure: () => unknown;
};

type HandleSubmitCompound<A, B extends ValidationSchema<A>, C, D extends ValidationSchema<C>> = {
  (onSubmit: OnSubmitCompound<A, B, C, D>): void;
  (onSubmit: OnSubmitCompoundMatch<A, B, C, D>): void;
};

type RedundantFields = "handleSubmit" | "isSubmitting";

type UseCompoundFormReturn<A, B extends ValidationSchema<A>, C, D extends ValidationSchema<C>> = {
  form: Omit<UseFormReturn<A, B>, RedundantFields>;
  fieldArray: Omit<UseFieldArrayReturn<C, D>, RedundantFields>;
  handleSubmit: HandleSubmitCompound<A, B, C, D>;
  isSubmitting: boolean;
};

export function useCompoundForm<
  A extends Record<string, unknown>,
  B extends ValidationSchema<A>,
  C extends Record<string, unknown>,
  D extends ValidationSchema<C>,
>(config: UseCompoundFormConfig<A, B, C, D>): UseCompoundFormReturn<A, B, C, D> {
  const form = useFormState(initializeForm(config.form.initialValues));
  const fieldArray = useFieldArrayState(config.fieldArray.initialValues.map(initializeForm));

  const values = { form: form.values, fieldArray: fieldArray.values };

  const fieldProps = makeFieldProps({
    form,
    schema: config.form.validators(values),
    validationStrategy: config.form.validationStrategy,
  });
  const fieldGroups = makeFieldGroups({
    fieldArray,
    schema: config.fieldArray.validators(values),
    validationStrategy: config.fieldArray.validationStrategy,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggle(action: "enable" | "disable") {
    setIsSubmitting(action === "disable");
    form.toggle(action);
    fieldArray.toggle(action);
  }

  const handleSubmit: HandleSubmitCompound<A, B, C, D> = (onSubmit) => {
    toggle("disable");
    Promise.all([
      validateForm(form.values, config.form.validators(values)),
      validateFieldArray(fieldArray.values, config.fieldArray.validators(values)),
    ]).then(([formResult, fieldArrayResult]) => {
      if (isSuccess(formResult) && isSuccess(fieldArrayResult)) {
        const submit = onSubmit instanceof Function ? onSubmit : onSubmit.onSuccess;

        submit(formResult.success, fieldArrayResult.success).finally(() => toggle("enable"));
      } else {
        if (isFailure(formResult)) {
          form.propagateErrors(formResult.failure);
        }

        if (isFailure(fieldArrayResult)) {
          fieldArray.propagateErrors(fieldArrayResult.failure);
        }

        toggle("enable");

        if (onSubmit instanceof Function) return;

        onSubmit.onFailure();
      }
    });
  };

  return {
    form: {
      errors: form.errors,
      fieldProps,
      handleReset: form.reset,
      setErrors: form.setErrors,
      setValues: form.setValues,
      values: form.values,
    },
    fieldArray: {
      append: fieldArray.append,
      errors: fieldArray.errors,
      groups: fieldGroups,
      handleReset: fieldArray.reset,
      remove: fieldArray.remove,
      setErrors: fieldArray.setErrors,
      setValues: fieldArray.setValues,
      values: fieldArray.values,
    },
    handleSubmit,
    isSubmitting,
  };
}

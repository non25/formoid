import { useState } from "react";
import {
  FormValuesConstraint,
  ValidatedValues,
  ValidationSchema,
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

type CompoundValues<Values, FieldArrayValues> = {
  form: Values;
  fieldArray: Array<FieldArrayValues>;
};

type UseCompoundFormConfig<
  Values extends FormValuesConstraint,
  Schema extends ValidationSchema<Values>,
  FieldArrayValues extends FormValuesConstraint,
  FieldArraySchema extends ValidationSchema<FieldArrayValues>,
> = {
  form: Overwrite<
    UseFormConfig<Values, Schema>,
    {
      validators: (values: CompoundValues<Values, FieldArrayValues>) => Schema;
    }
  >;
  fieldArray: Overwrite<
    UseFieldArrayConfig<FieldArrayValues, FieldArraySchema>,
    {
      validators: (values: CompoundValues<Values, FieldArrayValues>) => FieldArraySchema;
    }
  >;
};

type OnSubmitCompound<
  Values extends FormValuesConstraint,
  Schema extends ValidationSchema<Values>,
  FieldArrayValues extends FormValuesConstraint,
  FieldArraySchema extends ValidationSchema<FieldArrayValues>,
> = (
  values: CompoundValues<
    ValidatedValues<Values, Schema>,
    ValidatedValues<FieldArrayValues, FieldArraySchema>
  >,
) => Promise<unknown>;

type OnSubmitCompoundMatch<
  Values extends FormValuesConstraint,
  Schema extends ValidationSchema<Values>,
  FieldArrayValues extends FormValuesConstraint,
  FieldArraySchema extends ValidationSchema<FieldArrayValues>,
> = {
  onSuccess: OnSubmitCompound<Values, Schema, FieldArrayValues, FieldArraySchema>;
  onFailure: () => unknown;
};

type HandleSubmitCompound<
  Values extends FormValuesConstraint,
  Schema extends ValidationSchema<Values>,
  FieldArrayValues extends FormValuesConstraint,
  FieldArraySchema extends ValidationSchema<FieldArrayValues>,
> = {
  (onSubmit: OnSubmitCompound<Values, Schema, FieldArrayValues, FieldArraySchema>): void;
  (onSubmit: OnSubmitCompoundMatch<Values, Schema, FieldArrayValues, FieldArraySchema>): void;
};

type RedundantFields = "handleSubmit" | "isSubmitting";

type UseCompoundFormReturn<
  Values extends FormValuesConstraint,
  Schema extends ValidationSchema<Values>,
  FieldArrayValues extends FormValuesConstraint,
  FieldArraySchema extends ValidationSchema<FieldArrayValues>,
> = {
  form: Omit<UseFormReturn<Values, Schema>, RedundantFields>;
  fieldArray: Omit<UseFieldArrayReturn<FieldArrayValues, FieldArraySchema>, RedundantFields>;
  handleSubmit: HandleSubmitCompound<Values, Schema, FieldArrayValues, FieldArraySchema>;
  isSubmitting: boolean;
};

export function useCompoundForm<
  Values extends FormValuesConstraint,
  Schema extends ValidationSchema<Values>,
  FieldArrayValues extends FormValuesConstraint,
  FieldArraySchema extends ValidationSchema<FieldArrayValues>,
>(
  config: UseCompoundFormConfig<Values, Schema, FieldArrayValues, FieldArraySchema>,
): UseCompoundFormReturn<Values, Schema, FieldArrayValues, FieldArraySchema> {
  const { form: formConfig, fieldArray: fieldArrayConfig } = config;

  const form = useFormState(formConfig.initialValues);
  const fieldArray = useFieldArrayState(fieldArrayConfig.initialValues);

  const values: CompoundValues<Values, FieldArrayValues> = {
    form: form.values,
    fieldArray: fieldArray.values,
  };

  const fieldProps = makeFieldProps({
    form,
    schema: formConfig.validators(values),
    validationStrategy: formConfig.validationStrategy,
  });
  const fieldGroups = makeFieldGroups({
    fieldArray,
    schema: fieldArrayConfig.validators(values),
    validationStrategy: fieldArrayConfig.validationStrategy,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggle(action: "enable" | "disable") {
    setIsSubmitting(action === "disable");
    form.toggle(action);
    fieldArray.toggle(action);
  }

  const handleSubmit: HandleSubmitCompound<Values, Schema, FieldArrayValues, FieldArraySchema> = (
    onSubmit,
  ) => {
    toggle("disable");
    Promise.all([
      validateForm(form.values, formConfig.validators(values)),
      validateFieldArray(fieldArray.values, fieldArrayConfig.validators(values)),
    ]).then(([formResult, fieldArrayResult]) => {
      if (isSuccess(formResult) && isSuccess(fieldArrayResult)) {
        const submit = onSubmit instanceof Function ? onSubmit : onSubmit.onSuccess;

        submit({ form: formResult.success, fieldArray: fieldArrayResult.success }).finally(() =>
          toggle("enable"),
        );
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

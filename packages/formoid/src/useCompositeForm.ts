import { useRef, useState } from "react";
import {
  FieldArrayValidationFailure,
  FormErrors,
  Toggle,
  UnknownFieldArray,
  ValidatedValues,
  ValidationSchema,
  ValidationStrategy,
  makeFieldGroups,
  makeFieldProps,
  validateCompositeFieldArray,
  validateForm,
} from "./Form";
import { UnknownRecord, forEach, map } from "./Record";
import { isFailure, isSuccess } from "./Result";
import { UseFieldArrayReturn } from "./useFieldArray";
import { useFieldArrayState } from "./useFieldArrayState";
import { UseFormReturn } from "./useForm";
import { useFormState } from "./useFormState";

type RedundantFields = "handleSubmit" | "isSubmitting";

type CompositeValues<FormValues, FieldArrayValues> = {
  form: FormValues;
  fieldArray: FieldArrayValues;
};

type FieldArrayValidationSchema<FieldArrayValues extends UnknownFieldArray> = {
  [K in keyof FieldArrayValues]: ValidationSchema<FieldArrayValues[K][number]>;
};

type UseCompositeFormConfig<
  FormValues extends UnknownRecord,
  FormSchema extends ValidationSchema<FormValues>,
  FieldArrayValues extends UnknownFieldArray,
  FieldArraySchema extends FieldArrayValidationSchema<FieldArrayValues>,
> = {
  form: {
    initialValues: FormValues;
    validationStrategy: ValidationStrategy;
    validators: (values: CompositeValues<FormValues, FieldArrayValues>) => FormSchema;
  };
  fieldArray: {
    initialValues: FieldArrayValues;
    validationStrategy: ValidationStrategy;
    validators: (values: CompositeValues<FormValues, FieldArrayValues>) => FieldArraySchema;
  };
};

type FieldArrayReturn<FieldArrayValues extends UnknownFieldArray> = {
  [K in keyof FieldArrayValues]: Omit<UseFieldArrayReturn<FieldArrayValues[K][number], never>, RedundantFields>;
};

type FieldArrayValidatedValues<
  FieldArrayValues extends UnknownFieldArray,
  FieldArraySchema extends FieldArrayValidationSchema<FieldArrayValues>,
> = {
  [K in keyof FieldArrayValues]: Array<
    ValidatedValues<
      FieldArrayValues[K][number],
      FieldArraySchema[K] extends ValidationSchema<FieldArrayValues[K][number]>
        ? FieldArraySchema[K]
        : ValidationSchema<FieldArrayValues[K][number]>
    >
  >;
};

type OnSubmit<
  FormValues extends UnknownRecord,
  FormSchema extends ValidationSchema<FormValues>,
  FieldArrayValues extends UnknownFieldArray,
  FieldArraySchema extends FieldArrayValidationSchema<FieldArrayValues>,
> = (
  values: CompositeValues<
    ValidatedValues<FormValues, FormSchema>,
    FieldArrayValidatedValues<FieldArrayValues, FieldArraySchema>
  >,
) => Promise<unknown>;

type OnFailure<FormValues extends UnknownRecord, FieldArrayValues extends UnknownFieldArray> = (
  errors: CompositeValues<FormErrors<FormValues> | null, FieldArrayValidationFailure<FieldArrayValues> | null>,
) => unknown;

type OnSubmitMatch<
  FormValues extends UnknownRecord,
  FormSchema extends ValidationSchema<FormValues>,
  FieldArrayValues extends UnknownFieldArray,
  FieldArraySchema extends FieldArrayValidationSchema<FieldArrayValues>,
> = {
  onFailure: OnFailure<FormValues, FieldArrayValues>;
  onSuccess: OnSubmit<FormValues, FormSchema, FieldArrayValues, FieldArraySchema>;
};

type HandleSubmit<
  FormValues extends UnknownRecord,
  FormSchema extends ValidationSchema<FormValues>,
  FieldArrayValues extends UnknownFieldArray,
  FieldArraySchema extends FieldArrayValidationSchema<FieldArrayValues>,
> = {
  (onSubmit: OnSubmit<FormValues, FormSchema, FieldArrayValues, FieldArraySchema>): void;
  (onSubmit: OnSubmitMatch<FormValues, FormSchema, FieldArrayValues, FieldArraySchema>): void;
};

type UseCompositeFormReturn<
  FormValues extends UnknownRecord,
  FormSchema extends ValidationSchema<FormValues>,
  FieldArrayValues extends UnknownFieldArray,
  FieldArraySchema extends FieldArrayValidationSchema<FieldArrayValues>,
> = {
  fieldArray: FieldArrayReturn<FieldArrayValues>;
  form: Omit<UseFormReturn<FormValues, never>, RedundantFields>;
  handleReset: () => void;
  handleSubmit: HandleSubmit<FormValues, FormSchema, FieldArrayValues, FieldArraySchema>;
  isSubmitting: boolean;
};

export function useCompositeForm<
  FormValues extends UnknownRecord,
  FormSchema extends ValidationSchema<FormValues>,
  FieldArrayValues extends UnknownFieldArray,
  FieldArraySchema extends FieldArrayValidationSchema<FieldArrayValues>,
>(
  config: UseCompositeFormConfig<FormValues, FormSchema, FieldArrayValues, FieldArraySchema>,
): UseCompositeFormReturn<FormValues, FormSchema, FieldArrayValues, FieldArraySchema> {
  const form = useFormState(config.form.initialValues);

  const compositeFieldArrayInitialValues = useRef(config.fieldArray.initialValues);
  const fieldArray = map(compositeFieldArrayInitialValues.current, useFieldArrayState);

  const values: CompositeValues<FormValues, FieldArrayValues> = {
    form: form.values,
    fieldArray: map(fieldArray, ({ values }) => values) as FieldArrayValues,
  };

  const fieldProps = makeFieldProps({
    form,
    schema: config.form.validators(values),
    validationStrategy: config.form.validationStrategy,
  });
  const compositeFieldArray: FieldArrayReturn<FieldArrayValues> = map(fieldArray, (state, key) => ({
    append: state.append,
    errors: state.errors,
    groups: makeFieldGroups({
      fieldArray: state,
      schema: config.fieldArray.validators(values)[key],
      validationStrategy: config.fieldArray.validationStrategy,
    }),
    handleReset: state.reset,
    remove: state.remove,
    setErrors: state.setErrors,
    setValues: state.setValues,
    values: state.values,
  }));

  const handleReset = () => {
    form.reset();
    forEach(fieldArray, (item) => item.reset());
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggle: Toggle = (action) => {
    setIsSubmitting(action === "disable");
    form.toggle(action);
    forEach(fieldArray, (item) => item.toggle(action));
  };

  const handleSubmit: HandleSubmit<FormValues, FormSchema, FieldArrayValues, FieldArraySchema> = (onSubmit) => {
    toggle("disable");
    Promise.all([
      validateForm(values.form, config.form.validators(values)),
      validateCompositeFieldArray(values.fieldArray, config.fieldArray.validators(values)),
    ]).then(([formResult, fieldArrayResult]) => {
      if (isSuccess(formResult) && isSuccess(fieldArrayResult)) {
        const submit = onSubmit instanceof Function ? onSubmit : onSubmit.onSuccess;

        submit({ form: formResult.success, fieldArray: fieldArrayResult.success }).finally(() => {
          toggle("enable");
        });
      } else {
        const errors = {
          form: null as FormErrors<FormValues> | null,
          fieldArray: null as FieldArrayValidationFailure<FieldArrayValues> | null,
        };

        if (isFailure(formResult)) {
          errors.form = formResult.failure;
          form.propagateErrors(formResult.failure);
        }

        if (isFailure(fieldArrayResult)) {
          errors.fieldArray = fieldArrayResult.failure;
          forEach(fieldArrayResult.failure, (errors, key) => {
            fieldArray[key].propagateErrors(errors ?? []);
          });
        }

        toggle("enable");

        if ("onFailure" in onSubmit) {
          onSubmit.onFailure(errors);
        }
      }
    });
  };

  return {
    fieldArray: compositeFieldArray,
    form: {
      errors: form.errors,
      fieldProps,
      handleReset: form.reset,
      setErrors: form.setErrors,
      setValues: form.setValues,
      values: form.values,
    },
    handleReset,
    handleSubmit,
    isSubmitting,
  };
}

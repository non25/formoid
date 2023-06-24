import { useRef, useState } from "react";
import {
  FormErrors,
  ValidatedValues,
  ValidationSchema,
  ValidationStrategy,
  makeFieldGroups,
  makeFieldProps,
  validateFieldArray,
  validateForm,
} from "./Form";
import { entries, mapValues, some } from "./Record";
import { Result, extract, failure, isFailure, isSuccess, success } from "./Result";
import { UseFieldArrayReturn } from "./useFieldArray";
import { useFieldArrayState } from "./useFieldArrayState";
import { UseFormReturn } from "./useForm";
import { useFormState } from "./useFormState";

type FormValuesConstraint = Record<string, unknown>;

type FieldArrayValuesConstraint = Record<string, Array<unknown>>;

type RedundantFields = "handleSubmit" | "isSubmitting";

type CompoundValues<FormValues, FieldArrayValues> = {
  form: FormValues;
  fieldArray: FieldArrayValues;
};

type FieldArrayValidationSchema<FieldArrayValues extends FieldArrayValuesConstraint> = {
  [K in keyof FieldArrayValues]: ValidationSchema<FieldArrayValues[K][number]>;
};

type Config<
  FormValues extends FormValuesConstraint,
  FormSchema extends ValidationSchema<FormValues>,
  FieldArrayValues extends FieldArrayValuesConstraint,
  FieldArraySchema extends FieldArrayValidationSchema<FieldArrayValues>,
> = {
  form: {
    initialValues: FormValues;
    validationStrategy: ValidationStrategy;
    validators: (values: CompoundValues<FormValues, FieldArrayValues>) => FormSchema;
  };
  fieldArray: {
    initialValues: FieldArrayValues;
    validationStrategy: ValidationStrategy;
    validators: (values: CompoundValues<FormValues, FieldArrayValues>) => FieldArraySchema;
  };
};

type FieldArrayReturn<FieldArrayValues extends FieldArrayValuesConstraint> = {
  [K in keyof FieldArrayValues]: Omit<
    UseFieldArrayReturn<FieldArrayValues[K][number], never>,
    RedundantFields
  >;
};

type FieldArrayValidatedValues<
  FieldArrayValues extends FieldArrayValuesConstraint,
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
  FormValues extends FormValuesConstraint,
  FormSchema extends ValidationSchema<FormValues>,
  FieldArrayValues extends FieldArrayValuesConstraint,
  FieldArraySchema extends FieldArrayValidationSchema<FieldArrayValues>,
> = {
  (
    values: CompoundValues<
      ValidatedValues<FormValues, FormSchema>,
      FieldArrayValidatedValues<FieldArrayValues, FieldArraySchema>
    >,
  ): Promise<unknown>;
};

type OnSubmitMatch<
  FormValues extends FormValuesConstraint,
  FormSchema extends ValidationSchema<FormValues>,
  FieldArrayValues extends FieldArrayValuesConstraint,
  FieldArraySchema extends FieldArrayValidationSchema<FieldArrayValues>,
> = {
  onFailure: () => unknown;
  onSuccess: OnSubmit<FormValues, FormSchema, FieldArrayValues, FieldArraySchema>;
};

type HandleSubmit<
  FormValues extends FormValuesConstraint,
  FormSchema extends ValidationSchema<FormValues>,
  FieldArrayValues extends FieldArrayValuesConstraint,
  FieldArraySchema extends FieldArrayValidationSchema<FieldArrayValues>,
> = {
  (onSubmit: OnSubmit<FormValues, FormSchema, FieldArrayValues, FieldArraySchema>): void;
  (onSubmit: OnSubmitMatch<FormValues, FormSchema, FieldArrayValues, FieldArraySchema>): void;
};

type Return<
  FormValues extends FormValuesConstraint,
  FormSchema extends ValidationSchema<FormValues>,
  FieldArrayValues extends FieldArrayValuesConstraint,
  FieldArraySchema extends FieldArrayValidationSchema<FieldArrayValues>,
> = {
  fieldArray: FieldArrayReturn<FieldArrayValues>;
  form: Omit<UseFormReturn<FormValues, never>, RedundantFields>;
  handleSubmit: HandleSubmit<FormValues, FormSchema, FieldArrayValues, FieldArraySchema>;
  isSubmitting: boolean;
};

export function useCompoundForm<
  FormValues extends FormValuesConstraint,
  FormSchema extends ValidationSchema<FormValues>,
  FieldArrayValues extends FieldArrayValuesConstraint,
  FieldArraySchema extends FieldArrayValidationSchema<FieldArrayValues>,
>(
  config: Config<FormValues, FormSchema, FieldArrayValues, FieldArraySchema>,
): Return<FormValues, FormSchema, FieldArrayValues, FieldArraySchema> {
  const ref = useRef(config);
  const { form: formConfig, fieldArray: fieldArrayConfig } = ref.current;

  type CompoundFieldArrayState = {
    [K in keyof FieldArrayValues]: ReturnType<
      typeof useFieldArrayState<FieldArrayValues[K][number]>
    >;
  };

  const form = useFormState(formConfig.initialValues);

  const fieldArray = mapValues(
    fieldArrayConfig.initialValues,
    useFieldArrayState,
  ) satisfies CompoundFieldArrayState;

  const values: CompoundValues<FormValues, FieldArrayValues> = {
    form: form.values,
    fieldArray: mapValues(fieldArray, ({ values }) => values) as FieldArrayValues,
  };

  const fieldProps = makeFieldProps({
    form,
    schema: formConfig.validators(values),
    validationStrategy: formConfig.validationStrategy,
  });

  const compoundFieldArray = mapValues(fieldArray, (state, key) => ({
    append: state.append,
    errors: state.errors,
    groups: makeFieldGroups({
      fieldArray: state,
      schema: fieldArrayConfig.validators(values)[key],
      validationStrategy: fieldArrayConfig.validationStrategy,
    }),
    handleReset: state.reset,
    remove: state.remove,
    setErrors: state.setErrors,
    setValues: state.setValues,
    values: state.values,
  })) satisfies FieldArrayReturn<FieldArrayValues>;

  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggle(action: "enable" | "disable") {
    setIsSubmitting(action === "disable");
    form.toggle(action);

    for (const key in fieldArray) {
      fieldArray[key].toggle(action);
    }
  }

  const handleSubmit: HandleSubmit<FormValues, FormSchema, FieldArrayValues, FieldArraySchema> = (
    onSubmit,
  ) => {
    toggle("disable");
    Promise.all([
      validateForm(values.form, formConfig.validators(values)),
      validateCompoundFieldArray(values.fieldArray, fieldArrayConfig.validators(values)),
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
          for (const key in fieldArrayResult.failure) {
            fieldArray[key].propagateErrors(fieldArrayResult.failure[key] ?? []);
          }
        }

        toggle("enable");

        if (onSubmit instanceof Function) return;

        onSubmit.onFailure();
      }
    });
  };

  return {
    fieldArray: compoundFieldArray,
    form: {
      errors: form.errors,
      fieldProps,
      handleReset: form.reset,
      setErrors: form.setErrors,
      setValues: form.setValues,
      values: form.values,
    },
    handleSubmit,
    isSubmitting,
  };
}

/* Compound field array validation */
type FieldArrayValidationFailure<FieldArrayValues extends FieldArrayValuesConstraint> = {
  [K in keyof FieldArrayValues]: Array<FormErrors<FieldArrayValues[K][number]> | null> | null;
};

type CompoundFieldArrayValidationResult<
  FieldArrayValues extends FieldArrayValuesConstraint,
  FieldArraySchema extends FieldArrayValidationSchema<FieldArrayValues>,
> = Result<
  FieldArrayValidationFailure<FieldArrayValues>,
  FieldArrayValidatedValues<FieldArrayValues, FieldArraySchema>
>;

export async function validateCompoundFieldArray<
  FieldArrayValues extends FieldArrayValuesConstraint,
  FieldArraySchema extends FieldArrayValidationSchema<FieldArrayValues>,
>(
  values: FieldArrayValues,
  schema: FieldArraySchema,
): Promise<CompoundFieldArrayValidationResult<FieldArrayValues, FieldArraySchema>> {
  return Promise.all(
    entries(values).map(([key, values]) => {
      return validateFieldArray(values, schema[key]).then((result) => [key, result] as const);
    }),
  )
    .then((result) => Object.fromEntries(result))
    .then((result) => {
      const hasErrors = some(result, isFailure);

      if (hasErrors) {
        const errors = mapValues(result, (value) => (isFailure(value) ? value.failure : null));

        return failure(errors as FieldArrayValidationFailure<FieldArrayValues>);
      }

      return success(
        mapValues(result, extract) as FieldArrayValidatedValues<FieldArrayValues, FieldArraySchema>,
      );
    });
}

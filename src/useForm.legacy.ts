import { useCallback, useMemo, useState } from "react";
import {
  FieldGroup,
  FieldProps,
  FormErrors,
  SetErrors,
  SetFieldArrayErrors,
  Update,
  ValidatedValues,
  ValidationSchema,
  ValidationStrategy,
  initializeForm,
  validateFieldArray,
  validateForm,
} from "./Form";
import { mapValues } from "./Record";
import { isFailure, isSuccess } from "./Result";
import { useFieldArrayState } from "./useFieldArrayState";
import { useFormState } from "./useFormState";
import { Validator } from "./validator";

type UseFormConfig<Values, Schema extends ValidationSchema<Values>> = {
  initialValues: Values;
  validationStrategy: ValidationStrategy;
  validators: (values: Values) => Schema;
};

type UseFormConfigExtended<
  Values,
  Schema extends ValidationSchema<Values>,
  FieldArrayValues,
  FieldArraySchema extends ValidationSchema<FieldArrayValues>,
> = {
  form: {
    initialValues: Values;
    validators: (formValues: Values, fieldArrayValues: Array<FieldArrayValues>) => Schema;
  };
  fieldArray: {
    defaultValues: FieldArrayValues;
    initialValues: Array<FieldArrayValues>;
    validators: (fieldArrayValues: Array<FieldArrayValues>, formValues: Values) => FieldArraySchema;
  };
  validationStrategy: ValidationStrategy;
};

function isExtendedConfig<
  Values,
  Schema extends ValidationSchema<Values>,
  FieldArrayValues,
  FieldArraySchema extends ValidationSchema<FieldArrayValues>,
>(
  config:
    | UseFormConfig<Values, Schema>
    | UseFormConfigExtended<Values, Schema, FieldArrayValues, FieldArraySchema>,
): config is UseFormConfigExtended<Values, Schema, FieldArrayValues, FieldArraySchema> {
  return "fieldArray" in config;
}

type OnSubmit<Values, Schema extends ValidationSchema<Values>> = {
  (data: ValidatedValues<Values, Schema>): Promise<unknown>;
};

type OnSubmitMatch<Values, Schema extends ValidationSchema<Values>> = {
  onSuccess: OnSubmit<Values, Schema>;
  onFailure: () => unknown;
};

type HandleSubmit<Values, Schema extends ValidationSchema<Values>> = {
  (onSubmit: OnSubmit<Values, Schema>): void;
  (onSubmit: OnSubmitMatch<Values, Schema>): void;
};

type UseFormReturn<Values, Schema extends ValidationSchema<Values>> = {
  errors: FormErrors<Values>;
  fieldProps: <K extends keyof Values>(key: K) => FieldProps<Values[K]>;
  handleReset: (update?: Update<Values>) => void;
  handleSubmit: HandleSubmit<Values, Schema>;
  isSubmitting: boolean;
  setErrors: SetErrors<Values>;
  setValues: (update: Update<Values>) => void;
  values: Values;
};

type OnSubmitExtended<
  Values,
  Schema extends ValidationSchema<Values>,
  FieldArrayValues,
  FieldArraySchema extends ValidationSchema<FieldArrayValues>,
> = (
  formValues: ValidatedValues<Values, Schema>,
  fieldArrayValues: Array<ValidatedValues<FieldArrayValues, FieldArraySchema>>,
) => Promise<unknown>;

type OnSubmitExtendedMatch<
  Values,
  Schema extends ValidationSchema<Values>,
  FieldArrayValues,
  FieldArraySchema extends ValidationSchema<FieldArrayValues>,
> = {
  onSuccess: OnSubmitExtended<Values, Schema, FieldArrayValues, FieldArraySchema>;
  onFailure: () => unknown;
};

type HandleSubmitExtended<
  Values,
  Schema extends ValidationSchema<Values>,
  FieldArrayValues,
  FieldArraySchema extends ValidationSchema<FieldArrayValues>,
> = {
  (onSubmit: OnSubmitExtended<Values, Schema, FieldArrayValues, FieldArraySchema>): void;
  (onSubmit: OnSubmitExtendedMatch<Values, Schema, FieldArrayValues, FieldArraySchema>): void;
};

type UpdateExtended<Values, FieldArrayValues> = Partial<{
  form: Update<Values>;
  fieldArray: Update<Array<FieldArrayValues>>;
}>;

type UseFormReturnExtended<
  Values,
  Schema extends ValidationSchema<Values>,
  FieldArrayValues,
  FieldArraySchema extends ValidationSchema<FieldArrayValues>,
> = {
  form: Omit<UseFormReturn<Values, Schema>, "handleSubmit" | "handleReset" | "isSubmitting">;
  fieldArray: {
    append: () => void;
    errors: Array<FormErrors<FieldArrayValues>>;
    groups: Array<FieldGroup<FieldArrayValues>>;
    remove: (index: number) => void;
    setErrors: SetFieldArrayErrors<FieldArrayValues>;
    setValues: (index: number, update: Update<FieldArrayValues>) => void;
    values: Array<FieldArrayValues>;
  };
  handleReset: (update?: UpdateExtended<Values, FieldArrayValues>) => void;
  handleSubmit: HandleSubmitExtended<Values, Schema, FieldArrayValues, FieldArraySchema>;
  isSubmitting: boolean;
};

export function useForm<
  Values extends Record<string, unknown>,
  Schema extends ValidationSchema<Values>,
>(config: UseFormConfig<Values, Schema>): UseFormReturn<Values, Schema>;

export function useForm<
  Values extends Record<string, unknown>,
  Schema extends ValidationSchema<Values>,
  FieldArrayValues extends Record<string, unknown>,
  FieldArraySchema extends ValidationSchema<FieldArrayValues>,
>(
  config: UseFormConfigExtended<Values, Schema, FieldArrayValues, FieldArraySchema>,
): UseFormReturnExtended<Values, Schema, FieldArrayValues, FieldArraySchema>;

export function useForm<
  Values extends Record<string, unknown>,
  Schema extends ValidationSchema<Values>,
  FieldArrayValues extends Record<string, unknown>,
  FieldArraySchema extends ValidationSchema<FieldArrayValues>,
>(
  config:
    | UseFormConfig<Values, Schema>
    | UseFormConfigExtended<Values, Schema, FieldArrayValues, FieldArraySchema>,
) {
  const form = useFormState(
    initializeForm(isExtendedConfig(config) ? config.form.initialValues : config.initialValues),
  );

  const fieldArray = useFieldArrayState(
    isExtendedConfig(config)
      ? {
          initialState: config.fieldArray.initialValues.map(initializeForm),
          initialGroupState: initializeForm(config.fieldArray.defaultValues),
        }
      : {
          initialState: [],
          initialGroupState: null,
        },
  );

  const formValidationSchema: Schema = isExtendedConfig(config)
    ? config.form.validators(form.values, fieldArray.values)
    : config.validators(form.values);

  const fieldProps = useCallback(
    function <K extends keyof Values>(key: K): FieldProps<Values[K]> {
      function validate() {
        const validator = formValidationSchema[key] as Validator<Values[K], unknown> | null;

        validator?.(form.state[key].value).then((result) => {
          form.setErrors(key, isFailure(result) ? result.failure : null);
        });
      }

      return {
        ...form.state[key],
        onBlur: () => {
          form.blur(key);

          if (config.validationStrategy === "onBlur") validate();
        },
        onChange: (value: Values[K]) => {
          form.change(key, value);

          if (config.validationStrategy === "onChange") validate();
        },
      };
    },
    [config.validationStrategy, form, formValidationSchema],
  );

  const fieldArrayValidationSchema: FieldArraySchema | null = isExtendedConfig(config)
    ? config.fieldArray.validators(fieldArray.values, form.values)
    : null;

  const fieldGroups: Array<FieldGroup<FieldArrayValues>> = useMemo(() => {
    return fieldArray.state.map((groupState, index) => {
      return mapValues(groupState, (group, key) => {
        function validate() {
          const validator = fieldArrayValidationSchema?.[key] as
            | Validator<FieldArrayValues[typeof key], unknown>
            | null
            | undefined;

          validator?.(group.value).then((result) => {
            fieldArray.setErrors(index, key, isFailure(result) ? result.failure : null);
          });
        }

        return {
          ...group,
          onBlur: () => {
            fieldArray.blur(index, key);

            if (config.validationStrategy === "onBlur") validate();
          },
          onChange: (value: FieldArrayValues[typeof key]) => {
            fieldArray.change(index, key, value);

            if (config.validationStrategy === "onChange") validate();
          },
        };
      }) as unknown as FieldGroup<FieldArrayValues>;
    });
  }, [config.validationStrategy, fieldArray, fieldArrayValidationSchema]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const disableForm = useCallback((): void => {
    setIsSubmitting(true);

    for (const key in form.values) form.disable(key);

    if (!isExtendedConfig(config)) return;

    for (const [index] of fieldArray.values.entries()) {
      for (const key in fieldArray.values[index]) fieldArray.disable(index, key);
    }
  }, [config, fieldArray, form]);

  const enableForm = useCallback((): void => {
    setIsSubmitting(false);

    for (const key in form.values) form.enable(key);

    if (!isExtendedConfig(config)) return;

    for (const [index] of fieldArray.values.entries()) {
      for (const key in fieldArray.values[index]) fieldArray.enable(index, key);
    }
  }, [config, fieldArray, form]);

  function handleSubmit(onSubmit: OnSubmit<Values, Schema>): void;

  function handleSubmit(onSubmit: OnSubmitMatch<Values, Schema>): void;

  function handleSubmit(onSubmit: OnSubmit<Values, Schema> | OnSubmitMatch<Values, Schema>): void {
    if (isExtendedConfig(config)) return;

    disableForm();
    validateForm(form.values, config.validators(form.values)).then((result) => {
      if (isFailure(result)) {
        form.propagateErrors(result.failure);

        if (onSubmit instanceof Function) return;

        enableForm();
        onSubmit.onFailure();
      } else {
        const submit = onSubmit instanceof Function ? onSubmit : onSubmit.onSuccess;

        submit(result.success).finally(enableForm);
      }
    });
  }

  function handleSubmitExtended(
    onSubmit: OnSubmitExtended<Values, Schema, FieldArrayValues, FieldArraySchema>,
  ): void;

  function handleSubmitExtended(
    onSubmit: OnSubmitExtendedMatch<Values, Schema, FieldArrayValues, FieldArraySchema>,
  ): void;

  function handleSubmitExtended(
    onSubmit:
      | OnSubmitExtended<Values, Schema, FieldArrayValues, FieldArraySchema>
      | OnSubmitExtendedMatch<Values, Schema, FieldArrayValues, FieldArraySchema>,
  ): void {
    if (!isExtendedConfig(config)) return;

    const formValidationResult = validateForm(
      form.values,
      config.form.validators(form.values, fieldArray.values),
    );
    const fieldArrayValidationResult = validateFieldArray(
      fieldArray.values,
      config.fieldArray.validators(fieldArray.values, form.values),
    );

    disableForm();
    Promise.all([formValidationResult, fieldArrayValidationResult]).then(
      ([formValidationResult, fieldArrayValidationResult]) => {
        if (isSuccess(formValidationResult) && isSuccess(fieldArrayValidationResult)) {
          const submit = onSubmit instanceof Function ? onSubmit : onSubmit.onSuccess;

          submit(formValidationResult.success, fieldArrayValidationResult.success).finally(
            enableForm,
          );
        } else {
          if (isFailure(formValidationResult)) {
            form.propagateErrors(formValidationResult.failure);
          }

          if (isFailure(fieldArrayValidationResult)) {
            fieldArray.propagateErrors(fieldArrayValidationResult.failure);
          }

          enableForm();

          if (onSubmit instanceof Function) return;

          onSubmit.onFailure();
        }
      },
    );
  }

  const handleResetExtended = useCallback(
    (update?: Partial<{ form: Update<Values>; fieldArray: Update<Array<FieldArrayValues>> }>) => {
      form.reset(update?.form);
      fieldArray.reset(update?.fieldArray);
    },
    [fieldArray, form],
  );

  if (isExtendedConfig(config)) {
    return {
      form: {
        errors: form.errors,
        fieldProps,
        setErrors: form.setErrors,
        setValues: form.setValues,
        values: form.values,
      },
      fieldArray: {
        append: fieldArray.append,
        errors: fieldArray.errors,
        groups: fieldGroups,
        remove: fieldArray.remove,
        setErrors: fieldArray.setErrors,
        setValues: fieldArray.setValues,
        values: fieldArray.values,
      },
      handleReset: handleResetExtended,
      handleSubmit: handleSubmitExtended,
      isSubmitting,
    };
  }

  return {
    errors: form.errors,
    fieldProps,
    handleReset: form.reset,
    handleSubmit,
    isSubmitting,
    setErrors: form.setErrors,
    setValues: form.setValues,
    values: form.values,
  };
}

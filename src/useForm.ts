import { Reducer, useCallback, useMemo, useReducer, useState } from "react";
import { append, deleteAt, modifyAt, NonEmptyArray } from "./utils/Array";
import {
  FieldGroup,
  FieldProps,
  FieldState,
  FormErrors,
  FormState,
  formStateManager,
  getErrors,
  getValues,
  initializeForm,
  SetErrors,
  updateValues,
} from "./utils/Form";
import { isFailure, isSuccess } from "./utils/Result";
import {
  validate,
  ValidatedValues,
  validateFieldArray,
  ValidationSchema,
} from "./utils/Validation";

type ValidationStrategy = "onChange" | "onBlur" | "onSubmit";

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

type Update<Values> = (values: Values) => Values;

type UseFormReturn<Values, Schema extends ValidationSchema<Values>> = {
  errors: FormErrors<Values>;
  fieldProps: <K extends keyof Values>(key: K) => FieldProps<Values[K]>;
  handleReset: (update?: Update<Values>) => void;
  handleSubmit: (onSubmit: OnSubmit<Values, Schema>) => void;
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

type UpdateExtended<Values, FieldArrayValues> = Update<{
  form: Values;
  fieldArray: Array<FieldArrayValues>;
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
    setErrors: (index: number, key: keyof FieldArrayValues, errors: NonEmptyArray<string>) => void;
    setValues: (index: number, update: Update<FieldArrayValues>) => void;
    values: Array<FieldArrayValues>;
  };
  handleReset: (update?: UpdateExtended<Values, FieldArrayValues>) => void;
  handleSubmit: (
    onSubmit: OnSubmitExtended<Values, Schema, FieldArrayValues, FieldArraySchema>,
  ) => void;
  isSubmitting: boolean;
};

type State<Values, FieldArrayValues> = {
  form: FormState<Values>;
  fieldArray: Array<FormState<FieldArrayValues>>;
};

type Action<Values, FieldArrayValues> =
  | {
      id: "Form.Blur";
      key: keyof Values;
    }
  | {
      id: "Form.Change";
      key: keyof Values;
      value: Values[keyof Values];
    }
  | {
      id: "Form.Disable";
      key: keyof Values;
    }
  | {
      id: "Form.Enable";
      key: keyof Values;
    }
  | {
      id: "Form.Reset";
      update?:
        | { id: "regular"; handler: Update<Values> }
        | { id: "extended"; handler: UpdateExtended<Values, FieldArrayValues> };
    }
  | {
      id: "Form.SetErrors";
      key: keyof Values;
      errors: NonEmptyArray<string> | null;
    }
  | {
      id: "Form.SetValues";
      update: Update<Values>;
    }
  | {
      id: "Form.Validate";
      key: keyof Values;
    }
  | {
      id: "FieldArray.Append";
    }
  | {
      id: "FieldArray.Blur";
      index: number;
      key: keyof FieldArrayValues;
    }
  | {
      id: "FieldArray.Change";
      index: number;
      key: keyof FieldArrayValues;
      value: FieldArrayValues[keyof FieldArrayValues];
    }
  | {
      id: "FieldArray.Disable";
      index: number;
      key: keyof FieldArrayValues;
    }
  | {
      id: "FieldArray.Enable";
      index: number;
      key: keyof FieldArrayValues;
    }
  | {
      id: "FieldArray.SetErrors";
      index: number;
      key: keyof FieldArrayValues;
      errors: NonEmptyArray<string> | null;
    }
  | {
      id: "FieldArray.SetValues";
      index: number;
      update: Update<FieldArrayValues>;
    }
  | {
      id: "FieldArray.Remove";
      index: number;
    }
  | {
      id: "FieldArray.Validate";
      index: number;
      key: keyof FieldArrayValues;
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
  const initialFormState = useMemo(() => {
    return initializeForm(
      isExtendedConfig(config) ? config.form.initialValues : config.initialValues,
    );
  }, [config]);
  const initialFieldGroupState = useMemo(
    () => (isExtendedConfig(config) ? initializeForm(config.fieldArray.defaultValues) : null),
    [config],
  );
  const initialFieldArrayState = useMemo(() => {
    if (isExtendedConfig(config)) {
      return config.fieldArray.initialValues.map(initializeForm);
    }

    return [];
  }, [config]);

  const reducer: Reducer<State<Values, FieldArrayValues>, Action<Values, FieldArrayValues>> = (
    state,
    action,
  ) => {
    const formValues = getValues(state.form);
    const fieldArrayValues = state.fieldArray.map(getValues);

    const formManager = formStateManager(state.form);

    const modifyFieldArray = (
      index: number,
      fn: (a: FormState<FieldArrayValues>) => FormState<FieldArrayValues>,
    ): FormState<FieldArrayValues>[] => {
      return modifyAt(index, fn, state.fieldArray) || state.fieldArray;
    };

    switch (action.id) {
      case "Form.Blur":
        return {
          ...state,
          form: formManager.blur(action.key),
        };

      case "Form.Change":
        return {
          ...state,
          form: formManager.change(action.key, action.value),
        };

      case "Form.Disable":
        return {
          ...state,
          form: formManager.disable(action.key),
        };

      case "Form.Enable":
        return {
          ...state,
          form: formManager.enable(action.key),
        };

      case "Form.SetErrors":
        return {
          ...state,
          form: formManager.setErrors(action.key, action.errors),
        };

      case "Form.SetValues":
        return {
          ...state,
          form: updateValues(state.form, action.update(formValues)),
        };

      case "Form.Validate": {
        const getSchema = () => {
          if (isExtendedConfig(config)) {
            return config.form.validators(formValues, fieldArrayValues);
          }

          return config.validators(formValues);
        };

        return {
          ...state,
          form: formManager.validate(action.key, getSchema()),
        };
      }

      case "Form.Reset":
        if (action.update) {
          switch (action.update.id) {
            case "regular":
              return {
                ...state,
                form: action.update
                  ? initializeForm(action.update.handler(formValues))
                  : initialFormState,
              };

            case "extended": {
              const { form, fieldArray } = action.update.handler({
                form: formValues,
                fieldArray: fieldArrayValues,
              });

              return {
                form: initializeForm(form),
                fieldArray: fieldArray.map(initializeForm),
              };
            }
          }
        }

        return state;

      case "FieldArray.Append":
        if (initialFieldGroupState) {
          return {
            ...state,
            fieldArray: append(initialFieldGroupState, state.fieldArray),
          };
        }

        return state;

      case "FieldArray.Blur":
        return {
          ...state,
          fieldArray: modifyFieldArray(action.index, (group) =>
            formStateManager(group).blur(action.key),
          ),
        };

      case "FieldArray.Change":
        return {
          ...state,
          fieldArray: modifyFieldArray(action.index, (group) =>
            formStateManager(group).change(action.key, action.value),
          ),
        };

      case "FieldArray.Disable":
        return {
          ...state,
          fieldArray: modifyFieldArray(action.index, (group) =>
            formStateManager(group).disable(action.key),
          ),
        };

      case "FieldArray.Enable":
        return {
          ...state,
          fieldArray: modifyFieldArray(action.index, (group) =>
            formStateManager(group).enable(action.key),
          ),
        };

      case "FieldArray.SetErrors":
        return {
          ...state,
          fieldArray: modifyFieldArray(action.index, (group) =>
            formStateManager(group).setErrors(action.key, action.errors),
          ),
        };

      case "FieldArray.SetValues":
        return {
          ...state,
          fieldArray: modifyFieldArray(action.index, (group) =>
            updateValues(group, action.update(getValues(group))),
          ),
        };

      case "FieldArray.Remove": {
        const updatedFieldArray = deleteAt(action.index, state.fieldArray);

        if (updatedFieldArray) {
          return {
            ...state,
            fieldArray: updatedFieldArray,
          };
        }

        return state;
      }

      case "FieldArray.Validate":
        if (isExtendedConfig(config)) {
          const schema = config.fieldArray.validators(fieldArrayValues, formValues);

          return {
            ...state,
            fieldArray: modifyFieldArray(action.index, (group) =>
              formStateManager(group).validate(action.key, schema),
            ),
          };
        }

        return state;
    }
  };

  const [state, dispatch] = useReducer(reducer, {
    form: initialFormState,
    fieldArray: initialFieldArrayState,
  });

  const formValues = useMemo(() => getValues(state.form), [state.form]);

  const formErrors = useMemo(() => getErrors(state.form), [state.form]);

  const fieldArrayValues = useMemo(() => state.fieldArray.map(getValues), [state.fieldArray]);

  const fieldArrayErrors = useMemo(() => state.fieldArray.map(getErrors), [state.fieldArray]);

  const fieldProps = useCallback(
    <K extends keyof Values>(key: K): FieldProps<Values[K]> => ({
      ...state.form[key],
      onChange: (value: Values[K]) => {
        dispatch({ id: "Form.Change", key, value });

        if (config.validationStrategy === "onChange") {
          dispatch({ id: "Form.Validate", key });
        }
      },
      onBlur: () => {
        dispatch({ id: "Form.Blur", key });

        if (config.validationStrategy === "onBlur") {
          dispatch({ id: "Form.Validate", key });
        }
      },
    }),
    [config.validationStrategy, state.form],
  );

  const fieldStateToProps = useCallback(
    <K extends keyof FieldArrayValues>(
      index: number,
      fieldState: FieldState<FieldArrayValues[K]>,
      key: K,
    ): FieldProps<FieldArrayValues[K]> => ({
      ...fieldState,
      onBlur: () => {
        dispatch({ id: "FieldArray.Blur", index, key });

        if (config.validationStrategy === "onBlur") {
          dispatch({ id: "FieldArray.Validate", index, key });
        }
      },
      onChange: (value) => {
        dispatch({ id: "FieldArray.Change", index, key, value });

        if (config.validationStrategy === "onChange") {
          dispatch({ id: "FieldArray.Validate", index, key });
        }
      },
    }),
    [config.validationStrategy],
  );

  const makeFieldGroup = useCallback(
    (groupState: FormState<FieldArrayValues>, index: number): FieldGroup<FieldArrayValues> => {
      const fieldGroup = {} as FieldGroup<FieldArrayValues>;

      for (const key in groupState) {
        fieldGroup[key] = fieldStateToProps(index, groupState[key], key);
      }

      return fieldGroup;
    },
    [fieldStateToProps],
  );

  const fieldGroups = useMemo(
    () => state.fieldArray.map(makeFieldGroup),
    [makeFieldGroup, state.fieldArray],
  );

  const appendFieldGroup = useCallback((): void => dispatch({ id: "FieldArray.Append" }), []);

  const removeFieldGroup = useCallback((index: number): void => {
    dispatch({ id: "FieldArray.Remove", index });
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const disableForm = useCallback((): void => {
    setIsSubmitting(true);

    for (const key in formValues) {
      dispatch({ id: "Form.Disable", key });
    }

    if (isExtendedConfig(config)) {
      for (const [index] of fieldArrayValues.entries()) {
        for (const key in fieldArrayValues[index]) {
          dispatch({ id: "FieldArray.Disable", index, key });
        }
      }
    }
  }, [config, fieldArrayValues, formValues]);

  const enableForm = useCallback((): void => {
    setIsSubmitting(false);

    for (const key in formValues) {
      dispatch({ id: "Form.Enable", key });
    }

    if (isExtendedConfig(config)) {
      for (const [index] of fieldArrayValues.entries()) {
        for (const key in fieldArrayValues[index]) {
          dispatch({ id: "FieldArray.Enable", index, key });
        }
      }
    }
  }, [config, fieldArrayValues, formValues]);

  const setErrors = useCallback((key: keyof Values, errors: NonEmptyArray<string>): void => {
    dispatch({ id: "Form.SetErrors", key, errors });
  }, []);

  const setValues = useCallback((update: (values: Values) => Values): void => {
    dispatch({ id: "Form.SetValues", update });
  }, []);

  const propagateFormErrors = useCallback((formErrors: FormErrors<Values>): void => {
    for (const key in formErrors) {
      dispatch({ id: "Form.SetErrors", key, errors: formErrors[key] });
    }
  }, []);

  const setFieldArrayErrors = useCallback(
    (index: number, key: keyof FieldArrayValues, errors: NonEmptyArray<string>): void => {
      dispatch({ id: "FieldArray.SetErrors", index, key, errors });
    },
    [],
  );

  const setFieldArrayValues = useCallback(
    (index: number, update: (values: FieldArrayValues) => FieldArrayValues) => {
      dispatch({ id: "FieldArray.SetValues", index, update });
    },
    [],
  );

  const propagateFieldArrayErrors = useCallback(
    (fieldArrayErrors: Array<FormErrors<FieldArrayValues> | null>): void => {
      for (const [index, groupErrors] of fieldArrayErrors.entries()) {
        if (groupErrors) {
          for (const key in groupErrors) {
            dispatch({ id: "FieldArray.SetErrors", index, key, errors: groupErrors[key] });
          }
        } else {
          for (const key in fieldArrayValues[index]) {
            dispatch({ id: "FieldArray.SetErrors", index, key, errors: null });
          }
        }
      }
    },
    [fieldArrayValues],
  );

  const handleSubmit = useCallback(
    (onSubmit: OnSubmit<Values, Schema>): void => {
      if (isExtendedConfig(config)) {
        return;
      }

      const formValidationResult = validate(formValues, config.validators(formValues));

      if (isFailure(formValidationResult)) {
        propagateFormErrors(formValidationResult.failure);
      } else {
        disableForm();

        onSubmit(formValidationResult.success).finally(enableForm);
      }
    },
    [config, disableForm, enableForm, formValues, propagateFormErrors],
  );

  const handleSubmitExtended = useCallback(
    (onSubmit: OnSubmitExtended<Values, Schema, FieldArrayValues, FieldArraySchema>): void => {
      if (isExtendedConfig(config)) {
        const formValidationResult = validate(
          formValues,
          config.form.validators(formValues, fieldArrayValues),
        );
        const fieldArrayValidationResult = validateFieldArray(
          fieldArrayValues,
          config.fieldArray.validators(fieldArrayValues, formValues),
        );

        if (isFailure(formValidationResult)) {
          propagateFormErrors(formValidationResult.failure);
        }

        if (isFailure(fieldArrayValidationResult)) {
          propagateFieldArrayErrors(fieldArrayValidationResult.failure);
        }

        if (isSuccess(formValidationResult) && isSuccess(fieldArrayValidationResult)) {
          disableForm();

          onSubmit(formValidationResult.success, fieldArrayValidationResult.success).finally(
            enableForm,
          );
        }
      }
    },
    [
      config,
      disableForm,
      enableForm,
      fieldArrayValues,
      formValues,
      propagateFieldArrayErrors,
      propagateFormErrors,
    ],
  );

  const handleReset = useCallback((update?: Update<Values>): void => {
    dispatch({
      id: "Form.Reset",
      update: update ? { id: "regular", handler: update } : undefined,
    });
  }, []);

  const handleResetExtended = useCallback((update?: UpdateExtended<Values, FieldArrayValues>) => {
    dispatch({
      id: "Form.Reset",
      update: update ? { id: "extended", handler: update } : undefined,
    });
  }, []);

  if (isExtendedConfig(config)) {
    return {
      form: {
        errors: formErrors,
        fieldProps,
        setErrors,
        setValues,
        values: formValues,
      },
      fieldArray: {
        append: appendFieldGroup,
        errors: fieldArrayErrors,
        groups: fieldGroups,
        remove: removeFieldGroup,
        setErrors: setFieldArrayErrors,
        setValues: setFieldArrayValues,
        values: fieldArrayValues,
      },
      handleReset: handleResetExtended,
      handleSubmit: handleSubmitExtended,
      isSubmitting,
    };
  }

  return {
    errors: formErrors,
    fieldProps,
    handleReset,
    handleSubmit,
    isSubmitting,
    setErrors,
    setValues,
    values: formValues,
  };
}

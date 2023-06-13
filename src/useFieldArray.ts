import { useState } from "react";
import {
  FieldGroup,
  FormErrors,
  HandleSubmit,
  SetFieldArrayErrors,
  Update,
  ValidationSchema,
  ValidationStrategy,
  initializeForm,
  makeFieldGroups,
  validateFieldArray,
} from "./Form";
import { isFailure } from "./Result";
import { useFieldArrayState } from "./useFieldArrayState";

export type UseFieldArrayConfig<T, S extends ValidationSchema<T>> = {
  initialValues: Array<T>;
  validationStrategy: ValidationStrategy;
  validators: (values: Array<T>) => S;
};

export type UseFieldArrayReturn<T, S extends ValidationSchema<T>> = {
  append: (values: T) => void;
  errors: Array<FormErrors<T>>;
  groups: Array<FieldGroup<T>>;
  handleReset: (update?: Update<Array<T>>) => void;
  handleSubmit: HandleSubmit<"FieldArray", T, S>;
  isSubmitting: boolean;
  remove: (index: number) => void;
  setErrors: SetFieldArrayErrors<T>;
  setValues: (index: number, update: Update<T>) => void;
  values: Array<T>;
};

export function useFieldArray<T extends Record<string, unknown>, S extends ValidationSchema<T>>({
  initialValues,
  validationStrategy,
  validators,
}: UseFieldArrayConfig<T, S>): UseFieldArrayReturn<T, S> {
  const fieldArray = useFieldArrayState(initialValues.map(initializeForm));

  const fieldGroups = makeFieldGroups({
    fieldArray,
    schema: validators(fieldArray.values),
    validationStrategy,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggle(action: "enable" | "disable") {
    setIsSubmitting(action === "disable");
    fieldArray.toggle(action);
  }

  const handleSubmit: HandleSubmit<"FieldArray", T, S> = (onSubmit) => {
    toggle("disable");
    validateFieldArray(fieldArray.values, validators(fieldArray.values)).then((result) => {
      if (isFailure(result)) {
        fieldArray.propagateErrors(result.failure);
        toggle("enable");

        if ("onFailure" in onSubmit) {
          onSubmit.onFailure();
        }
      } else {
        const submit = onSubmit instanceof Function ? onSubmit : onSubmit.onSuccess;

        submit(result.success).finally(() => toggle("enable"));
      }
    });
  };

  return {
    append: fieldArray.append,
    errors: fieldArray.errors,
    groups: fieldGroups,
    handleReset: fieldArray.reset,
    handleSubmit,
    isSubmitting,
    remove: fieldArray.remove,
    setErrors: fieldArray.setErrors,
    setValues: fieldArray.setValues,
    values: fieldArray.values,
  };
}

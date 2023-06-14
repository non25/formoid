import { useState } from "react";
import {
  FieldProps,
  FormErrors,
  HandleSubmit,
  SetErrors,
  Update,
  ValidationSchema,
  ValidationStrategy,
  makeFieldProps,
  validateForm,
} from "./Form";
import { isFailure } from "./Result";
import { useFormState } from "./useFormState";

export type UseFormConfig<T, S extends ValidationSchema<T>> = {
  initialValues: T;
  validationStrategy: ValidationStrategy;
  validators: (values: T) => S;
};

export type UseFormReturn<T, S extends ValidationSchema<T>> = {
  errors: FormErrors<T>;
  fieldProps: <K extends keyof T>(key: K) => FieldProps<T[K]>;
  handleReset: (update?: Update<T>) => void;
  handleSubmit: HandleSubmit<"Form", T, S>;
  isSubmitting: boolean;
  setErrors: SetErrors<T>;
  setValues: (update: Update<T>) => void;
  values: T;
};

export function useForm<T extends Record<string, unknown>, S extends ValidationSchema<T>>({
  initialValues,
  validationStrategy,
  validators,
}: UseFormConfig<T, S>): UseFormReturn<T, S> {
  const form = useFormState(initialValues);

  const fieldProps = makeFieldProps({ form, schema: validators(form.values), validationStrategy });

  const [isSubmitting, setIsSubmitting] = useState(false);

  function toggle(action: "enable" | "disable") {
    setIsSubmitting(action === "disable");
    form.toggle(action);
  }

  const handleSubmit: HandleSubmit<"Form", T, S> = (onSubmit) => {
    toggle("disable");
    validateForm(form.values, validators(form.values)).then((result) => {
      if (isFailure(result)) {
        form.propagateErrors(result.failure);
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

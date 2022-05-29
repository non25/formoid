import { NonEmptyArray } from "./Array";
import { UnknownRecord } from "./Record";
import { isFailure } from "./Result";
import { ValidationError, ValidationSchema, Validator } from "./Validation";

export type FieldState<T> = {
  disabled: boolean;
  errors: NonEmptyArray<ValidationError> | null;
  touched: boolean;
  value: T;
};

export type FieldProps<T> = FieldState<T> & {
  onBlur: () => void;
  onChange: (value: T) => void;
};

export type FormState<T extends UnknownRecord> = {
  [K in keyof T]: FieldState<T[K]>;
};

export type FieldGroup<T extends UnknownRecord> = {
  [K in keyof T]: FieldProps<T[K]>;
};

export type FormErrors<T extends UnknownRecord> = {
  [K in keyof T]: FieldState<T>["errors"];
};

export type SetErrors<V extends UnknownRecord> = (
  key: keyof V,
  errors: NonEmptyArray<ValidationError>,
) => void;

export function initializeForm<T extends UnknownRecord>(data: T): FormState<T> {
  const result = {} as FormState<T>;

  for (const key in data) {
    result[key] = { disabled: false, errors: null, touched: false, value: data[key] };
  }

  return result;
}

export function getValues<T extends UnknownRecord>(formState: FormState<T>): T {
  const result = {} as T;

  for (const key in formState) {
    result[key] = formState[key].value;
  }

  return result;
}

export function getErrors<T extends UnknownRecord>(formState: FormState<T>): FormErrors<T> {
  const result = {} as FormErrors<T>;

  for (const key in formState) {
    result[key] = formState[key].errors;
  }

  return result;
}

export function formStateManager<T extends UnknownRecord>(state: FormState<T>) {
  return {
    blur: <K extends keyof T>(key: K): FormState<T> => ({
      ...state,
      [key]: { ...state[key], touched: true },
    }),
    change: <K extends keyof T>(key: K, value: T[K]): FormState<T> => ({
      ...state,
      [key]: { ...state[key], value },
    }),
    disable: <K extends keyof T>(key: K): FormState<T> => ({
      ...state,
      [key]: { ...state[key], disabled: true },
    }),
    enable: <K extends keyof T>(key: K): FormState<T> => ({
      ...state,
      [key]: { ...state[key], disabled: false },
    }),
    setErrors: <K extends keyof T>(
      key: K,
      errors: NonEmptyArray<ValidationError> | null,
    ): FormState<T> => ({
      ...state,
      [key]: { ...state[key], errors },
    }),
    validate: <K extends keyof T, S extends ValidationSchema<T>>(
      key: K,
      schema: S,
    ): FormState<T> => {
      const values = getValues(state);
      const validator = schema[key] as Validator<T[keyof T], unknown> | null;

      if (validator) {
        const result = validator(values[key]);

        return {
          ...state,
          [key]: {
            ...state[key],
            errors: isFailure(result) ? result.failure : null,
          },
        };
      }

      return state;
    },
  };
}

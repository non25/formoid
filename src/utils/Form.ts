import { NonEmptyArray } from "./Array";
import { isFailure } from "./Result";
import { ValidationSchema, Validator } from "./Validation";

export type FieldState<T> = {
  disabled: boolean;
  errors: NonEmptyArray<string> | null;
  touched: boolean;
  value: T;
};

export type FieldProps<T> = FieldState<T> & {
  onBlur: () => void;
  onChange: (value: T) => void;
};

export type FormState<T> = {
  [K in keyof T]: FieldState<T[K]>;
};

export type FieldGroup<T> = {
  [K in keyof T]: FieldProps<T[K]>;
};

export type FormErrors<T> = {
  [K in keyof T]: FieldState<T>["errors"];
};

export type SetErrors<T> = (key: keyof T, errors: NonEmptyArray<string>) => void;

export function initializeForm<T>(data: T): FormState<T> {
  const result = {} as FormState<T>;

  for (const key in data) {
    result[key] = { disabled: false, errors: null, touched: false, value: data[key] };
  }

  return result;
}

export function getValues<T>(formState: FormState<T>): T {
  const result = {} as T;

  for (const key in formState) {
    result[key] = formState[key].value;
  }

  return result;
}

export function getErrors<T>(formState: FormState<T>): FormErrors<T> {
  const result = {} as FormErrors<T>;

  for (const key in formState) {
    result[key] = formState[key].errors;
  }

  return result;
}

export function formStateManager<T>(state: FormState<T>) {
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
    setErrors: <K extends keyof T>(key: K, errors: NonEmptyArray<string> | null): FormState<T> => ({
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

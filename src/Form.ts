import { NonEmptyArray } from "./Array";
import { map, some } from "./Record";
import { Result, extract, failure, isFailure, success } from "./Result";
import { useFieldArrayState } from "./useFieldArrayState";
import { useFormState } from "./useFormState";
import { Validator } from "./validator";

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

export type SetErrors<T> = (key: keyof T, errors: NonEmptyArray<string> | null) => void;

export type SetFieldArrayErrors<T> = (
  index: number,
  key: keyof T,
  errors: NonEmptyArray<string> | null,
) => void;

export type Update<Values> = (values: Values) => Values;

export type ValidationStrategy = "onChange" | "onBlur" | "onSubmit";

type OnSubmit<K extends "Form" | "FieldArray", T, S extends ValidationSchema<T>> = K extends "Form"
  ? (data: ValidatedValues<T, S>) => Promise<unknown>
  : (data: Array<ValidatedValues<T, S>>) => Promise<unknown>;

type OnSubmitMatch<K extends "Form" | "FieldArray", T, S extends ValidationSchema<T>> = {
  onSuccess: OnSubmit<K, T, S>;
  onFailure: () => unknown;
};

export type HandleSubmit<K extends "Form" | "FieldArray", T, S extends ValidationSchema<T>> = {
  (onSubmit: OnSubmit<K, T, S>): void;
  (onSubmit: OnSubmitMatch<K, T, S>): void;
};

export function initializeForm<T>(data: T): FormState<T> {
  const result = {} as FormState<T>;

  for (const key in data) {
    result[key] = { disabled: false, errors: null, touched: false, value: data[key] };
  }

  return result;
}

export function getValues<T>(formState: FormState<T>): T {
  const result = {} as T;

  for (const key in formState) result[key] = formState[key].value;

  return result;
}

export function updateValues<T>(formState: FormState<T>, values: T): FormState<T> {
  const result = {} as FormState<T>;

  for (const key in formState) result[key] = Object.assign(formState[key], { value: values[key] });

  return result;
}

export function getErrors<T>(formState: FormState<T>): FormErrors<T> {
  const result = {} as FormErrors<T>;

  for (const key in formState) result[key] = formState[key].errors;

  return result;
}

/* State manager */
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
  };
}

/* FieldProps */
type FieldPropsConfig<T, S extends ValidationSchema<T>> = {
  form: ReturnType<typeof useFormState<T>>;
  schema: S;
  validationStrategy: ValidationStrategy;
};

export function makeFieldProps<T, S extends ValidationSchema<T>>({
  form,
  schema,
  validationStrategy,
}: FieldPropsConfig<T, S>) {
  function validate<K extends keyof T>(key: K) {
    const validator = schema[key] as Validator<T[K], unknown> | null;

    validator?.(form.state[key].value).then((result) => {
      form.setErrors(key, isFailure(result) ? result.failure : null);
    });
  }

  return function fieldProps<K extends keyof T>(key: K): FieldProps<T[K]> {
    return {
      ...form.state[key],
      onBlur: () => {
        form.blur(key);

        if (validationStrategy === "onBlur") {
          validate(key);
        }
      },
      onChange: (value: T[K]) => {
        form.change(key, value);

        if (validationStrategy === "onChange") {
          validate(key);
        }
      },
    };
  };
}

/* FieldGroups */
type FieldGroupsConfig<T, S extends ValidationSchema<T>> = {
  fieldArray: ReturnType<typeof useFieldArrayState<T>>;
  schema: S;
  validationStrategy: ValidationStrategy;
};

export function makeFieldGroups<T, S extends ValidationSchema<T>>({
  fieldArray,
  schema,
  validationStrategy,
}: FieldGroupsConfig<T, S>): Array<FieldGroup<T>> {
  function validate<K extends keyof T>(index: number, key: K) {
    const validator = schema[key] as Validator<T[typeof key], unknown> | null | undefined;

    validator?.(fieldArray.state[index][key].value).then((result) => {
      fieldArray.setErrors(index, key, isFailure(result) ? result.failure : null);
    });
  }

  return fieldArray.state.map((groupState, index) => {
    return map(groupState, (group, key) => {
      return {
        ...group,
        onBlur: () => {
          fieldArray.blur(index, key);

          if (validationStrategy === "onBlur") {
            validate(index, key);
          }
        },
        onChange: (value: T[typeof key]) => {
          fieldArray.change(index, key, value);

          if (validationStrategy === "onChange") {
            validate(index, key);
          }
        },
      };
    }) as unknown as FieldGroup<T>;
  });
}

/* Form validation */
export type ValidationSchema<T> = {
  [K in keyof T]: Validator<T[K], unknown> | null;
};

export type ValidatedValues<T, S extends ValidationSchema<T>> = {
  [K in keyof T]: S[K] extends Validator<T[K], infer O> ? O : T[K];
};

type ValidationResult<T, S extends ValidationSchema<T>> = Result<
  FormErrors<T>,
  ValidatedValues<T, S>
>;

export async function validateForm<T, S extends ValidationSchema<T>>(
  values: T,
  schema: S,
): Promise<ValidationResult<T, S>> {
  const schemaEntries = Object.entries(schema).map(([fieldName, validator]) => {
    return [fieldName, validator ?? ((input: T[keyof T]) => Promise.resolve(success(input)))];
  }) as Array<[keyof T, Validator<T[keyof T], unknown>]>;

  const result = Object.fromEntries(
    await Promise.all(
      schemaEntries.map(async ([key, validator]) => [key, await validator(values[key])] as const),
    ),
  );

  const hasErrors = some(result, isFailure);

  if (hasErrors) {
    return failure(
      map(result, (value) => (isFailure(value) ? value.failure : null)) as FormErrors<T>,
    );
  }

  return success(map(result, extract) as ValidatedValues<T, S>);
}

/* Field array validation */
type FieldArrayValidationResult<T, S extends ValidationSchema<T>> = Result<
  Array<FormErrors<T> | null>,
  Array<ValidatedValues<T, S>>
>;

export async function validateFieldArray<T, S extends ValidationSchema<T>>(
  values: Array<T>,
  schema: S,
): Promise<FieldArrayValidationResult<T, S>> {
  const initial = {
    errors: [] as Array<FormErrors<T> | null>,
    values: [] as Array<ValidatedValues<T, S>>,
  };
  const result = (
    await Promise.all(values.map((groupValues) => validateForm(groupValues, schema)))
  ).reduce((result, groupValidationResult) => {
    if (isFailure(groupValidationResult)) {
      return {
        ...result,
        errors: result.errors.concat(groupValidationResult.failure),
      };
    }

    return {
      errors: result.errors.concat(null),
      values: result.values.concat(groupValidationResult.success),
    };
  }, initial);

  const hasErrors = result.errors.some((groupErrors) => groupErrors !== null);

  return hasErrors ? failure(result.errors) : success(result.values);
}

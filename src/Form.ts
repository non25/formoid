import { NonEmptyArray } from "./Array";
import { UnknownRecord, entries, map, some } from "./Record";
import { Result, extract, failure, isFailure, success } from "./Result";
import { useFieldArrayState } from "./useFieldArrayState";
import { useFormState } from "./useFormState";
import { Validator, of } from "./validator";

export type UnknownFieldArray = Record<string, Array<UnknownRecord>>;

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

export type FormState<T extends UnknownRecord> = {
  [K in keyof T]: FieldState<T[K]>;
};

export type FieldGroup<T extends UnknownRecord> = {
  [K in keyof T]: FieldProps<T[K]>;
};

export type FormErrors<T extends UnknownRecord> = {
  [K in keyof T]: FieldState<T>["errors"];
};

export type SetErrors<T extends UnknownRecord> = {
  (key: keyof T, errors: NonEmptyArray<string> | null): void;
};

export type SetFieldArrayErrors<T extends UnknownRecord> = {
  (index: number, key: keyof T, errors: NonEmptyArray<string> | null): void;
};

export type Update<Values> = (values: Values) => Values;

export type Toggle = (action: "enable" | "disable") => void;

export type ValidationStrategy = "onChange" | "onBlur" | "onSubmit";

type OnSubmit<
  K extends "Form" | "FieldArray",
  T extends UnknownRecord,
  S extends ValidationSchema<T>,
> = {
  (data: K extends "Form" ? ValidatedValues<T, S> : Array<ValidatedValues<T, S>>): Promise<unknown>;
};

type OnSubmitMatch<
  K extends "Form" | "FieldArray",
  T extends UnknownRecord,
  S extends ValidationSchema<T>,
> = {
  onSuccess: OnSubmit<K, T, S>;
  onFailure: () => unknown;
};

export type HandleSubmit<
  K extends "Form" | "FieldArray",
  T extends UnknownRecord,
  S extends ValidationSchema<T>,
> = {
  (onSubmit: OnSubmit<K, T, S>): void;
  (onSubmit: OnSubmitMatch<K, T, S>): void;
};

/* Utils */
function initializeField<T>(value: T): FieldState<T> {
  return { disabled: false, errors: null, touched: false, value };
}

export function initializeForm<T extends UnknownRecord>(values: T): FormState<T> {
  return map(values, initializeField) as FormState<T>;
}

export function getValues<T extends UnknownRecord>(formState: FormState<T>): T {
  return map(formState, ({ value }) => value) as T;
}

export function updateValues<T extends UnknownRecord>(
  formState: FormState<T>,
  values: T,
): FormState<T> {
  return map(formState, (s, k) => Object.assign(s, { value: values[k] })) as FormState<T>;
}

export function getErrors<T extends UnknownRecord>(formState: FormState<T>): FormErrors<T> {
  return map(formState, ({ errors }) => errors);
}

/* State manager */
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
    setErrors: <K extends keyof T>(key: K, errors: NonEmptyArray<string> | null): FormState<T> => ({
      ...state,
      [key]: { ...state[key], errors },
    }),
  };
}

/* FieldProps */
type FieldPropsConfig<T extends UnknownRecord, S extends ValidationSchema<T>> = {
  form: ReturnType<typeof useFormState<T>>;
  schema: S;
  validationStrategy: ValidationStrategy;
};

export function makeFieldProps<T extends UnknownRecord, S extends ValidationSchema<T>>({
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
type FieldGroupsConfig<T extends UnknownRecord, S extends ValidationSchema<T>> = {
  fieldArray: ReturnType<typeof useFieldArrayState<T>>;
  schema: S;
  validationStrategy: ValidationStrategy;
};

export function makeFieldGroups<T extends UnknownRecord, S extends ValidationSchema<T>>({
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

/* Generic record validation */
export function validateRecord<T extends Record<string, Result<unknown, unknown>>, F, S>(
  record: T,
): Result<F, S> {
  return some(record, isFailure)
    ? failure(map(record, (value) => (isFailure(value) ? value.failure : null)) as F)
    : success(map(record, extract) as S);
}

/* Form validation */
export type ValidationSchema<T extends UnknownRecord> = {
  [K in keyof T]: Validator<T[K], unknown> | null;
};

export type ValidatedValues<T extends UnknownRecord, S extends ValidationSchema<T>> = {
  [K in keyof T]: S[K] extends Validator<T[K], infer O> ? O : T[K];
};

type ValidationResult<T extends UnknownRecord, S extends ValidationSchema<T>> = Result<
  FormErrors<T>,
  ValidatedValues<T, S>
>;

export async function validateForm<T extends UnknownRecord, S extends ValidationSchema<T>>(
  values: T,
  schema: S,
): Promise<ValidationResult<T, S>> {
  const validationEntries = entries(schema).map(async ([fieldName, validator]) => {
    const value = values[fieldName as keyof T];
    const fieldValidator = (validator ?? of<T[keyof T]>) as Validator<T[keyof T], unknown>;

    return [fieldName, await fieldValidator(value)] as const;
  });
  const result = Object.fromEntries(await Promise.all(validationEntries));

  return validateRecord<typeof result, FormErrors<T>, ValidatedValues<T, S>>(result);
}

/* Field array validation */
type FieldArrayValidationResult<T extends UnknownRecord, S extends ValidationSchema<T>> = Result<
  Array<FormErrors<T> | null>,
  Array<ValidatedValues<T, S>>
>;

export async function validateFieldArray<T extends UnknownRecord, S extends ValidationSchema<T>>(
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
      result.errors.push(groupValidationResult.failure);
    } else {
      result.errors.push(null);
      result.values.push(groupValidationResult.success);
    }

    return result;
  }, initial);

  const hasErrors = result.errors.some((groupErrors) => groupErrors !== null);

  return hasErrors ? failure(result.errors) : success(result.values);
}

/* Compound field array validation */
type FieldArrayValidationSchema<FieldArrayValues extends UnknownFieldArray> = {
  [K in keyof FieldArrayValues]: ValidationSchema<FieldArrayValues[K][number]>;
};

type FieldArrayValidationFailure<FieldArrayValues extends UnknownFieldArray> = {
  [K in keyof FieldArrayValues]: Array<FormErrors<FieldArrayValues[K][number]> | null> | null;
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

type CompoundFieldArrayValidationResult<
  FieldArrayValues extends UnknownFieldArray,
  FieldArraySchema extends FieldArrayValidationSchema<FieldArrayValues>,
> = Result<
  FieldArrayValidationFailure<FieldArrayValues>,
  FieldArrayValidatedValues<FieldArrayValues, FieldArraySchema>
>;

export async function validateCompoundFieldArray<
  FieldArrayValues extends UnknownFieldArray,
  FieldArraySchema extends FieldArrayValidationSchema<FieldArrayValues>,
>(
  values: FieldArrayValues,
  schema: FieldArraySchema,
): Promise<CompoundFieldArrayValidationResult<FieldArrayValues, FieldArraySchema>> {
  const validationEntries = entries(values).map(([key, values]) =>
    validateFieldArray(values, schema[key]).then((result) => [key, result] as const),
  );
  const result = Object.fromEntries(await Promise.all(validationEntries));

  return validateRecord<
    typeof result,
    FieldArrayValidationFailure<FieldArrayValues>,
    FieldArrayValidatedValues<FieldArrayValues, FieldArraySchema>
  >(result);
}

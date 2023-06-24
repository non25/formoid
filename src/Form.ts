import { NonEmptyArray } from "./Array";
import { entries, map, some } from "./Record";
import { Result, extract, failure, isFailure, success } from "./Result";
import { useFieldArrayState } from "./useFieldArrayState";
import { useFormState } from "./useFormState";
import { Validator } from "./validator";

export type FormValuesConstraint = Record<string, unknown>;

export type FieldArrayValuesConstraint = Record<string, Array<FormValuesConstraint>>;

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

export type SetErrors<T> = {
  (key: keyof T, errors: NonEmptyArray<string> | null): void;
};

export type SetFieldArrayErrors<T> = {
  (index: number, key: keyof T, errors: NonEmptyArray<string> | null): void;
};

export type Update<Values> = (values: Values) => Values;

export type Toggle = (action: "enable" | "disable") => void;

export type ValidationStrategy = "onChange" | "onBlur" | "onSubmit";

type OnSubmit<
  K extends "Form" | "FieldArray",
  T extends FormValuesConstraint,
  S extends ValidationSchema<T>,
> = {
  (data: K extends "Form" ? ValidatedValues<T, S> : Array<ValidatedValues<T, S>>): Promise<unknown>;
};

type OnSubmitMatch<
  K extends "Form" | "FieldArray",
  T extends FormValuesConstraint,
  S extends ValidationSchema<T>,
> = {
  onSuccess: OnSubmit<K, T, S>;
  onFailure: () => unknown;
};

export type HandleSubmit<
  K extends "Form" | "FieldArray",
  T extends FormValuesConstraint,
  S extends ValidationSchema<T>,
> = {
  (onSubmit: OnSubmit<K, T, S>): void;
  (onSubmit: OnSubmitMatch<K, T, S>): void;
};

export function initializeForm<T>(values: T): FormState<T> {
  const result = {} as FormState<T>;

  for (const key in values) {
    result[key] = { disabled: false, errors: null, touched: false, value: values[key] };
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
type FieldPropsConfig<T extends FormValuesConstraint, S extends ValidationSchema<T>> = {
  form: ReturnType<typeof useFormState<T>>;
  schema: S;
  validationStrategy: ValidationStrategy;
};

export function makeFieldProps<T extends FormValuesConstraint, S extends ValidationSchema<T>>({
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
type FieldGroupsConfig<T extends FormValuesConstraint, S extends ValidationSchema<T>> = {
  fieldArray: ReturnType<typeof useFieldArrayState<T>>;
  schema: S;
  validationStrategy: ValidationStrategy;
};

export function makeFieldGroups<T extends FormValuesConstraint, S extends ValidationSchema<T>>({
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
export type ValidationSchema<T extends FormValuesConstraint> = {
  [K in keyof T]: Validator<T[K], unknown> | null;
};

export type ValidatedValues<T extends FormValuesConstraint, S extends ValidationSchema<T>> = {
  [K in keyof T]: S[K] extends Validator<T[K], infer O> ? O : T[K];
};

type ValidationResult<T extends FormValuesConstraint, S extends ValidationSchema<T>> = Result<
  FormErrors<T>,
  ValidatedValues<T, S>
>;

export async function validateForm<T extends FormValuesConstraint, S extends ValidationSchema<T>>(
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
type FieldArrayValidationResult<
  T extends FormValuesConstraint,
  S extends ValidationSchema<T>,
> = Result<Array<FormErrors<T> | null>, Array<ValidatedValues<T, S>>>;

export async function validateFieldArray<
  T extends FormValuesConstraint,
  S extends ValidationSchema<T>,
>(values: Array<T>, schema: S): Promise<FieldArrayValidationResult<T, S>> {
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

/* Compound field array validation */
type FieldArrayValidationSchema<FieldArrayValues extends FieldArrayValuesConstraint> = {
  [K in keyof FieldArrayValues]: ValidationSchema<FieldArrayValues[K][number]>;
};

type FieldArrayValidationFailure<FieldArrayValues extends FieldArrayValuesConstraint> = {
  [K in keyof FieldArrayValues]: Array<FormErrors<FieldArrayValues[K][number]> | null> | null;
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
  const validationEntries = await Promise.all(
    entries(values).map(([key, values]) =>
      validateFieldArray(values, schema[key]).then((result) => [key, result] as const),
    ),
  );
  const result = Object.fromEntries(validationEntries);

  const hasErrors = some(result, isFailure);

  if (hasErrors) {
    return failure(
      map(result, (value) =>
        isFailure(value) ? value.failure : null,
      ) as FieldArrayValidationFailure<FieldArrayValues>,
    );
  }

  return success(
    map(result, extract) as FieldArrayValidatedValues<FieldArrayValues, FieldArraySchema>,
  );
}

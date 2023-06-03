import { append, NonEmptyArray } from "./Array";
import { FormErrors } from "./Form";
import { mapValues, some } from "./Record";
import { failure, isFailure, Result, success, extract } from "./Result";

export type Validator<I, O> = (input: I) => Result<NonEmptyArray<string>, O>;

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

export function validate<T, S extends ValidationSchema<T>>(
  values: T,
  schema: S,
): ValidationResult<T, S> {
  const result = {} as Record<keyof T, ReturnType<Validator<T[keyof T], unknown>>>;

  for (const key in values) {
    result[key] = (schema[key] ?? success)(values[key]);
  }

  const hasErrors = some(result, isFailure);

  if (hasErrors) {
    return failure(mapValues(result, (value) => (isFailure(value) ? value.failure : null)));
  }

  return success(mapValues(result, extract) as ValidatedValues<T, S>);
}

type FieldArrayValidationResult<T, S extends ValidationSchema<T>> = Result<
  Array<FormErrors<T> | null>,
  Array<ValidatedValues<T, S>>
>;

export function validateFieldArray<T, S extends ValidationSchema<T>>(
  values: Array<T>,
  schema: S,
): FieldArrayValidationResult<T, S> {
  const initial = {
    errors: [] as Array<FormErrors<T> | null>,
    values: [] as Array<ValidatedValues<T, S>>,
  };
  const result = values.reduce((result, groupValues) => {
    const groupValidationResult = validate(groupValues, schema);

    if (isFailure(groupValidationResult)) {
      return {
        ...result,
        errors: append(groupValidationResult.failure, result.errors),
      };
    }

    return {
      errors: append(null, result.errors),
      values: append(groupValidationResult.success, result.values),
    };
  }, initial);

  const hasErrors = result.errors.some((groupErrors) => groupErrors !== null);

  return hasErrors ? failure(result.errors) : success(result.values);
}

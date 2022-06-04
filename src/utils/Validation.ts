import { append, NonEmptyArray } from "./Array";
import { FormErrors } from "./Form";
import { some, UnknownRecord } from "./Record";
import { failure, isFailure, Result, success } from "./Result";

export type Validator<I, O> = (input: I) => Result<NonEmptyArray<string>, O>;

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

export function validate<T extends UnknownRecord, S extends ValidationSchema<T>>(
  values: T,
  schema: S,
): ValidationResult<T, S> {
  const errors = {} as FormErrors<T>;

  for (const key in values) {
    const validator = schema[key];

    if (validator) {
      const result = validator(values[key]);
      errors[key] = isFailure(result) ? result.failure : null;
    }
  }

  const hasErrors = some((fieldErrors) => fieldErrors !== null, errors);

  return hasErrors ? failure(errors) : success(values as ValidatedValues<T, S>);
}

type FieldArrayValidationResult<T extends UnknownRecord, S extends ValidationSchema<T>> = Result<
  Array<FormErrors<T> | null>,
  Array<ValidatedValues<T, S>>
>;

export function validateFieldArray<T extends UnknownRecord, S extends ValidationSchema<T>>(
  values: T[],
  schema: S,
): FieldArrayValidationResult<T, S> {
  const initial = {
    errors: [] as Array<FormErrors<T> | null>,
    values: [] as Array<ValidatedValues<T, S>>,
  };
  const result = values
    .map((groupValues) => validate(groupValues, schema))
    .reduce((result, groupValidationResult) => {
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

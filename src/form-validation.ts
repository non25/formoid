import { FormErrors } from "./utils/Form";
import { mapValues, some } from "./utils/Record";
import { Result, extract, failure, isFailure, success } from "./utils/Result";
import { Validator } from "./validator";

/**
 * Form validation
 */
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
      mapValues(result, (value) => (isFailure(value) ? value.failure : null)) as FormErrors<T>,
    );
  }

  return success(mapValues(result, extract) as ValidatedValues<T, S>);
}

/**
 * Field array validation
 */
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

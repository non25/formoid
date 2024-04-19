import { TypeOf, ZodType, input, output } from "zod";
import { NonEmptyArray } from "./Array";
import { map } from "./Record";
import { Validator, failure, success } from "./validator";

export function fromZod<T, S extends ZodType>(zod: S): Validator<T, TypeOf<S>> {
  return function (value) {
    return zod
      .safeParseAsync(value)
      .then((result) =>
        result.success
          ? success(result.data)
          : failure(result.error.errors.map(({ message }) => message) as NonEmptyArray<string>),
      );
  };
}

export type Schema<T extends Record<string, unknown>> = {
  [K in keyof T]: ZodType | null;
};

export type ToValidationSchema<T extends Schema<Record<string, unknown>>> = {
  [K in keyof T]: T[K] extends ZodType ? Validator<input<T[K]>, output<T[K]>> : null;
};

export function fromZodSchema<S extends Schema<Record<string, unknown>>>(schema: S): ToValidationSchema<S> {
  return map(schema, (zod) => (zod === null ? null : fromZod(zod))) as ToValidationSchema<S>;
}

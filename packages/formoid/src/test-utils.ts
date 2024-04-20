/** Importing test utilities is only permitted within test files. */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { ValidationSchema } from "./Form";
import { Validator, chain, fromPredicate, lengthRange, match, parallel, sequence, transform } from "./validator";

export function pipe<A, B>(a: A, ab: (a: A) => B): B;

export function pipe<A, B, C>(a: A, ab: (a: A) => B, bc: (b: B) => C): C;

export function pipe<A, B, C, D>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D): D;

export function pipe<A, B, C, D, E>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D, de: (d: D) => E): E;

export function pipe<A, B, C, D, E, F>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
  ef: (e: E) => F,
): F;

export function pipe<A, B, C, D, E, F>(
  a: A,
  ab?: (a: A) => B,
  bc?: (b: B) => C,
  cd?: (c: C) => D,
  de?: (d: D) => E,
  ef?: (e: E) => F,
) {
  switch (arguments.length) {
    case 1:
      return a;
    case 2:
      return ab!(a);
    case 3:
      return bc!(ab!(a));
    case 4:
      return cd!(bc!(ab!(a)));
    case 5:
      return de!(cd!(bc!(ab!(a))));
    case 6:
      return ef!(de!(cd!(bc!(ab!(a)))));
  }
}

/**
 * NonEmptyString
 */
interface NonEmptyStringBrand {
  readonly NonEmptyString: unique symbol;
}

export type NonEmptyString = string & NonEmptyStringBrand;

export const isNonEmptyString = (s: string): s is NonEmptyString => s !== "";

export function nonEmptyStringValidator(message?: string): Validator<string, NonEmptyString> {
  return fromPredicate(isNonEmptyString, message || "This field is required");
}

export const nonBlankStringValidator: Validator<string, string> = pipe(
  fromPredicate((v: string) => v.trim().length !== 0, "Value should be a non-blank string!"),
  transform((value) => value.trim()),
);

/**
 * LoginForm
 */
export type LoginFormValues = {
  name: string;
  password: string;
  confirmPassword: string;
};

export const loginSchema: (values: LoginFormValues) => ValidationSchema<LoginFormValues> = ({ password }) => ({
  name: pipe(nonBlankStringValidator, chain(lengthRange(4, 64, "User name length must be between 4 and 64 chars!"))),
  password: sequence(
    nonBlankStringValidator,
    parallel(
      lengthRange(8, 64, "Password length must be between 8 and 64 chars!"),
      match(/(?=.*[A-Z])/, "Password must contain at least 1 uppercase letter!"),
      match(/(?=.*[a-z])/, "Password must contain at least 1 lowercase letter!"),
      match(/(?=.*\d)/, "Password must contain at least 1 digit!"),
    ),
  ),
  confirmPassword: {
    validationStrategy: "onChange",
    validator: sequence(
      nonBlankStringValidator,
      fromPredicate((confirm) => confirm === password, "Passwords do not match!"),
    ),
  },
});

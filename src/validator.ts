import { isNonEmpty, NonEmptyArray } from "./utils/Array";
import { Predicate, Refinement } from "./utils/Predicate";
import { failure, fromPredicate as resultFromPredicate, isFailure, success } from "./utils/Result";
import { Validator } from "./utils/Validation";

export function fromPredicate<A, B extends A>(
  predicate: Refinement<A, B>,
  message: string,
): Validator<A, B>;

export function fromPredicate<A>(predicate: Predicate<A>, message: string): Validator<A, A>;

export function fromPredicate<A>(predicate: Predicate<A>, message: string): Validator<A, A> {
  return resultFromPredicate(predicate, () => [message]);
}

/**
 * Sequence
 *
 * Fast-failing validation - returns a `NonEmptyArray<string>` once some
 * validation fails
 */
export function sequence<I, A, O>(a: Validator<I, A>, b: Validator<A, O>): Validator<I, O>;

export function sequence<I, A, B, O>(
  a: Validator<I, A>,
  b: Validator<A, B>,
  c: Validator<B, O>,
): Validator<I, O>;

export function sequence<I, A, B, C, O>(
  a: Validator<I, A>,
  b: Validator<A, B>,
  c: Validator<B, C>,
  d: Validator<C, O>,
): Validator<I, O>;

export function sequence<I, A, B, C, D, O>(
  a: Validator<I, A>,
  b: Validator<A, B>,
  c: Validator<B, C>,
  d: Validator<C, D>,
  e: Validator<D, O>,
): Validator<I, O>;

export function sequence<I, A, B, C, D, E, O>(
  a: Validator<I, A>,
  b: Validator<A, B>,
  c: Validator<B, C>,
  d: Validator<C, D>,
  e: Validator<D, E>,
  f: Validator<E, O>,
): Validator<I, O>;

export function sequence<I>(
  ...validators: NonEmptyArray<Validator<I, unknown>>
): Validator<I, unknown> {
  return (input) => {
    for (const key in validators) {
      const result = validators[key](input);

      if (isFailure(result)) {
        return failure(result.failure);
      }
    }

    return success(input);
  };
}

/**
 * Parallel
 *
 * Applies validators in parallel and collects all validation errors
 */
export function parallel<I, O>(a: Validator<I, O>, b: Validator<I, O>): Validator<I, O>;

export function parallel<I, O>(
  a: Validator<I, O>,
  b: Validator<I, O>,
  c: Validator<I, O>,
): Validator<I, O>;

export function parallel<I, O>(
  a: Validator<I, O>,
  b: Validator<I, O>,
  c: Validator<I, O>,
  d: Validator<I, O>,
): Validator<I, O>;

export function parallel<I, O>(
  a: Validator<I, O>,
  b: Validator<I, O>,
  c: Validator<I, O>,
  d: Validator<I, O>,
  e: Validator<I, O>,
): Validator<I, O>;

export function parallel<I, O>(
  a: Validator<I, O>,
  b: Validator<I, O>,
  c: Validator<I, O>,
  d: Validator<I, O>,
  e: Validator<I, O>,
  f: Validator<I, O>,
): Validator<I, O>;

export function parallel<I, O>(
  ...validators: NonEmptyArray<Validator<I, O>>
): Validator<I, unknown> {
  return (input) => {
    const failures: Array<string> = [];

    for (const key in validators) {
      const result = validators[key](input);

      if (isFailure(result)) {
        failures.push(...result.failure);
      }
    }

    return isNonEmpty(failures) ? failure(failures) : success(input);
  };
}

/**
 * NonNullable
 */
function isNonNullable<A>(value: A | null | undefined): value is NonNullable<A> {
  return value !== null && value !== undefined;
}

export function defined<A>(message: string): Validator<A, NonNullable<A>> {
  return fromPredicate(isNonNullable, message);
}

/**
 * Apply validator if predicate/refinement returns true, otherwise treat value as valid
 *
 * Example:
 * Validate whether value's length is >= 5 only if value is a non-blank string,
 * otherwise treat value as valid
 *
 * const result = validator.validateIf(isNonBlankString, validator.minLength(5));
 */
export function validateIf<A, B extends A, O>(
  refinement: Refinement<A, B>,
  innerValidator: Validator<B, O>,
): Validator<A, A | O>;

export function validateIf<I, O>(
  predicate: Predicate<I>,
  innerValidator: Validator<I, O>,
): Validator<I, I | O>;

export function validateIf<I, O>(predicate: Predicate<I>, innerValidator: Validator<I, O>) {
  return (input: I) => (predicate(input) ? innerValidator(input) : success(null));
}

export function min<T extends number>(min: number, message: string): Validator<T, T> {
  return fromPredicate((value: T) => value >= min, message);
}

export function max<T extends number>(max: number, message: string): Validator<T, T> {
  return fromPredicate((value: T) => value <= max, message);
}

export function range<T extends number>(
  min: number,
  max: number,
  message: string,
): Validator<T, T> {
  return fromPredicate((value: T) => value >= min && value <= max, message);
}

export function minLength<T extends string>(min: number, message: string): Validator<T, T> {
  return fromPredicate((value: T) => value.trim().length >= min, message);
}

export function maxLength<T extends string>(max: number, message: string): Validator<T, T> {
  return fromPredicate((value: T) => value.trim().length <= max, message);
}

export function lengthRange<T extends string>(
  min: number,
  max: number,
  message: string,
): Validator<T, T> {
  return fromPredicate(
    (value: T) => value.trim().length >= min && value.trim().length <= max,
    message,
  );
}

export function match<T extends string>(pattern: RegExp, message: string): Validator<T, T> {
  return fromPredicate((value: T) => pattern.test(value), message);
}

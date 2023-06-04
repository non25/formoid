/* eslint-disable @typescript-eslint/no-non-null-assertion */
/** Importing test utilities is only permitted within test files. */

export function pipe<A, B>(a: A, ab: (a: A) => B): B;

export function pipe<A, B, C>(a: A, ab: (a: A) => B, bc: (b: B) => C): C;

export function pipe<A, B, C, D>(a: A, ab: (a: A) => B, bc: (b: B) => C, cd: (c: C) => D): D;

export function pipe<A, B, C, D, E>(
  a: A,
  ab: (a: A) => B,
  bc: (b: B) => C,
  cd: (c: C) => D,
  de: (d: D) => E,
): E;

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

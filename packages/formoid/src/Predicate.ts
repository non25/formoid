export type Predicate<T> = (value: T) => boolean;

export type Refinement<A, B extends A> = (value: A) => value is B;

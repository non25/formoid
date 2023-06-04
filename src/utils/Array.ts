/**
 * NonEmptyArray
 */
export interface NonEmptyArray<A> extends Array<A> {
  0: A;
}

export function isNonEmpty<A>(as: Array<A>): as is NonEmptyArray<A> {
  return as.length > 0;
}

export function isOutOfBound<A>(index: number, as: Array<A>): boolean {
  return index < 0 || index >= as.length;
}

export function modifyAt<A>(index: number, fn: (a: A) => A, as: Array<A>): Array<A> {
  const result = as.slice();

  if (isOutOfBound(index, result)) return result;

  result.splice(index, 1, fn(result[index]));

  return result;
}

export function deleteAt<A>(index: number, as: Array<A>): Array<A> {
  const result = as.slice();

  if (isOutOfBound(index, as)) return result;

  result.splice(index, 1);

  return result;
}

/**
 * NonEmptyArray
 */
export interface NonEmptyArray<T> extends Array<T> {
  0: T;
}

export const of = <T>(value: T): NonEmptyArray<T> => [value];

export function isNonEmpty<T>(as: Array<T>): as is NonEmptyArray<T> {
  return as.length > 0;
}

export function isOutOfBound<T>(index: number, as: Array<T>): boolean {
  return index < 0 || index >= as.length;
}

export function modifyAt<T>(index: number, fn: (a: T) => T): (as: Array<T>) => Array<T> {
  return function (as: Array<T>) {
    const result = as.slice();

    if (isOutOfBound(index, result)) return result;

    result.splice(index, 1, fn(result[index]));

    return result;
  };
}

export function deleteAt<T>(index: number): (as: Array<T>) => Array<T> {
  return function (as: Array<T>) {
    const result = as.slice();

    if (isOutOfBound(index, as)) return result;

    result.splice(index, 1);

    return result;
  };
}

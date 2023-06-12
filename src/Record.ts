import { Predicate } from "./Predicate";

export function some<T extends Record<string, unknown>>(
  record: T,
  predicate: Predicate<T[keyof T]>,
) {
  for (const key in record) if (predicate(record[key])) return true;

  return false;
}

export function mapValues<T extends Record<string, unknown>, B>(
  record: T,
  f: (a: T[keyof T], key: keyof T) => B,
): Record<keyof T, B> {
  const result = {} as Record<keyof T, B>;

  for (const key in record) result[key] = f(record[key], key);

  return result;
}

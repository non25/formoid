import { Predicate } from "./Predicate";

export function some<T extends Record<string, unknown>>(
  predicate: Predicate<T[keyof T]>,
  record: T,
) {
  for (const key in record) {
    if (predicate(record[key])) {
      return true;
    }
  }

  return false;
}

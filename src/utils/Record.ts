import { Predicate } from "./Predicate";

export type UnknownRecord = Record<string, unknown>;

export function some<T extends UnknownRecord>(predicate: Predicate<T[keyof T]>, record: T) {
  for (const key in record) {
    if (predicate(record[key])) {
      return true;
    }
  }

  return false;
}

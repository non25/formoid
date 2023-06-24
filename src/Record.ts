import { Predicate } from "./Predicate";

type UnknownRecord = Record<string, unknown>;

export function some<T extends UnknownRecord>(record: T, predicate: Predicate<T[keyof T]>) {
  for (const key in record) if (predicate(record[key])) return true;

  return false;
}

export function map<T extends UnknownRecord, B>(
  record: T,
  f: (a: T[keyof T], key: keyof T) => B,
): Record<keyof T, B> {
  const result = {} as Record<keyof T, B>;

  for (const key in record) result[key] = f(record[key], key);

  return result;
}

export function entries<T extends UnknownRecord>(record: T) {
  return Object.entries(record) as Array<[key: keyof T, value: T[keyof T]]>;
}

export function forEach<T extends UnknownRecord>(
  record: T,
  f: (a: T[keyof T], key: keyof T) => void,
) {
  Object.entries(record).forEach(([key, value]) => f(value as T[keyof T], key));
}

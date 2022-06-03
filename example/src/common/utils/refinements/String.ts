/**
 * NonEmptyString
 */
interface NonEmptyStringBrand {
  readonly NonEmptyString: unique symbol;
}

export type NonEmptyString = string & NonEmptyStringBrand;

export const isNonEmptyString = (s: string): s is NonEmptyString => s !== "";

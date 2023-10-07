/**
 * NonEmptyString
 */
interface NonEmptyStringBrand {
  readonly NonEmptyString: unique symbol;
}

export type NonEmptyString = string & NonEmptyStringBrand;

export const isNonEmptyString = (s: string): s is NonEmptyString => s !== "";

/**
 * NonBlankString
 */
interface NonBlankStringBrand {
  readonly NonBlankString: unique symbol;
}

export type NonBlankString = string & NonBlankStringBrand;

export const isNonBlankString = (s: string): s is NonBlankString => isNonEmptyString(s.trim());

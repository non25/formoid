import { Validator, validator } from "formoid";
import { isNonEmptyString, NonEmptyString } from "./refinements";

export function nonEmptyString(message?: string): Validator<string, NonEmptyString> {
  return validator.fromPredicate(isNonEmptyString, message || "This field is required");
}

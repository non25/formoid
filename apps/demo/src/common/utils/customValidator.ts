import { validator } from "formoid";
import { NonBlankString, NonEmptyString, isNonBlankString, isNonEmptyString } from "./refinements";
import { pipe } from "./pipe";

export function nonEmptyString(message?: string): validator.Validator<string, NonEmptyString> {
  return validator.fromPredicate(isNonEmptyString, message ?? "This field is required");
}

export function nonBlankString(message?: string): validator.Validator<string, NonBlankString> {
  return pipe(
    validator.fromPredicate(isNonBlankString, message ?? "This field should not be blank"),
    validator.transform((value) => value.trim() as NonBlankString),
  );
}

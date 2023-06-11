import { nonEmptyStringValidator, pipe } from "./test-utils";
import { failure, success } from "./utils/Result";
import {
  chain,
  defined,
  lengthRange,
  match,
  maxLength,
  minLength,
  parallel,
  sequence,
  transform,
} from "./validator";

describe("validator", () => {
  describe("chain & sequence", () => {
    const chainValidator = pipe(
      defined<string | null>("Value should be defined!"),
      chain(nonEmptyStringValidator("Value should not be empty!")),
      chain(minLength(8, "Value should be >= 8 chars long!")),
      chain(maxLength(16, "Value should be <= 16 chars long!")),
    );

    const sequenceValidator = sequence(
      defined<string | null>("Value should be defined!"),
      nonEmptyStringValidator("Value should not be empty!"),
      minLength(8, "Value should be >= 8 chars long!"),
      maxLength(16, "Value should be <= 16 chars long!"),
    );

    [chainValidator, sequenceValidator].forEach((validator) => {
      it("should chain multiple validators", () => {
        expect(validator("Something")).resolves.toEqual(success("Something"));
        expect(validator(null)).resolves.toEqual(failure(["Value should be defined!"]));
        expect(validator("")).resolves.toEqual(failure(["Value should not be empty!"]));
        expect(validator("a")).resolves.toEqual(failure(["Value should be >= 8 chars long!"]));
        expect(validator("aaaaaaaaaaaaaaaaa")).resolves.toEqual(
          failure(["Value should be <= 16 chars long!"]),
        );
      });
    });
  });

  describe("chain & transform", () => {
    it("should chain multiple validators and transform intermediate values", () => {
      const validator = pipe(
        defined<string | null>("Value should be defined!"),
        transform((value) => value.trim()),
        chain(nonEmptyStringValidator("Value should not be empty!")),
        transform((value) => value.toUpperCase()),
        chain(lengthRange(8, 16, "Value should be between [8, 16] chars long!")),
        transform((value) => value.split("").map((char) => char.charCodeAt(0))),
      );

      expect(validator("abcdefgh")).resolves.toEqual(success([65, 66, 67, 68, 69, 70, 71, 72]));
      expect(validator(null)).resolves.toEqual(failure(["Value should be defined!"]));
      expect(validator("")).resolves.toEqual(failure(["Value should not be empty!"]));
      expect(validator("   ")).resolves.toEqual(failure(["Value should not be empty!"]));
      expect(validator("a")).resolves.toEqual(
        failure(["Value should be between [8, 16] chars long!"]),
      );
      expect(validator("aaaaaaaaaaaaaaaaa")).resolves.toEqual(
        failure(["Value should be between [8, 16] chars long!"]),
      );
    });
  });

  describe("parallel", () => {
    it("should execute validators in parallel and collect errors", () => {
      const validator = parallel(
        lengthRange(8, 64, "Password length must be between 8 and 64 chars!"),
        match(/(?=.*[A-Z])/, "Password must contain at least 1 uppercase letter!"),
        match(/(?=.*[a-z])/, "Password must contain at least 1 lowercase letter!"),
        match(/(?=.*\d)/, "Password must contain at least 1 digit!"),
      );

      expect(validator("Password123")).resolves.toEqual(success("Password123"));
      expect(validator("")).resolves.toEqual(
        failure([
          "Password length must be between 8 and 64 chars!",
          "Password must contain at least 1 uppercase letter!",
          "Password must contain at least 1 lowercase letter!",
          "Password must contain at least 1 digit!",
        ]),
      );
      expect(validator("   ")).resolves.toEqual(
        failure([
          "Password length must be between 8 and 64 chars!",
          "Password must contain at least 1 uppercase letter!",
          "Password must contain at least 1 lowercase letter!",
          "Password must contain at least 1 digit!",
        ]),
      );
      expect(validator("A")).resolves.toEqual(
        failure([
          "Password length must be between 8 and 64 chars!",
          "Password must contain at least 1 lowercase letter!",
          "Password must contain at least 1 digit!",
        ]),
      );
      expect(validator("Aa")).resolves.toEqual(
        failure([
          "Password length must be between 8 and 64 chars!",
          "Password must contain at least 1 digit!",
        ]),
      );
      expect(validator("Aa1")).resolves.toEqual(
        failure(["Password length must be between 8 and 64 chars!"]),
      );
    });
  });
});

import { useForm, validator } from "formoid";
import { useState } from "react";
import { Button, TextField } from "~/common/components";
import { customValidator, pipe } from "~/common/utils";
import cx from "classnames";
import { useStep } from "./useStep";

const MAX_STEP = 2;

function checkName(name: string) {
  return new Promise<{ name: string }>((resolve, reject) => {
    setTimeout(() => {
      if (name === "Admin") return reject(new Error("This name is already taken!"));

      return resolve({ name });
    }, 1000);
  });
}

type FormValues = {
  name: string;
  password: string;
  confirmPassword: string;
};

export function BugReproduction() {
  const [submitValues, setSubmitValues] = useState("");

  const { step, toNextStep, toStep } = useStep(MAX_STEP);

  const initialValues: FormValues = {
    name: "",
    password: "",
    confirmPassword: "",
  };
  const { fieldProps, handleSubmit, handleReset, isSubmitting, values } = useForm({
    initialValues,
    validationStrategy: "onBlur",
    validators: () => ({
      name:
        step === 0
          ? pipe(
              customValidator.nonEmptyString(),
              validator.transform((value) => value.trim()),
              validator.chain(
                validator.parallel(
                  validator.lengthRange(4, 64, "Name length must be between 8 and 64 chars!"),
                  validator.match(/^[a-zA-Z0-9]+$/, "Name must contain only alpha-numeric chars!"),
                ),
              ),
              validator.chain(
                validator.tryCatch(checkName, {
                  onFailure: (value) => (value instanceof Error ? value.message : "Unknown error!"),
                  onSuccess: ({ name }) => name,
                }),
              ),
            )
          : null,
      password: step === 1 ? customValidator.nonEmptyString() : null,
      confirmPassword: step === 2 ? customValidator.nonEmptyString() : null,
    }),
  });

  const submit = (): void =>
    handleSubmit((values) => {
      setSubmitValues(JSON.stringify(values, null, 2));
      // xD
      if (step < MAX_STEP) {
        toNextStep();
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        setTimeout(() => resolve(alert(JSON.stringify(values))));
      });
    });

  const reset = () => handleReset();

  return (
    <div className="h-full w-full p-4">
      <div className="m-auto w-[500px] space-y-3">
        <div className="flex gap-1">
          {[0, 1, 2].map((staph) => (
            <button
              key={staph}
              className={cx(
                "px-2 h-6 flex items-center rounded",
                staph === step ? "bg-red-300 text-red-950" : "bg-gray-300 text-gray-950",
              )}
              onClick={() => toStep(staph)}>
              Step {staph}
            </button>
          ))}
        </div>
        {step === 0 && <TextField {...fieldProps("name")} placeholder="John Doe" />}
        {step === 1 && (
          <TextField {...fieldProps("password")} placeholder="********" type="password" />
        )}
        {step === 2 && (
          <TextField {...fieldProps("confirmPassword")} placeholder="********" type="password" />
        )}
        <div className="flex items-center justify-end space-x-2">
          <Button color="danger" onClick={reset} type="reset">
            Reset
          </Button>
          <Button color="success" loading={isSubmitting} onClick={submit} type="submit">
            Submit
          </Button>
        </div>
      </div>
      <pre className="m-auto w-[500px] space-y-3">
        Current values
        <br />
        {JSON.stringify(values, null, 2)}
        <br />
        Submit values
        <br />
        {submitValues}
      </pre>
    </div>
  );
}

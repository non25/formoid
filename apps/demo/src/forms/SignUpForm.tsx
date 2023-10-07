import { useForm, validator } from "formoid";
import { Button, TextField } from "~/common/components";
import { customValidator, pipe } from "~/common/utils";

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

export function SignUpForm() {
  const initialValues: FormValues = {
    name: "",
    password: "",
    confirmPassword: "",
  };
  const { fieldProps, handleSubmit, handleReset, isSubmitting } = useForm({
    initialValues,
    validationStrategy: "onBlur",
    validators: ({ password }) => ({
      name: pipe(
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
      ),
      password: validator.sequence(
        customValidator.nonEmptyString(),
        validator.parallel(
          validator.lengthRange(8, 64, "Password length must be between 8 and 64 chars!"),
          validator.match(/(?=.*[A-Z])/, "Password must contain at least 1 uppercase letter!"),
          validator.match(/(?=.*[a-z])/, "Password must contain at least 1 lowercase letter!"),
          validator.match(/(?=.*\d)/, "Password must contain at least 1 digit!"),
        ),
      ),
      confirmPassword: validator.sequence(
        customValidator.nonEmptyString(),
        validator.fromPredicate((confirm) => confirm === password, "Passwords do not match!"),
      ),
    }),
  });

  const submit = () =>
    handleSubmit((values) => {
      return new Promise((resolve) => {
        setTimeout(() => resolve(alert(JSON.stringify(values))), 1000);
      });
    });

  const reset = () => handleReset();

  return (
    <div className="h-full w-full p-4">
      <div className="m-auto w-[500px] space-y-3">
        <TextField {...fieldProps("name")} placeholder="John Doe" />
        <TextField {...fieldProps("password")} placeholder="********" type="password" />
        <TextField {...fieldProps("confirmPassword")} placeholder="********" type="password" />
        <div className="flex items-center justify-end space-x-2">
          <Button color="danger" onClick={reset} type="reset">
            Reset
          </Button>
          <Button color="success" loading={isSubmitting} onClick={submit} type="submit">
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}

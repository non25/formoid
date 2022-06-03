import { Button, TextField } from "common/components";
import { customValidator } from "common/utils";
import { useForm, validator } from "formoid";

function saveData(data: unknown) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(console.log(data)), 1000);
  });
}

type FormValues = {
  name: string;
  password: string;
  confirmPassword: string;
};

function App() {
  const initialValues: FormValues = {
    name: "",
    password: "",
    confirmPassword: "",
  };
  const { fieldProps, handleReset, handleSubmit } = useForm({
    initialValues,
    validationStrategy: "onBlur",
    validators: ({ password }) => ({
      name: validator.sequence(
        customValidator.nonEmptyString(),
        validator.lengthRange(4, 64, "User name length must be between 8 and 64 chars!"),
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

  const submit = () => handleSubmit((values) => saveData(values));

  return (
    <div className="p-4 h-full w-full">
      <div className="m-auto space-y-3 w-[500px]">
        <TextField {...fieldProps("name")} placeholder="John Doe" />
        <TextField {...fieldProps("password")} placeholder="********" type="password" />
        <TextField {...fieldProps("confirmPassword")} placeholder="********" type="password" />
        <div className="flex items-center justify-end space-x-2">
          <Button color="danger" onClick={() => handleReset()} type="reset">
            Reset
          </Button>
          <Button color="success" onClick={submit} type="submit">
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}

export default App;

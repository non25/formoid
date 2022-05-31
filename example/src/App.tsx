import { useForm, validator } from "formoid";

function saveData(data: unknown) {
  return Promise.resolve(data);
}

type FormValues = {
  name: string | null;
  password: string | null;
  confirmPassword: string | null;
};

function App() {
  const initialValues: FormValues = {
    name: null,
    password: null,
    confirmPassword: null,
  };
  const form = useForm({
    initialValues,
    validationStrategy: "onBlur",
    validators: (values) => ({
      name: validator.defined("Name field is required!"),
      password: validator.sequence(
        validator.defined("Password field is required!"),
        validator.parallel(
          validator.lengthRange(8, 64, "Password length must be between 8 and 64 chars!"),
          validator.match(/(?=.*[A-Z])/, "Password must contain at least 1 uppercase letter!"),
          validator.match(/(?=.*[a-z])/, "Password must contain at least 1 lowercase letter!"),
          validator.match(/(?=.*\d)/, "Password must contain at least 1 digit!"),
        ),
      ),
      confirmPassword: validator.sequence(
        validator.defined("Confirm password field is required!"),
        validator.fromPredicate(
          (confirm) => confirm === values.password,
          "Passwords do not match!",
        ),
      ),
    }),
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSubmit = () => form.handleSubmit((values) => saveData(values));

  return null;
}

export default App;

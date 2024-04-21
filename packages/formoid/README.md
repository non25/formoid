# formoid

React library for building reliable forms.

## Installation

```
pnpm add formoid
```

## Example

```ts
import { useForm, validator } from "formoid";

type FormValues = {
  name: string;
  password: string;
  confirmPassword: string;
};

const SignUpForm = () => {
  const initialValues: FormValues = {
    name: "",
    password: "",
    confirmPassword: "",
  };
  const { fieldProps, handleReset, handleSubmit } = useForm({
    initialValues,
    validationStrategy: "onBlur",
    validators: ({ password }) => ({
      name: validator.lengthRange(4, 64, "User name length must be between 8 and 64 chars!"),
      password: validator.parallel(
        validator.lengthRange(8, 64, "Password length must be between 8 and 64 chars!"),
        validator.match(/(?=.*[A-Z])/, "Password must contain at least 1 uppercase letter!"),
        validator.match(/(?=.*[a-z])/, "Password must contain at least 1 lowercase letter!"),
        validator.match(/(?=.*\d)/, "Password must contain at least 1 digit!"),
      ),
      confirmPassword: validator.fromPredicate(
        (confirm) => confirm === password,
        "Passwords do not match!",
      ),
    }),
  });

  const submit = () => handleSubmit((values) => saveData(values));

  return (
    <div className="p-4 h-full w-full">
      <div className="m-auto space-y-3 w-[500px]">
        <TextField {...fieldProps("name")} placeholder="John Doe" type="email" />
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
};
```

## Zod bindings

By using Zod bindings, you can create a custom hook wrapper that accepts a Zod
schema shape as an argument, instead of using built-in validators:

```ts
import { UnknownRecord, ValidationStrategy, ZodSchema, fromZodSchema, useForm } from "formoid";

export type ZodFormConfig<T extends UnknownRecord, S extends ZodSchema<T>> = {
  initialValues: T;
  schema: ((values: T) => S) | S;
  validationStrategy: ValidationStrategy;
};

export function useZodForm<T extends UnknownRecord, S extends ZodSchema<T>>({
  initialValues,
  schema,
  validationStrategy,
}: ZodFormConfig<T, S>) {
  return useForm({
    initialValues,
    validationStrategy,
    validators: (values) => fromZodSchema(schema instanceof Function ? schema(values) : schema),
  });
}

const { fieldProps, handleSubmit, handleReset, isSubmitting } = useZodForm({
  initialValues: {
    name: "",
    password: "",
    confirmPassword: "",
  },
  validationStrategy: "onBlur",
  schema: ({ password }) => ({
    name: z
      .string()
      .min(4, "User name length must be min 4 chars!")
      .max(64, "User name length must be max 64 chars!")
      .refine(isNonBlankString, "This field should not be blank"),
    password: z
      .string()
      .min(8, "User name length must be min 8 chars!")
      .max(64, "User name length must be max 64 chars!")
      .regex(/(?=.*[A-Z])/, "Password must contain at least 1 uppercase letter!")
      .regex(/(?=.*[a-z])/, "Password must contain at least 1 lowercase letter!")
      .regex(/(?=.*\d)/, "Password must contain at least 1 digit!"),
    confirmPassword: z.string().refine((confirm) => confirm === password, "Passwords do not match!"),
  }),
});
```

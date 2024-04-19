import { fromZodSchema, useForm } from "formoid";
import { z } from "zod";
import { Button, TextField } from "~/common/components";
import { isNonBlankString } from "~/common/utils/refinements";

type FormValues = {
  name: string;
  password: string;
  confirmPassword: string;
};

const initialValues: FormValues = {
  name: "",
  password: "",
  confirmPassword: "",
};

export function ZodValidation() {
  const { fieldProps, handleSubmit, handleReset, isSubmitting } = useForm({
    initialValues,
    validationStrategy: "onBlur",
    validators({ password }) {
      return fromZodSchema({
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
        confirmPassword: z
          .string()
          .refine((confirm) => confirm === password, "Passwords do not match!"),
      });
    },
  });

  const submit = () =>
    handleSubmit((values) => {
      return new Promise((resolve) => {
        setTimeout(() => resolve(alert(JSON.stringify(values.name))), 1000);
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

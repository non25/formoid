import {
  FieldGroup,
  FieldProps,
  FormErrors,
  SetErrors,
  SetFieldArrayErrors,
  Update,
  ValidatedValues,
  ValidationSchema,
  ValidationStrategy,
} from "./Form";
import { minLength, transform } from "./validator";

type FormValuesConstraint = Record<string, unknown>;

type FieldArrayValuesConstraint = Record<string, Array<unknown>>;

type CompoundValues<FormValues, FieldArrayValues> = {
  form: FormValues;
  fieldArray: FieldArrayValues;
};

type FieldArrayValidationSchema<T extends FieldArrayValuesConstraint> = {
  [K in keyof T]: ValidationSchema<T[K][number]>;
};

type Config<
  FormValues extends FormValuesConstraint,
  FormSchema extends ValidationSchema<FormValues>,
  FieldArrayValues extends FieldArrayValuesConstraint,
  FieldArraySchema extends FieldArrayValidationSchema<FieldArrayValues>,
> = {
  form: {
    initialValues: FormValues;
    validationStrategy: ValidationStrategy;
    validators: (values: CompoundValues<FormValues, FieldArrayValues>) => FormSchema;
  };
  fieldArray: {
    initialValues: FieldArrayValues;
    validationStrategy: ValidationStrategy;
    validators: (values: CompoundValues<FormValues, FieldArrayValues>) => FieldArraySchema;
  };
};

type FieldArrayReturn<FieldArrayValues> = {
  append: (values: FieldArrayValues) => void;
  errors: Array<FormErrors<FieldArrayValues>>;
  groups: Array<FieldGroup<FieldArrayValues>>;
  handleReset: (update?: Update<Array<FieldArrayValues>>) => void;
  remove: (index: number) => void;
  setErrors: SetFieldArrayErrors<FieldArrayValues>;
  setValues: (index: number, update: Update<FieldArrayValues>) => void;
  values: Array<FieldArrayValues>;
};

type FieldArray<FieldArrayValues extends FieldArrayValuesConstraint> = {
  [K in keyof FieldArrayValues]: FieldArrayReturn<FieldArrayValues[K][number]>;
};

type FormReturn<FormValues> = {
  errors: FormErrors<FormValues>;
  fieldProps: <K extends keyof FormValues>(key: K) => FieldProps<FormValues[K]>;
  handleReset: (update?: Update<FormValues>) => void;
  setErrors: SetErrors<FormValues>;
  setValues: (update: Update<FormValues>) => void;
  values: FormValues;
};

type FieldArrayValidatedValues<
  FieldArrayValues extends FieldArrayValuesConstraint,
  FieldArraySchema extends FieldArrayValidationSchema<FieldArrayValues>,
> = {
  [K in keyof FieldArrayValues]: Array<
    ValidatedValues<
      FieldArrayValues[K][number],
      FieldArraySchema[K] extends ValidationSchema<FieldArrayValues[K][number]>
        ? FieldArraySchema[K]
        : ValidationSchema<FieldArrayValues[K][number]>
    >
  >;
};

type OnSubmit<
  FormValues extends FormValuesConstraint,
  FormSchema extends ValidationSchema<FormValues>,
  FieldArrayValues extends FieldArrayValuesConstraint,
  FieldArraySchema extends FieldArrayValidationSchema<FieldArrayValues>,
> = {
  (
    values: CompoundValues<
      ValidatedValues<FormValues, FormSchema>,
      FieldArrayValidatedValues<FieldArrayValues, FieldArraySchema>
    >,
  ): Promise<unknown>;
};

type OnSubmitMatch<
  FormValues extends FormValuesConstraint,
  FormSchema extends ValidationSchema<FormValues>,
  FieldArrayValues extends FieldArrayValuesConstraint,
  FieldArraySchema extends FieldArrayValidationSchema<FieldArrayValues>,
> = {
  onFailure: () => unknown;
  onSuccess: OnSubmit<FormValues, FormSchema, FieldArrayValues, FieldArraySchema>;
};

type HandleSubmit<
  FormValues extends FormValuesConstraint,
  FormSchema extends ValidationSchema<FormValues>,
  FieldArrayValues extends FieldArrayValuesConstraint,
  FieldArraySchema extends FieldArrayValidationSchema<FieldArrayValues>,
> = {
  (onSubmit: OnSubmit<FormValues, FormSchema, FieldArrayValues, FieldArraySchema>): void;
  (onSubmit: OnSubmitMatch<FormValues, FormSchema, FieldArrayValues, FieldArraySchema>): void;
};

type Return<
  FormValues extends FormValuesConstraint,
  FormSchema extends ValidationSchema<FormValues>,
  FieldArrayValues extends FieldArrayValuesConstraint,
  FieldArraySchema extends FieldArrayValidationSchema<FieldArrayValues>,
> = {
  fieldArray: FieldArray<FieldArrayValues>;
  form: FormReturn<FormValues>;
  handleReset: (update?: Update<CompoundValues<FormValues, FieldArrayValues>>) => void;
  handleSubmit: HandleSubmit<FormValues, FormSchema, FieldArrayValues, FieldArraySchema>;
  isSubmitting: boolean;
};

export declare function useCompoundForm<
  FormValues extends FormValuesConstraint,
  FormSchema extends ValidationSchema<FormValues>,
  FieldArrayValues extends FieldArrayValuesConstraint,
  FieldArraySchema extends FieldArrayValidationSchema<FieldArrayValues>,
>(
  config: Config<FormValues, FormSchema, FieldArrayValues, FieldArraySchema>,
): Return<FormValues, FormSchema, FieldArrayValues, FieldArraySchema>;

export function useTest() {
  type First = {
    some: string;
    body: string;
  };
  type Second = {
    any: string;
    thing: string;
  };

  const result = useCompoundForm({
    form: {
      initialValues: {
        first: "",
        second: "",
      },
      validationStrategy: "onBlur",
      validators: () => ({
        first: null,
        second: transform((value: string) => value.split(""), minLength(4, "4 chars")),
      }),
    },
    fieldArray: {
      initialValues: {
        first: [] as Array<First>,
        second: [] as Array<Second>,
      },
      validationStrategy: "onBlur",
      validators: () => ({
        first: {
          some: transform((value: string) => value.split(""), minLength(4, "4 chars")),
          body: null,
        },
        second: {
          any: null,
          thing: null,
        },
      }),
    },
  });

  result.handleSubmit((values) => Promise.resolve(values.form.second));
}

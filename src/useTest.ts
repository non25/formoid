import { FormErrors, Update, ValidatedValues, ValidationSchema, ValidationStrategy } from "./Form";
import { UseFieldArrayReturn } from "./useFieldArray";
import { UseFormReturn } from "./useForm";
import { minLength, transform } from "./validator";

type FormValuesConstraint = Record<string, unknown>;

type FieldArrayValuesConstraint = Record<string, Array<unknown>>;

type RedundantFields = "handleSubmit" | "isSubmitting";

type CompoundValues<FormValues, FieldArrayValues> = {
  form: FormValues;
  fieldArray: FieldArrayValues;
};

type FieldArrayValidationSchema<FieldArrayValues extends FieldArrayValuesConstraint> = {
  [K in keyof FieldArrayValues]: ValidationSchema<FieldArrayValues[K][number]>;
};

type FieldArrayErrors<FieldArrayValues extends FieldArrayValuesConstraint> = {
  [K in keyof FieldArrayValues]: Array<FormErrors<FieldArrayValues[K][number]>>;
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

type FieldArrayReturn<FieldArrayValues extends FieldArrayValuesConstraint> = {
  [K in keyof FieldArrayValues]: Omit<
    UseFieldArrayReturn<FieldArrayValues[K][number], never>,
    RedundantFields
  >;
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
  onFailure: (
    errors: CompoundValues<FormErrors<FormValues>, FieldArrayErrors<FieldArrayValues>>,
    values: CompoundValues<FormValues, FieldArrayValues>,
  ) => unknown;
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
  fieldArray: FieldArrayReturn<FieldArrayValues>;
  form: Omit<UseFormReturn<FormValues, never>, RedundantFields>;
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
  result.handleSubmit({
    onFailure: (errors, values) => errors.fieldArray.first.map((f) => f.some),
    onSuccess: () => Promise.resolve(null),
  });
}

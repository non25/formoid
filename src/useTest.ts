import {
  FieldGroup,
  FormErrors,
  SetFieldArrayErrors,
  Update,
  ValidatedValues,
  ValidationSchema,
  ValidationStrategy,
} from "./Form";
import { minLength, transform } from "./validator";

type FieldArrayValues = Record<string, Array<unknown>>;

export type UseFieldArrayConfig<T, S extends ValidationSchema<T>> = {
  initialValues: Array<T>;
  validationStrategy: ValidationStrategy;
  validators: (values: Array<T>) => S;
};

export type UseFieldArrayReturn<T> = {
  append: (values: T) => void;
  errors: Array<FormErrors<T>>;
  groups: Array<FieldGroup<T>>;
  handleReset: (update?: Update<Array<T>>) => void;
  remove: (index: number) => void;
  setErrors: SetFieldArrayErrors<T>;
  setValues: (index: number, update: Update<T>) => void;
  values: Array<T>;
};

export type Schema<T extends FieldArrayValues> = {
  [K in keyof T]: ValidationSchema<T[K][number]>;
};

export type Config<T extends FieldArrayValues, S extends Schema<T>> = {
  initialValues: T;
  validationStrategy: ValidationStrategy;
  validators: (values: T) => S;
};

export type FieldArray<T extends FieldArrayValues> = {
  [K in keyof T]: UseFieldArrayReturn<T[K][number]>;
};

export type OnSubmitValues<T extends FieldArrayValues, S extends Schema<T>> = {
  [K in keyof T]: Array<
    ValidatedValues<
      T[K][number],
      S[K] extends ValidationSchema<T[K][number]> ? S[K] : ValidationSchema<T[K][number]>
    >
  >;
};

export type OnSubmit<T extends FieldArrayValues, S extends Schema<T>> = {
  (values: OnSubmitValues<T, S>): Promise<unknown>;
};

export type HandleSubmit<T extends FieldArrayValues, S extends Schema<T>> = {
  (onSubmit: OnSubmit<T, S>): void;
};

export type Return<T extends FieldArrayValues, S extends Schema<T>> = {
  fieldArray: FieldArray<T>;
  handleSubmit: HandleSubmit<T, S>;
};

export declare function useCompoundForm<T extends FieldArrayValues, S extends Schema<T>>(
  config: Config<T, S>,
): Return<T, S>;

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
    initialValues: {
      first: [] as Array<First>,
      second: [] as Array<Second>,
    },
    validationStrategy: "onBlur",
    validators: (values) => ({
      first: {
        some: transform((value: string) => value.split(""), minLength(4, "4 chars")),
        body: null,
      },
      second: {
        any: null,
        thing: null,
      },
    }),
  });

  result.handleSubmit((values) => Promise.resolve(values.first.map((v) => v.some)));
}

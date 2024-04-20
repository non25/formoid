import { fromZod, fromZodSchema, useCompositeForm, validator } from "formoid";
import { z } from "zod";
import { Button, TextField } from "~/common/components";
import { customValidator } from "~/common/utils";
import { isNonBlankString, isNonEmptyString } from "~/common/utils/refinements";

type General = {
  name: string;
  lastName: string;
};

const initialValues: General = { name: "", lastName: "" };

type Experience = {
  company: string;
  position: string;
};

const emptyExperience: Experience = { company: "", position: "" };

type Technology = {
  name: string;
  years: string;
};

const emptyTechnology: Technology = { name: "", years: "" };

function isElementUnique<T>(array: Array<T>, element: T) {
  return array.indexOf(element) !== -1 && array.indexOf(element) === array.lastIndexOf(element);
}

function saveData<T>(data: T) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(console.log("Success", data)), 1000);
  });
}

function SectionHeader({ children }: { children: string }) {
  return (
    <span className="block w-full border-b border-b-black pb-1 text-center text-xl">
      {children}
    </span>
  );
}

export function JobApplication() {
  const { form, fieldArray, handleReset, handleSubmit, isSubmitting } = useCompositeForm({
    form: {
      initialValues,
      validationStrategy: "onBlur",
      validators: () => ({
        name: {
          validationStrategy: "onChange",
          validator: fromZod(
            z
              .string()
              .min(4, "Name should be >= 4 chars long")
              .max(32, "Name should be <= 32 chars long")
              .refine(isNonBlankString, "This field should not be blank"),
          ),
        },
        lastName: validator.sequence(
          customValidator.nonBlankString(),
          validator.maxLength(32, "Last Name should be <= 32 chars long"),
        ),
      }),
    },
    fieldArray: {
      initialValues: {
        experience: [emptyExperience],
        technologies: [emptyTechnology],
      },
      validationStrategy: "onBlur",
      validators({ fieldArray }) {
        const technologies = fieldArray.technologies.map(({ name }) => name);

        return {
          experience: fromZodSchema({
            company: z.string().refine(isNonBlankString),
            position: z.string().refine(isNonBlankString),
          }),
          technologies: fromZodSchema({
            name: z
              .string()
              .refine((value) => isElementUnique(technologies, value), "Please remove duplicates")
              .refine(isNonEmptyString),
            years: z.string().transform(Number),
          }),
        };
      },
    },
  });

  const submit = () =>
    handleSubmit({
      onFailure: (errors) => {
        console.log("Failure", errors);
      },
      onSuccess: (values) => saveData(values.form.name),
    });

  return (
    <div className="mx-auto flex w-[600px] flex-col gap-4 py-4">
      <div className="flex w-full flex-col gap-4">
        <SectionHeader>General information</SectionHeader>
        <div className="flex gap-4">
          <TextField {...form.fieldProps("name")} placeholder="Name" />
          <TextField {...form.fieldProps("lastName")} placeholder="Last name" />
        </div>
      </div>
      <div className="flex w-full flex-col gap-4">
        <SectionHeader>Experience</SectionHeader>
        {fieldArray.experience.groups.map((group, index) => (
          <div className="flex gap-4" key={index}>
            <TextField {...group.company} placeholder="Company name" />
            <TextField {...group.position} placeholder="Position" />
            <Button
              color="danger"
              onClick={() => fieldArray.experience.remove(index)}
              type="button">
              Remove
            </Button>
          </div>
        ))}
        <Button onClick={() => fieldArray.experience.append(emptyExperience)} type="button">
          Add
        </Button>
      </div>
      <div className="flex w-full flex-col gap-4">
        <SectionHeader>Technologies</SectionHeader>
        {fieldArray.technologies.groups.map((group, index) => (
          <div className="flex gap-4" key={index}>
            <TextField {...group.name} placeholder="Name" />
            <TextField {...group.years} placeholder="Years of experience" />
            <Button
              color="danger"
              onClick={() => fieldArray.technologies.remove(index)}
              type="button">
              Remove
            </Button>
          </div>
        ))}
        <Button onClick={() => fieldArray.technologies.append(emptyTechnology)} type="button">
          Add
        </Button>
      </div>
      <div className="flex items-center justify-end gap-4">
        <Button color="danger" onClick={handleReset} type="reset">
          Reset
        </Button>
        <Button
          color="success"
          disabled={fieldArray.experience.groups.length === 0}
          loading={isSubmitting}
          onClick={submit}
          type="submit">
          Submit
        </Button>
      </div>
    </div>
  );
}

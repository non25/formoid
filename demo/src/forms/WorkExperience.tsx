import { useFieldArray, validator } from "formoid";
import { Button, TextField } from "~/common/components";
import { customValidator } from "~/common/utils";

type FormValues = {
  company: string;
  position: string;
};

export function WorkExperience() {
  const { append, groups, isSubmitting, remove, handleReset, handleSubmit } = useFieldArray({
    initialValues: [{ company: "", position: "" }] as Array<FormValues>,
    validationStrategy: "onBlur",
    validators: (values) => ({
      company: validator.sequence(
        customValidator.nonBlankString(),
        validator.fromPredicate(
          (value) => values.filter(({ company }) => company === value).length === 1,
          "This company has already been added",
        ),
      ),
      position: customValidator.nonBlankString(),
    }),
  });

  const reset = () => handleReset();

  const submit = () =>
    handleSubmit({
      onSuccess: (values) => Promise.resolve(alert(JSON.stringify(values))),
      onFailure: () => alert("Some fields are not valid!"),
    });

  return (
    <div className="mx-auto flex w-[600px] flex-col gap-4 py-4">
      {groups.map((group, index) => (
        <div className="flex gap-4" key={index}>
          <TextField {...group.company} placeholder="Company name" />
          <TextField {...group.position} placeholder="Position" />
          <Button color="danger" onClick={() => remove(index)} type="button">
            Remove
          </Button>
        </div>
      ))}
      <Button onClick={() => append({ company: "", position: "" })} type="button">
        Add
      </Button>
      <div className="flex items-center justify-end gap-4">
        <Button color="danger" onClick={reset} type="reset">
          Reset
        </Button>
        <Button
          color="success"
          disabled={groups.length === 0}
          loading={isSubmitting}
          onClick={submit}
          type="submit">
          Submit
        </Button>
      </div>
    </div>
  );
}

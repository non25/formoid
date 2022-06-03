import * as Tooltip from "@radix-ui/react-tooltip";
import cx from "classnames";
import { Overwrite } from "common/utils";
import { FieldProps } from "formoid";
import { ChangeEvent, FocusEvent, InputHTMLAttributes, MouseEvent, useState } from "react";
import css from "./TextField.module.scss";

type DefaultProps = InputHTMLAttributes<HTMLInputElement>;

type InputSize = "sm" | "md" | "lg";

type CustomProps = FieldProps<string> &
  Partial<{ size: InputSize; type: "email" | "password" | "text" }>;

type Props = Overwrite<DefaultProps, CustomProps>;

export const TextField = ({
  className,
  errors,
  onBlur,
  onChange,
  size = "md",
  touched,
  ...props
}: Props) => {
  const hasErrors = errors !== null;
  const [showError, setShowError] = useState(hasErrors);

  const handleBlur = (): void => {
    onBlur();
    hasErrors && setShowError(false);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onChange(event.currentTarget.value);
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>): void => {
    props.onFocus && props.onFocus(event);
    hasErrors && setShowError(true);
  };

  const handleMouseEnter = (event: MouseEvent<HTMLInputElement>): void => {
    props.onMouseEnter && props.onMouseEnter(event);
    hasErrors && setShowError(true);
  };

  const handleMouseLeave = (event: MouseEvent<HTMLInputElement>): void => {
    props.onMouseLeave && props.onMouseLeave(event);
    hasErrors && setShowError(false);
  };

  const styles = cx(
    css.input,
    css[size],
    props.readOnly && css.readOnly,
    hasErrors && css.invalid,
    className,
  );

  return (
    <Tooltip.Root open={showError}>
      <Tooltip.Trigger asChild>
        <input
          {...props}
          className={styles}
          onBlur={handleBlur}
          onChange={handleChange}
          onFocus={handleFocus}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        />
      </Tooltip.Trigger>
      <Tooltip.Content className={css.error} side="top">
        <div className="flex flex-col gap-2">
          {errors?.map((error, key) => (
            <span key={key}>{error.message}</span>
          ))}
        </div>
        <Tooltip.Arrow className="fill-red-400" />
      </Tooltip.Content>
    </Tooltip.Root>
  );
};

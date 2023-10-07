import * as Tooltip from "@radix-ui/react-tooltip";
import cx from "classnames";
import { FieldProps } from "formoid";
import { ChangeEvent, FocusEvent, InputHTMLAttributes, MouseEvent, useState } from "react";
import { Overwrite } from "~/common/utils";
import css from "./TextField.module.scss";

type Props = Overwrite<
  InputHTMLAttributes<HTMLInputElement>,
  FieldProps<string> & Partial<{ size: "sm" | "md" | "lg"; type: "email" | "password" | "text" }>
>;

export const TextField = ({
  className,
  errors,
  onBlur,
  onChange,
  size = "md",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  touched,
  ...props
}: Props) => {
  const hasErrors = errors !== null;
  const [showError, setShowError] = useState(hasErrors);

  const handleBlur = () => {
    onBlur();
    hasErrors && setShowError(false);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.currentTarget.value);
  };

  const handleFocus = (event: FocusEvent<HTMLInputElement>) => {
    props.onFocus?.(event);
    hasErrors && setShowError(true);
  };

  const handleMouseEnter = (event: MouseEvent<HTMLInputElement>) => {
    props.onMouseEnter?.(event);
    hasErrors && setShowError(true);
  };

  const handleMouseLeave = (event: MouseEvent<HTMLInputElement>) => {
    props.onMouseLeave?.(event);
    hasErrors && setShowError(false);
  };

  return (
    <Tooltip.Provider>
      <Tooltip.Root open={showError}>
        <Tooltip.Trigger asChild>
          <input
            {...props}
            className={cx(
              css.input,
              css[size],
              props.readOnly && css.readOnly,
              hasErrors && css.invalid,
              className,
            )}
            onBlur={handleBlur}
            onChange={handleChange}
            onFocus={handleFocus}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          />
        </Tooltip.Trigger>
        <Tooltip.Content className={css.error} side="top">
          <div className="flex flex-col gap-2">
            {errors?.map((error, key) => <span key={key}>{error}</span>)}
          </div>
          <Tooltip.Arrow className="fill-red-400" />
        </Tooltip.Content>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};

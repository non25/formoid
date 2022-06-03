import cx from "classnames";
import { Overwrite } from "common/utils";
import { ButtonHTMLAttributes, ReactNode } from "react";
import css from "./Button.module.scss";

type DefaultProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "size">;

type ButtonColor = "danger" | "info" | "light" | "primary" | "secondary" | "success" | "warning";

type ButtonSize = "sm" | "md" | "lg";

type CustomProps = { children: ReactNode } & Partial<{
  color: ButtonColor;
  loading: boolean;
  size: ButtonSize;
}>;

type Props = Overwrite<DefaultProps, CustomProps>;

export const Button = ({
  className,
  color = "primary",
  loading = false,
  size = "md",
  ...props
}: Props) => (
  <button
    {...props}
    className={cx(css.button, css[color], css[size], loading && css.loading, className)}
    disabled={props.disabled || loading}
  />
);

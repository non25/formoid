import { useCallback, useMemo, useRef, useState } from "react";
import {
  FormErrors,
  SetErrors,
  Update,
  formStateManager,
  getErrors,
  getValues,
  initializeForm,
  updateValues,
} from "./Form";

export function useFormState<T>(initialValues: T) {
  const persistentInitialValues = useRef(initialValues);
  const [state, setState] = useState(initializeForm(persistentInitialValues.current));

  const errors = useMemo(() => getErrors(state), [state]);
  const values = useMemo(() => getValues(state), [state]);

  const blur = useCallback(<K extends keyof T>(key: K) => {
    setState((state) => formStateManager(state).blur(key));
  }, []);
  const change = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setState((state) => formStateManager(state).change(key, value));
  }, []);
  const disable = useCallback(<K extends keyof T>(key: K) => {
    setState((state) => formStateManager(state).disable(key));
  }, []);
  const enable = useCallback(<K extends keyof T>(key: K) => {
    setState((state) => formStateManager(state).enable(key));
  }, []);
  const reset = useCallback(
    (update?: Update<T>): void => {
      setState(initializeForm(update ? update(values) : persistentInitialValues.current));
    },
    [values],
  );
  const setErrors: SetErrors<T> = useCallback((key, errors): void => {
    setState((state) => formStateManager(state).setErrors(key, errors));
  }, []);
  const setValues = useCallback(
    (update: Update<T>): void => {
      setState((state) => updateValues(state, update(values)));
    },
    [values],
  );

  const toggle = useCallback(
    (action: "enable" | "disable") => {
      for (const key in values) {
        if (action === "enable") {
          enable(key);
        } else {
          disable(key);
        }
      }
    },
    [disable, enable, values],
  );
  const propagateErrors = useCallback(
    (errors: FormErrors<T>): void => {
      for (const key in errors) setErrors(key, errors[key]);
    },
    [setErrors],
  );

  return {
    state,

    errors,
    values,

    blur,
    change,
    disable,
    enable,
    reset,
    setErrors,
    setValues,

    propagateErrors,
    toggle,
  };
}

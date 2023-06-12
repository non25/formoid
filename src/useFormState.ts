import { useCallback, useMemo, useState } from "react";
import {
  FormErrors,
  FormState,
  SetErrors,
  Update,
  formStateManager,
  getErrors,
  getValues,
  initializeForm,
  updateValues,
} from "./utils/Form";

export function useFormState<T>(initialState: FormState<T>) {
  const [state, setState] = useState(initialState);

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
      setState(update ? initializeForm(update(values)) : initialState);
    },
    [initialState, values],
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
  };
}

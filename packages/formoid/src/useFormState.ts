import { useCallback, useMemo, useRef, useState } from "react";
import {
  FormErrors,
  SetErrors,
  Toggle,
  Update,
  formStateManager,
  getErrors,
  getValues,
  initializeForm,
  updateValues,
} from "./Form";
import { UnknownRecord, forEach } from "./Record";

export function useFormState<T extends UnknownRecord>(initialValues: T) {
  const persistentInitialValues = useRef(initialValues);
  const [state, setState] = useState(() => initializeForm(persistentInitialValues.current));

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
  const reset = useCallback((update?: Update<T>): void => {
    setState((state) => initializeForm(update ? update(getValues(state)) : persistentInitialValues.current));
  }, []);
  const setErrors: SetErrors<T> = useCallback((key, errors): void => {
    setState((state) => formStateManager(state).setErrors(key, errors));
  }, []);
  const setValues = useCallback((update: Update<T>): void => {
    setState((state) => updateValues(state, update(getValues(state))));
  }, []);

  const toggle: Toggle = useCallback(
    (action) => forEach(values, (_, key) => (action === "enable" ? enable : disable)(key)),
    [disable, enable, values],
  );
  const propagateErrors = useCallback(
    (errors: FormErrors<T>): void => forEach(errors, (errors, key) => setErrors(key, errors)),
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

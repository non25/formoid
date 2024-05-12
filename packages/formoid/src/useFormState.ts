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
  const stateRef = useRef(state);

  const errors = useMemo(() => getErrors(state), [state]);
  const values = useMemo(() => getValues(state), [state]);

  const blur = useCallback(<K extends keyof T>(key: K) => {
    stateRef.current = formStateManager(stateRef.current).blur(key);
    setState(stateRef.current);
  }, []);
  const change = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    stateRef.current = formStateManager(stateRef.current).change(key, value);
    setState(stateRef.current);
  }, []);
  const disable = useCallback(<K extends keyof T>(key: K) => {
    stateRef.current = formStateManager(stateRef.current).disable(key);
    setState(stateRef.current);
  }, []);
  const enable = useCallback(<K extends keyof T>(key: K) => {
    stateRef.current = formStateManager(stateRef.current).enable(key);
    setState(stateRef.current);
  }, []);
  const reset = useCallback((update?: Update<T>): void => {
    stateRef.current = initializeForm(update ? update(getValues(stateRef.current)) : persistentInitialValues.current);
    setState(stateRef.current);
  }, []);
  const setErrors: SetErrors<T> = useCallback((key, errors): void => {
    stateRef.current = formStateManager(stateRef.current).setErrors(key, errors);
    setState(stateRef.current);
  }, []);
  const setValues = useCallback((update: Update<T>): void => {
    stateRef.current = updateValues(stateRef.current, update(getValues(stateRef.current)));
    setState(stateRef.current);
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
    stateRef,

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

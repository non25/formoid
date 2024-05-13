import { useCallback, useMemo, useRef, useState } from "react";
import { deleteAt, modifyAt } from "./Array";
import {
  FormErrors,
  SetFieldArrayErrors,
  Toggle,
  Update,
  formStateManager,
  getErrors,
  getValues,
  initializeForm,
  updateValues,
} from "./Form";
import { UnknownRecord, forEach } from "./Record";

export function useFieldArrayState<T extends UnknownRecord>(initialValues: Array<T>) {
  const persistentInitialValues = useRef(initialValues);
  const [state, setState] = useState(() => persistentInitialValues.current.map(initializeForm));

  const errors = useMemo(() => state.map(getErrors), [state]);
  const values = useMemo(() => state.map(getValues), [state]);

  const append = useCallback((values: T) => {
    setState((state) => state.concat(initializeForm(values)));
  }, []);
  const blur = useCallback(<K extends keyof T>(index: number, key: K) => {
    setState(modifyAt(index, (group) => formStateManager(group).blur(key)));
  }, []);
  const change = useCallback(<K extends keyof T>(index: number, key: K, value: T[K]) => {
    setState(modifyAt(index, (group) => formStateManager(group).change(key, value)));
  }, []);
  const disable = useCallback(<K extends keyof T>(index: number, key: K) => {
    setState(modifyAt(index, (group) => formStateManager(group).disable(key)));
  }, []);
  const enable = useCallback(<K extends keyof T>(index: number, key: K) => {
    setState(modifyAt(index, (group) => formStateManager(group).enable(key)));
  }, []);
  const remove = useCallback((index: number) => {
    setState(deleteAt(index));
  }, []);
  const reset = useCallback((update?: Update<Array<T>>) => {
    setState((state) => (update?.(state.map(getValues)) ?? persistentInitialValues.current).map(initializeForm));
  }, []);
  const setErrors: SetFieldArrayErrors<T> = useCallback((index, key, errors) => {
    setState(modifyAt(index, (group) => formStateManager(group).setErrors(key, errors)));
  }, []);
  const setValues = useCallback((index: number, update: Update<T>) => {
    setState(modifyAt(index, (group) => updateValues(group, update(getValues(group)))));
  }, []);

  const toggle: Toggle = useCallback(
    (action) => {
      values.forEach((itemValues, index) => {
        forEach(itemValues, (_, key) => (action === "enable" ? enable : disable)(index, key));
      });
    },
    [disable, enable, values],
  );
  const propagateErrors = useCallback(
    (errors: Array<FormErrors<T> | null>): void => {
      errors.forEach((groupErrors, index) => {
        if (groupErrors) {
          forEach(groupErrors, (errors, key) => setErrors(index, key, errors));
        } else {
          forEach(values[index], (_, key) => setErrors(index, key, null));
        }
      });
    },
    [setErrors, values],
  );

  return {
    state,

    errors,
    values,

    append,
    blur,
    change,
    disable,
    enable,
    remove,
    reset,
    setErrors,
    setValues,

    propagateErrors,
    toggle,
  };
}

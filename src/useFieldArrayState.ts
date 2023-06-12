import { useCallback, useMemo, useState } from "react";
import { deleteAt, modifyAt } from "./Array";
import {
  FormErrors,
  FormState,
  SetFieldArrayErrors,
  Update,
  formStateManager,
  getErrors,
  getValues,
  initializeForm,
  updateValues,
} from "./Form";

type Params<T> = {
  initialState: Array<FormState<T>>;
  initialGroupState: FormState<T> | null;
};

export function useFieldArrayState<T>({ initialState, initialGroupState }: Params<T>) {
  const [state, setState] = useState(initialState);

  const errors = useMemo(() => state.map(getErrors), [state]);
  const values = useMemo(() => state.map(getValues), [state]);

  const append = useCallback(() => {
    setState((state) => (initialGroupState ? state.concat(initialGroupState) : state));
  }, [initialGroupState]);
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
  const reset = useCallback(
    (update?: Update<Array<T>>) => {
      setState(update?.(values).map(initializeForm) ?? initialState);
    },
    [initialState, values],
  );
  const setErrors: SetFieldArrayErrors<T> = useCallback((index, key, errors) => {
    setState(modifyAt(index, (group) => formStateManager(group).setErrors(key, errors)));
  }, []);
  const setValues = useCallback((index: number, update: Update<T>) => {
    setState(modifyAt(index, (group) => updateValues(group, update(getValues(group)))));
  }, []);

  const toggle = useCallback(
    (action: "enable" | "disable") => {
      for (const [index] of values.entries()) {
        for (const key in values[index]) {
          if (action === "enable") {
            enable(index, key);
          } else {
            disable(index, key);
          }
        }
      }
    },
    [disable, enable, values],
  );
  const propagateErrors = useCallback(
    (errors: Array<FormErrors<T> | null>): void => {
      for (const [index, groupErrors] of errors.entries()) {
        if (groupErrors) {
          for (const key in groupErrors) {
            setErrors(index, key, groupErrors[key]);
          }
        } else {
          for (const key in values[index]) {
            setErrors(index, key, null);
          }
        }
      }
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

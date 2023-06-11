import { Reducer, useCallback, useMemo, useReducer } from "react";
import { NonEmptyArray } from "./utils/Array";
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

type Action<T> =
  | {
      id: "Blur";
      key: keyof T;
    }
  | {
      id: "Change";
      key: keyof T;
      value: T[keyof T];
    }
  | {
      id: "Disable";
      key: keyof T;
    }
  | {
      id: "Enable";
      key: keyof T;
    }
  | {
      id: "Reset";
      update?: Update<T>;
    }
  | {
      id: "SetErrors";
      key: keyof T;
      errors: NonEmptyArray<string> | null;
    }
  | {
      id: "SetValues";
      update: Update<T>;
    };

export function useFormState<T>(initialState: FormState<T>) {
  const reducer: Reducer<FormState<T>, Action<T>> = (state, action) => {
    const manager = formStateManager(state);
    const values = getValues(state);

    switch (action.id) {
      case "Blur":
        return manager.blur(action.key);

      case "Change":
        return manager.change(action.key, action.value);

      case "Disable":
        return manager.disable(action.key);

      case "Enable":
        return manager.enable(action.key);

      case "Reset":
        return action.update ? initializeForm(action.update(values)) : initialState;

      case "SetErrors":
        return manager.setErrors(action.key, action.errors);

      case "SetValues":
        return updateValues(state, action.update(values));
    }
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  const errors = useMemo(() => getErrors(state), [state]);
  const values = useMemo(() => getValues(state), [state]);

  const blur = useCallback(<K extends keyof T>(key: K) => {
    dispatch({ id: "Blur", key });
  }, []);
  const change = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    dispatch({ id: "Change", key, value });
  }, []);
  const disable = useCallback(<K extends keyof T>(key: K) => {
    dispatch({ id: "Disable", key });
  }, []);
  const enable = useCallback(<K extends keyof T>(key: K) => {
    dispatch({ id: "Enable", key });
  }, []);
  const reset = useCallback((update?: Update<T>): void => {
    dispatch({ id: "Reset", update });
  }, []);
  const setErrors: SetErrors<T> = useCallback((key, errors): void => {
    dispatch({ id: "SetErrors", key, errors });
  }, []);
  const setValues = useCallback((update: Update<T>): void => {
    dispatch({ id: "SetValues", update });
  }, []);

  const propagateErrors = useCallback((errors: FormErrors<T>): void => {
    for (const key in errors) dispatch({ id: "SetErrors", key, errors: errors[key] });
  }, []);

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

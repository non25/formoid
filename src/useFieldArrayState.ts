import { Reducer, useCallback, useMemo, useReducer } from "react";
import { NonEmptyArray, deleteAt, modifyAt } from "./utils/Array";
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
} from "./utils/Form";

type Action<T> =
  | {
      id: "Append";
    }
  | {
      id: "Blur";
      index: number;
      key: keyof T;
    }
  | {
      id: "Change";
      index: number;
      key: keyof T;
      value: T[keyof T];
    }
  | {
      id: "Disable";
      index: number;
      key: keyof T;
    }
  | {
      id: "Enable";
      index: number;
      key: keyof T;
    }
  | {
      id: "SetErrors";
      index: number;
      key: keyof T;
      errors: NonEmptyArray<string> | null;
    }
  | {
      id: "SetValues";
      index: number;
      update: Update<T>;
    }
  | {
      id: "Remove";
      index: number;
    }
  | {
      id: "Reset";
      update?: Update<Array<T>>;
    };

type Params<T> = {
  initialState: Array<FormState<T>>;
  initialGroupState: FormState<T> | null;
};

export function useFieldArrayState<T>({ initialState, initialGroupState }: Params<T>) {
  const reducer: Reducer<Array<FormState<T>>, Action<T>> = (state, action) => {
    const values = state.map(getValues);

    function modify(index: number, fn: (a: FormState<T>) => FormState<T>): Array<FormState<T>> {
      return modifyAt(index, fn, state);
    }

    switch (action.id) {
      case "Append":
        return initialGroupState ? state.concat(initialGroupState) : state;

      case "Blur":
        return modify(action.index, (group) => formStateManager(group).blur(action.key));

      case "Change":
        return modify(action.index, (group) =>
          formStateManager(group).change(action.key, action.value),
        );

      case "Disable":
        return modify(action.index, (group) => formStateManager(group).disable(action.key));

      case "Enable":
        return modify(action.index, (group) => formStateManager(group).enable(action.key));

      case "Remove":
        return deleteAt(action.index, state);

      case "Reset":
        return action.update ? action.update(values).map(initializeForm) : initialState;

      case "SetErrors":
        return modify(action.index, (group) =>
          formStateManager(group).setErrors(action.key, action.errors),
        );

      case "SetValues":
        return modify(action.index, (group) =>
          updateValues(group, action.update(getValues(group))),
        );
    }
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  const errors = useMemo(() => state.map(getErrors), [state]);
  const values = useMemo(() => state.map(getValues), [state]);

  const append = useCallback(() => {
    dispatch({ id: "Append" });
  }, []);
  const blur = useCallback(<K extends keyof T>(index: number, key: K) => {
    dispatch({ id: "Blur", index, key });
  }, []);
  const change = useCallback(<K extends keyof T>(index: number, key: K, value: T[K]) => {
    dispatch({ id: "Change", index, key, value });
  }, []);
  const disable = useCallback(<K extends keyof T>(index: number, key: K) => {
    dispatch({ id: "Disable", index, key });
  }, []);
  const enable = useCallback(<K extends keyof T>(index: number, key: K) => {
    dispatch({ id: "Enable", index, key });
  }, []);
  const remove = useCallback((index: number) => {
    dispatch({ id: "Remove", index });
  }, []);
  const reset = useCallback((update?: Update<Array<T>>) => {
    dispatch({ id: "Reset", update });
  }, []);
  const setErrors: SetFieldArrayErrors<T> = useCallback((index, key, errors) => {
    dispatch({ id: "SetErrors", index, key, errors });
  }, []);
  const setValues = useCallback((index: number, update: Update<T>) => {
    dispatch({ id: "SetValues", index, update });
  }, []);

  const propagateErrors = useCallback(
    (errors: Array<FormErrors<T> | null>): void => {
      for (const [index, groupErrors] of errors.entries()) {
        if (groupErrors) {
          for (const key in groupErrors) {
            dispatch({ id: "SetErrors", index, key, errors: groupErrors[key] });
          }
        } else {
          for (const key in values[index]) {
            dispatch({ id: "SetErrors", index, key, errors: null });
          }
        }
      }
    },
    [values],
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
  };
}

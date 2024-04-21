import { useCallback, useState } from "react";

export const useStep = (maxStep: number) => {
  const [step, setStep] = useState(0);

  const toPrevStep = useCallback(() => {
    setStep((step) => {
      const prevStep = step - 1;
      return prevStep <= 0 ? 0 : prevStep;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toNextStep = useCallback(() => {
    setStep((step) => {
      const nextStep = step + 1;
      return nextStep >= maxStep ? maxStep : nextStep;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toStep = useCallback(
    (step: number) => {
      setStep(step > maxStep ? maxStep : step < 0 ? 0 : step);
    },
    [maxStep],
  );

  return { step, toPrevStep, toNextStep, toStep };
};

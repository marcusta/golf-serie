import { useCallback, useState } from "react";

interface UseNativeKeyboardProps {
  onScoreSubmit: (score: number) => void;
  onCancel: () => void;
}

export function useNativeKeyboard({
  onScoreSubmit,
  onCancel,
}: UseNativeKeyboardProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const show = useCallback(() => {
    setIsVisible(true);
    setInputValue("");
  }, []);

  const hide = useCallback(() => {
    setIsVisible(false);
    setInputValue("");
    onCancel();
  }, [onCancel]);

  const handleSubmit = useCallback(() => {
    const score = parseInt(inputValue, 10);
    if (!isNaN(score) && score >= 9) {
      onScoreSubmit(score);
      hide();
    }
  }, [inputValue, onScoreSubmit, hide]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Only allow numbers
      if (/^\d*$/.test(value)) {
        setInputValue(value);
      }
    },
    []
  );

  return {
    isVisible,
    inputValue,
    show,
    hide,
    handleSubmit,
    handleInputChange,
  };
}

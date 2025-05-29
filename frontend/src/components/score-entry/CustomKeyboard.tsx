import { cn } from "@/lib/utils";

interface CustomKeyboardProps {
  onNumberPress: (number: number) => void;
  onSpecialPress: (action: "more" | "clear") => void;
  visible: boolean;
}

export function CustomKeyboard({
  onNumberPress,
  onSpecialPress,
  visible,
}: CustomKeyboardProps) {
  const handleNumberPress = (number: number) => {
    onNumberPress(number);
  };

  const handleSpecialPress = (action: "more" | "clear") => {
    onSpecialPress(action);
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 transition-transform duration-300 ease-in-out",
        visible ? "translate-y-0" : "translate-y-full",
        "shadow-lg rounded-t-xl p-2"
      )}
    >
      {/* Common scores row */}
      <div className="grid grid-cols-4 gap-1 mb-1">
        {[3, 4, 5, 6].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberPress(num)}
            className="h-12 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-lg text-xl font-bold text-blue-900 transition-colors touch-manipulation"
          >
            {num}
          </button>
        ))}
      </div>

      {/* Less common scores row */}
      <div className="grid grid-cols-4 gap-1 mb-1">
        {[2, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberPress(num)}
            className="h-12 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-lg text-xl font-bold text-gray-900 transition-colors touch-manipulation"
          >
            {num}
          </button>
        ))}
      </div>

      {/* Rare scores row */}
      <div className="grid grid-cols-4 gap-1">
        <button
          onClick={() => handleNumberPress(1)}
          className="h-12 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-lg text-lg font-bold text-gray-900 transition-colors touch-manipulation"
        >
          1
        </button>
        <button
          onClick={() => handleNumberPress(10)}
          className="h-12 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-lg text-lg font-bold text-gray-900 transition-colors touch-manipulation"
        >
          10
        </button>
        <button
          onClick={() => handleNumberPress(11)}
          className="h-12 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-lg text-lg font-bold text-gray-900 transition-colors touch-manipulation"
        >
          11
        </button>
        <button
          onClick={() => handleSpecialPress("more")}
          className="h-12 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-lg text-lg font-bold text-gray-900 transition-colors touch-manipulation"
        >
          12+
        </button>
      </div>
    </div>
  );
}

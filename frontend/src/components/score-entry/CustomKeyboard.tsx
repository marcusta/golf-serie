import { cn } from "@/lib/utils";

interface CustomKeyboardProps {
  onNumberPress: (number: number) => void;
  onSpecialPress: (action: "more" | "clear" | "unreported") => void;
  visible: boolean;
  holePar: number;
}

export function CustomKeyboard({
  onNumberPress,
  onSpecialPress,
  visible,
  holePar,
}: CustomKeyboardProps) {
  const handleNumberPress = (number: number) => {
    onNumberPress(number);
  };

  const handleSpecialPress = (action: "more" | "clear" | "unreported") => {
    onSpecialPress(action);
  };

  // Function to get scoring terminology based on score relative to par
  const getScoreLabel = (score: number): string => {
    if (score === 1) return "HIO"; // Hole in one

    const difference = score - holePar;

    if (difference <= -4) return "OTHER"; // Condor (4 under) or better - very rare
    if (difference === -3) return "ALBA"; // Albatross (3 under)
    if (difference === -2) return "EAGLE"; // Eagle (2 under)
    if (difference === -1) return "BIRDIE"; // Birdie (1 under)
    if (difference === 0) return "PAR"; // Par
    if (difference === 1) return "BOGEY"; // Bogey (1 over)
    if (difference === 2) return "DOUBLE"; // Double bogey (2 over)
    if (difference === 3) return "TRIPLE"; // Triple bogey (3 over)
    if (difference === 4) return "QUAD"; // Quadruple bogey (4 over)
    if (difference >= 5) return "OTHER"; // More than quad bogey

    return "";
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
      {/* Row 1: 1, 2, 3 */}
      <div className="grid grid-cols-3 gap-1 mb-1">
        {[1, 2, 3].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberPress(num)}
            className="h-14 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-lg text-xl font-bold text-blue-900 transition-colors touch-manipulation flex flex-col items-center justify-center"
          >
            <span>{num}</span>
            <span className="text-xs font-semibold uppercase mt-0.5 leading-none">
              {getScoreLabel(num)}
            </span>
          </button>
        ))}
      </div>

      {/* Row 2: 4, 5, 6 */}
      <div className="grid grid-cols-3 gap-1 mb-1">
        {[4, 5, 6].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberPress(num)}
            className="h-14 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-lg text-xl font-bold text-blue-900 transition-colors touch-manipulation flex flex-col items-center justify-center"
          >
            <span>{num}</span>
            <span className="text-xs font-semibold uppercase mt-0.5 leading-none">
              {getScoreLabel(num)}
            </span>
          </button>
        ))}
      </div>

      {/* Row 3: 7, 8, 9+ */}
      <div className="grid grid-cols-3 gap-1 mb-1">
        {[7, 8].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberPress(num)}
            className="h-14 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-lg text-xl font-bold text-gray-900 transition-colors touch-manipulation flex flex-col items-center justify-center"
          >
            <span>{num}</span>
            <span className="text-xs font-semibold uppercase mt-0.5 leading-none">
              {getScoreLabel(num)}
            </span>
          </button>
        ))}
        <button
          onClick={() => handleSpecialPress("more")}
          className="h-14 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-lg text-xl font-bold text-gray-900 transition-colors touch-manipulation flex flex-col items-center justify-center"
        >
          <span>9+</span>
          <span className="text-xs font-semibold uppercase mt-0.5 leading-none">
            {getScoreLabel(9)}
          </span>
        </button>
      </div>

      {/* Row 4: -, 0 */}
      <div className="grid grid-cols-2 gap-1">
        <button
          onClick={() => handleSpecialPress("clear")}
          className="h-14 bg-red-50 hover:bg-red-100 active:bg-red-200 rounded-lg text-xl font-bold text-red-900 transition-colors touch-manipulation flex flex-col items-center justify-center"
        >
          <span>−</span>
          <span className="text-xs font-semibold uppercase mt-0.5 leading-none">
            GAVE UP
          </span>
        </button>
        <button
          onClick={() => handleSpecialPress("unreported")}
          className="h-14 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-lg text-xl font-bold text-gray-900 transition-colors touch-manipulation flex flex-col items-center justify-center"
        >
          <span>0</span>
          <span className="text-xs font-semibold uppercase mt-0.5 leading-none">
            UNREPORTED
          </span>
        </button>
      </div>
    </div>
  );
}

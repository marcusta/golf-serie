import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface PlayerScore {
  participantId: string;
  participantName: string;
  participantType?: string;
  isMultiPlayer?: boolean;
  scores: number[];
}

interface TeeTimeGroup {
  id: string;
  players: PlayerScore[];
}

interface Course {
  id: string;
  name: string;
  holes: {
    number: number;
    par: number;
  }[];
}

interface CustomKeyboardProps {
  onNumberPress: (number: number) => void;
  onSpecialPress: (action: "more" | "clear" | "unreported") => void;
  onDismiss?: () => void;
  visible: boolean;
  holePar: number;
  currentHole?: number;
  teeTimeGroup?: TeeTimeGroup;
  course?: Course;
}

export function CustomKeyboard({
  onNumberPress,
  onSpecialPress,
  onDismiss,
  visible,
  holePar,
  currentHole,
}: CustomKeyboardProps) {
  const handleNumberPress = (number: number) => {
    onNumberPress(number);
  };

  const handleSpecialPress = (action: "more" | "clear" | "unreported") => {
    onSpecialPress(action);
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
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
        "fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 transition-transform duration-300 ease-in-out z-50",
        visible ? "translate-y-0" : "translate-y-full",
        "shadow-lg rounded-t-xl"
      )}
    >
      {/* Current Hole Strip */}
      <div className="bg-blue-600 text-white px-4 py-2 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-bold">
            Hole {currentHole} | Par {holePar}
          </div>
        </div>
      </div>

      {/* Header with dismiss button */}
      <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Enter Score</span>
        </div>
        {onDismiss && (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              handleDismiss();
            }}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors touch-manipulation focus:outline-none"
            aria-label="Close keyboard"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        )}
      </div>

      {/* Keyboard buttons */}
      <div className="p-2">
        {/* Row 1: 1, 2, 3 */}
        <div className="grid grid-cols-3 gap-1 mb-1">
          {[1, 2, 3].map((num) => (
            <button
              key={num}
              onMouseDown={(e) => {
                e.preventDefault();
                handleNumberPress(num);
              }}
              className="h-14 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-lg text-xl font-bold text-blue-900 transition-colors touch-manipulation flex flex-col items-center justify-center focus:outline-none"
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
              onMouseDown={(e) => {
                e.preventDefault();
                handleNumberPress(num);
              }}
              className="h-14 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 rounded-lg text-xl font-bold text-blue-900 transition-colors touch-manipulation flex flex-col items-center justify-center focus:outline-none"
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
              onMouseDown={(e) => {
                e.preventDefault();
                handleNumberPress(num);
              }}
              className="h-14 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-lg text-xl font-bold text-gray-900 transition-colors touch-manipulation flex flex-col items-center justify-center focus:outline-none"
            >
              <span>{num}</span>
              <span className="text-xs font-semibold uppercase mt-0.5 leading-none">
                {getScoreLabel(num)}
              </span>
            </button>
          ))}
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              handleSpecialPress("more");
            }}
            className="h-14 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-lg text-xl font-bold text-gray-900 transition-colors touch-manipulation flex flex-col items-center justify-center focus:outline-none"
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
            onMouseDown={(e) => {
              e.preventDefault();
              handleSpecialPress("clear");
            }}
            className="h-14 bg-red-50 hover:bg-red-100 active:bg-red-200 rounded-lg text-xl font-bold text-red-900 transition-colors touch-manipulation flex flex-col items-center justify-center focus:outline-none"
          >
            <span>−</span>
            <span className="text-xs font-semibold uppercase mt-0.5 leading-none">
              GAVE UP
            </span>
          </button>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              handleSpecialPress("unreported");
            }}
            className="h-14 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 rounded-lg text-xl font-bold text-gray-900 transition-colors touch-manipulation flex flex-col items-center justify-center focus:outline-none"
          >
            <span>0</span>
            <span className="text-xs font-semibold uppercase mt-0.5 leading-none">
              UNREPORTED
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

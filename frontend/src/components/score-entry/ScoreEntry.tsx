import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { CustomKeyboard } from "./CustomKeyboard";
import { FullScorecardModal } from "./FullScorecardModal";
import { ChevronLeft, ChevronRight, BarChart3, Users } from "lucide-react";
import { useNativeKeyboard } from "./useNativeKeyboard";

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

interface ScoreEntryProps {
  teeTimeGroup: TeeTimeGroup;
  course: Course;
  onScoreUpdate: (participantId: string, hole: number, score: number) => void;
  onComplete: () => void;
}

export function ScoreEntry({
  teeTimeGroup,
  course,
  onScoreUpdate,
  onComplete,
}: ScoreEntryProps) {
  const [currentHole, setCurrentHole] = useState(1);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [fullScorecardVisible, setFullScorecardVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const {
    isVisible: nativeKeyboardVisible,
    inputValue,
    show: showNativeKeyboard,
    hide: hideNativeKeyboard,
    handleSubmit: handleNativeKeyboardSubmit,
    handleInputChange,
  } = useNativeKeyboard({
    onScoreSubmit: (score) => {
      if (currentPlayer) {
        onScoreUpdate(currentPlayer.participantId, currentHole, score);
        moveToNextPlayer();
      }
    },
    onCancel: () => {
      setKeyboardVisible(true);
    },
  });

  const currentPlayer = teeTimeGroup.players[currentPlayerIndex];
  const currentHoleData = course.holes.find((h) => h.number === currentHole);

  const moveToNextPlayer = () => {
    if (currentPlayerIndex < teeTimeGroup.players.length - 1) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
    } else {
      // Last player on this hole
      if (currentHole < 18) {
        setCurrentHole(currentHole + 1);
        setCurrentPlayerIndex(0);
      } else {
        onComplete();
      }
    }
  };

  const handleScoreFieldClick = (playerIndex: number) => {
    setCurrentPlayerIndex(playerIndex);
    setKeyboardVisible(true);
    setIsEditing(true);
  };

  const handleNumberPress = (number: number) => {
    if (!currentPlayer) return;

    onScoreUpdate(currentPlayer.participantId, currentHole, number);
    moveToNextPlayer();
  };

  const handleSpecialPress = (action: "more" | "clear") => {
    if (action === "more") {
      setKeyboardVisible(false);
      showNativeKeyboard();
    }
  };

  const handlePreviousHole = () => {
    if (currentHole > 1) {
      setCurrentHole(currentHole - 1);
      setCurrentPlayerIndex(0);
    }
  };

  const handleNextHole = () => {
    if (currentHole < 18) {
      setCurrentHole(currentHole + 1);
      setCurrentPlayerIndex(0);
    }
  };

  const abbreviateName = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[1].charAt(0)}.`;
    }
    return name.length > 20 ? `${name.substring(0, 20)}...` : name;
  };

  // Close keyboard when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isEditing && !(event.target as HTMLElement).closest(".score-entry")) {
        setKeyboardVisible(false);
        setIsEditing(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing]);

  return (
    <div className="score-entry flex flex-col h-screen-mobile bg-gray-50">
      {/* Ultra-Compact Header - Max 50px */}
      <div
        className="bg-white shadow-sm border-b border-gray-200 flex-shrink-0"
        style={{ height: "50px" }}
      >
        <div className="flex items-center justify-between h-full px-3">
          <button
            onClick={handlePreviousHole}
            disabled={currentHole === 1}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 text-center">
            <span className="text-sm font-semibold text-gray-900">
              {course.name} • Hole {currentHole} (Par {currentHoleData?.par})
            </span>
          </div>

          <button
            onClick={handleNextHole}
            disabled={currentHole === 18}
            className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Maximized Player Area - 60% of remaining space */}
      <div className="flex-1 overflow-y-auto" style={{ minHeight: "60%" }}>
        <div className="p-3 space-y-2">
          {teeTimeGroup.players.map((player, index) => {
            const isCurrentPlayer = index === currentPlayerIndex;
            const score = player.scores[currentHole - 1] || null;
            const hasScore = score !== null;

            return (
              <div
                key={player.participantId}
                className={cn(
                  "bg-white rounded-lg p-4 flex items-center justify-between transition-all shadow-sm",
                  isCurrentPlayer && "ring-2 ring-blue-500 bg-blue-50 shadow-md"
                )}
                style={{ minHeight: "60px" }}
              >
                <div className="flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "font-medium text-gray-900",
                        isCurrentPlayer && "text-blue-900 font-semibold"
                      )}
                    >
                      {abbreviateName(player.participantName)}
                    </div>
                    {player.isMultiPlayer && (
                      <div className="relative group">
                        <Users className="w-3 h-3 text-blue-500" />
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                          Multi-player format
                        </div>
                      </div>
                    )}
                  </div>
                  {hasScore && (
                    <div className="text-xs text-green-600 mt-1">
                      ✓ Score entered
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleScoreFieldClick(index)}
                  className={cn(
                    "w-14 h-12 rounded-lg text-center font-bold transition-all touch-manipulation",
                    "border-2 text-lg flex items-center justify-center",
                    hasScore
                      ? "bg-white text-gray-900 border-green-200"
                      : "bg-gray-50 text-gray-400 border-gray-200",
                    isCurrentPlayer && "ring-2 ring-blue-400 ring-offset-1"
                  )}
                >
                  {hasScore ? score : "−"}
                </button>
              </div>
            );
          })}

          {/* Full Scorecard Access Button */}
          <button
            onClick={() => setFullScorecardVisible(true)}
            className="w-full bg-gray-100 hover:bg-gray-200 rounded-lg p-4 flex items-center justify-center gap-2 transition-colors mt-4 touch-manipulation"
          >
            <BarChart3 className="w-5 h-5 text-gray-600" />
            <span className="font-medium text-gray-700">
              View Full Scorecard
            </span>
          </button>
        </div>
      </div>

      {/* Compact Custom Keyboard - 40% of remaining space */}
      <CustomKeyboard
        visible={keyboardVisible}
        onNumberPress={handleNumberPress}
        onSpecialPress={handleSpecialPress}
      />

      {/* Full Scorecard Modal */}
      <FullScorecardModal
        visible={fullScorecardVisible}
        teeTimeGroup={teeTimeGroup}
        course={course}
        currentHole={currentHole}
        onClose={() => setFullScorecardVisible(false)}
        onContinueEntry={(hole) => {
          setCurrentHole(hole);
          setCurrentPlayerIndex(0);
          setFullScorecardVisible(false);
        }}
      />

      {/* Native Keyboard Modal */}
      {nativeKeyboardVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">
              Enter Score (12 or higher)
            </h3>
            <input
              type="number"
              value={inputValue}
              onChange={handleInputChange}
              className="w-full p-3 border rounded-lg mb-4 text-2xl text-center"
              placeholder="Enter score"
              autoFocus
            />
            <div className="flex space-x-2">
              <button
                onClick={hideNativeKeyboard}
                className="flex-1 p-3 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleNativeKeyboardSubmit}
                className="flex-1 p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

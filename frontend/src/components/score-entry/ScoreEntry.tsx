import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { CustomKeyboard } from "./CustomKeyboard";
import { FullScorecardModal } from "./FullScorecardModal";
import { BarChart3, Users } from "lucide-react";
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
  currentHole?: number;
  onHoleChange?: (hole: number) => void;
  syncStatus?: {
    pendingCount: number;
    lastSyncTime: number;
    isOnline: boolean;
    hasConnectivityIssues: boolean;
  };
}

export function ScoreEntry({
  teeTimeGroup,
  course,
  onScoreUpdate,
  onComplete,
  currentHole: externalCurrentHole,
  onHoleChange,
  syncStatus,
}: ScoreEntryProps) {
  // Helper function to find the latest incomplete hole
  const findLatestIncompleteHole = (): number => {
    for (let holeIndex = 17; holeIndex >= 0; holeIndex--) {
      const hasAnyPlayerWithScore = teeTimeGroup.players.some((player) => {
        const score = player.scores[holeIndex];
        return score && score > 0; // Has valid score
      });

      if (hasAnyPlayerWithScore) {
        // Found the latest hole with some scores, check if it's complete
        const allPlayersHaveScores = teeTimeGroup.players.every((player) => {
          const score = player.scores[holeIndex];
          return score && score !== 0; // All players have scores (including -1 for gave up)
        });

        if (!allPlayersHaveScores) {
          return holeIndex + 1; // Return 1-based hole number
        } else if (holeIndex < 17) {
          return holeIndex + 2; // Move to next hole
        }
      }
    }

    return 1; // Default to hole 1 if no scores found
  };

  const [internalCurrentHole, setInternalCurrentHole] = useState(() =>
    findLatestIncompleteHole()
  );

  // Use external hole if provided, otherwise use internal
  const currentHole =
    externalCurrentHole !== undefined
      ? externalCurrentHole
      : internalCurrentHole;

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

  // Calculate player's current score relative to par
  const calculatePlayerToPar = (player: PlayerScore): number => {
    let totalShots = 0;
    let totalPar = 0;

    for (let i = 0; i < Math.min(currentHole, 18); i++) {
      const score = player.scores[i];
      if (score && score > 0) {
        totalShots += score;
        totalPar += course.holes[i].par;
      }
    }

    return totalShots - totalPar;
  };

  // Format +/- to par display
  const formatToPar = (toPar: number): string => {
    if (toPar === 0) return "E";
    return toPar > 0 ? `+${toPar}` : `${toPar}`;
  };

  // Get color for +/- to par
  const getToParColor = (toPar: number): string => {
    if (toPar < 0) return "text-green-600";
    if (toPar > 0) return "text-red-600";
    return "text-gray-600";
  };

  const moveToNextPlayer = () => {
    if (currentPlayerIndex < teeTimeGroup.players.length - 1) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
    } else {
      // Last player on this hole
      if (currentHole < 18) {
        const nextHole = currentHole + 1;
        if (onHoleChange) {
          onHoleChange(nextHole);
        } else {
          setInternalCurrentHole(nextHole);
        }
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

  const handleSpecialPress = (action: "more" | "clear" | "unreported") => {
    if (action === "more") {
      setKeyboardVisible(false);
      showNativeKeyboard();
    } else if (action === "clear") {
      if (!currentPlayer) return;
      // Set score to -1 for "gave up on hole"
      onScoreUpdate(currentPlayer.participantId, currentHole, -1);
      moveToNextPlayer();
    } else if (action === "unreported") {
      if (!currentPlayer) return;
      // Set score to 0 for unreported
      onScoreUpdate(currentPlayer.participantId, currentHole, 0);
      moveToNextPlayer();
    }
  };

  const handleKeyboardDismiss = () => {
    setKeyboardVisible(false);
    setIsEditing(false);
  };

  const abbreviateName = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[1].charAt(0)}.`;
    }
    return name.length > 20 ? `${name.substring(0, 20)}...` : name;
  };

  // Helper function to format score display
  const formatScoreDisplay = (score: number): string => {
    if (score === -1) return "−"; // Gave up
    if (score === 0) return "NR"; // Not reported
    return score.toString(); // Actual score
  };

  // Helper function to check if a score has been entered
  const hasValidScore = (score: number): boolean => {
    return score > 0;
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
      {/* Sync Status Indicator */}
      {syncStatus &&
        (syncStatus.pendingCount > 0 || syncStatus.hasConnectivityIssues) && (
          <div
            className={cn(
              "px-3 py-2 text-center text-xs font-medium",
              syncStatus.hasConnectivityIssues
                ? "bg-red-100 text-red-700 border-b border-red-200"
                : "bg-yellow-100 text-yellow-700 border-b border-yellow-200"
            )}
          >
            {syncStatus.hasConnectivityIssues ? (
              <span>
                ⚠️ Connection issues - {syncStatus.pendingCount} score(s)
                pending
              </span>
            ) : (
              <span>📡 Saving {syncStatus.pendingCount} score(s)...</span>
            )}
          </div>
        )}

      {/* Maximized Player Area - 60% of remaining space */}
      <div className="flex-1 overflow-y-auto" style={{ minHeight: "60%" }}>
        <div className="p-3 space-y-2">
          {teeTimeGroup.players.map((player, index) => {
            const isCurrentPlayer = index === currentPlayerIndex;
            const score = player.scores[currentHole - 1] ?? 0;
            const hasScore = hasValidScore(score);
            const toPar = calculatePlayerToPar(player);

            return (
              <div
                key={player.participantId}
                className={cn(
                  "bg-white rounded-lg p-4 flex items-center justify-between transition-all shadow-sm",
                  isCurrentPlayer && "ring-2 ring-blue-500 bg-blue-50 shadow-md"
                )}
                style={{ minHeight: "70px" }}
              >
                <div className="flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <div>
                      <div
                        className={cn(
                          "font-medium text-gray-900",
                          isCurrentPlayer && "text-blue-900 font-semibold"
                        )}
                      >
                        {abbreviateName(player.participantName)}
                      </div>
                      {player.participantType && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {player.participantType}
                        </div>
                      )}
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
                  <div className="flex items-center gap-4 mt-1">
                    {hasScore && (
                      <div
                        className={cn(
                          "text-xs",
                          syncStatus?.hasConnectivityIssues && hasScore
                            ? "text-yellow-600"
                            : "text-green-600"
                        )}
                      >
                        {syncStatus?.hasConnectivityIssues && hasScore
                          ? "⚠️ Score saved locally"
                          : "✓ Score entered"}
                      </div>
                    )}
                    <div
                      className={cn(
                        "text-xs font-medium",
                        getToParColor(toPar)
                      )}
                    >
                      {formatToPar(toPar)}
                    </div>
                  </div>
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
                  {formatScoreDisplay(score)}
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
        holePar={currentHoleData?.par || 4}
        currentHole={currentHole}
        onDismiss={handleKeyboardDismiss}
      />

      {/* Full Scorecard Modal */}
      <FullScorecardModal
        visible={fullScorecardVisible}
        teeTimeGroup={teeTimeGroup}
        course={course}
        currentHole={currentHole}
        onClose={() => setFullScorecardVisible(false)}
        onContinueEntry={(hole) => {
          setInternalCurrentHole(hole);
          setCurrentPlayerIndex(0);
          setFullScorecardVisible(false);
        }}
      />

      {/* Native Keyboard Modal */}
      {nativeKeyboardVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">
              Enter Score (9 or higher)
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

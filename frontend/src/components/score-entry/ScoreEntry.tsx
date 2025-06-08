import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { CustomKeyboard } from "./CustomKeyboard";
import {
  formatToPar,
  getToParColor,
  formatScoreEntryDisplay,
  hasValidScore,
} from "../../utils/scoreCalculations";
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
  const [showingConfirmation, setShowingConfirmation] = useState(false);

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
  const previousHoleData =
    currentHole > 1
      ? course.holes.find((h) => h.number === currentHole - 1)
      : null;

  // Calculate player's current score relative to par
  const calculatePlayerToPar = (player: PlayerScore): number | null => {
    let totalShots = 0;
    let totalPar = 0;

    for (let i = 0; i < course.holes.length; i++) {
      const score = player.scores[i];

      if (score === -1) {
        // Player gave up on a hole – result is invalid
        return null;
      }

      if (score && score > 0) {
        totalShots += score;
        totalPar += course.holes[i].par;
      }
      // if score is 0 or undefined/null, just skip
    }

    return totalPar === 0 ? null : totalShots - totalPar;
  };

  const moveToNextPlayer = () => {
    if (currentPlayerIndex < teeTimeGroup.players.length - 1) {
      setCurrentPlayerIndex(currentPlayerIndex + 1);
    } else {
      // Last player on this hole - show confirmation briefly
      setShowingConfirmation(true);

      setTimeout(() => {
        setShowingConfirmation(false);

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
      }, 800); // Show confirmation for shorter time
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
      // For two-part names, use different strategies based on length
      const firstName = parts[0];
      const lastName = parts[1];

      // If total length is reasonable, keep both
      if (name.length <= 14) {
        return name;
      }

      // If first name is short, use first name + last initial
      if (firstName.length <= 8) {
        return `${firstName} ${lastName.charAt(0)}.`;
      }

      // If first name is long, use first initial + last name
      if (lastName.length <= 8) {
        return `${firstName.charAt(0)}. ${lastName}`;
      }

      // Both names are long, use initials
      return `${firstName.charAt(0)}. ${lastName.charAt(0)}.`;
    }

    // Single name - truncate if too long
    return name.length > 12 ? `${name.substring(0, 11)}...` : name;
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
    <div className="score-entry flex flex-col h-screen-mobile bg-scorecard relative">
      {/* Sync Status Indicator */}
      {syncStatus &&
        (syncStatus.pendingCount > 0 || syncStatus.hasConnectivityIssues) && (
          <div
            className={cn(
              "px-3 py-2 text-center text-xs font-medium",
              syncStatus.hasConnectivityIssues
                ? "bg-flag text-scorecard border-b border-flag"
                : "bg-coral text-scorecard border-b border-coral"
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

      {/* Compact Green Score Header with TapScore Branding */}
      <div className="bg-turf text-scorecard px-4 py-2 border-b border-turf">
        <div className="flex items-center justify-end gap-4 pr-6">
          {/* Previous Hole Column (if exists) */}
          {previousHoleData && (
            <div className="text-center w-[60px]">
              <div className="text-2xl font-bold font-display">
                {currentHole - 1}
              </div>
              <div className="text-xs font-medium opacity-90 font-primary">
                Par {previousHoleData.par}
              </div>
            </div>
          )}

          {/* Current Hole Column */}
          <div className="text-center w-[60px]">
            <div className="text-2xl font-bold font-display">{currentHole}</div>
            <div className="text-xs font-medium opacity-90 font-primary">
              Par {currentHoleData?.par}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Message with TapScore Colors */}
      {showingConfirmation && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-turf text-scorecard px-6 py-4 rounded-xl shadow-lg z-30 animate-pulse">
          <div className="text-center">
            <div className="text-lg font-bold font-display">
              ✓ Hole {currentHole} Complete!
            </div>
            <div className="text-sm opacity-90 font-primary">
              Moving to hole {currentHole + 1}...
            </div>
          </div>
        </div>
      )}

      {/* Player Area with Aligned Score Columns */}
      <div className="flex-1 overflow-y-auto" style={{ minHeight: "60%" }}>
        <div className="p-3 space-y-2">
          {teeTimeGroup.players.map((player, index) => {
            const isCurrentPlayer = index === currentPlayerIndex;
            const currentScore = player.scores[currentHole - 1] ?? 0;
            const previousScore = previousHoleData
              ? player.scores[currentHole - 2] ?? 0
              : null;
            const hasCurrentScore = hasValidScore(currentScore);
            const toPar = calculatePlayerToPar(player);

            return (
              <div
                key={player.participantId}
                className={cn(
                  "bg-scorecard rounded-xl p-4 transition-all shadow-sm border",
                  isCurrentPlayer
                    ? "ring-2 ring-coral bg-rough bg-opacity-20 shadow-md border-coral"
                    : "border-soft-grey"
                )}
                style={{ minHeight: "70px" }}
              >
                <div className="flex items-center justify-between">
                  {/* Player Info */}
                  <div className="flex-1 pr-3">
                    <div className="flex items-center gap-2">
                      <div>
                        <div
                          className={cn(
                            "font-medium font-primary text-charcoal",
                            isCurrentPlayer && "text-fairway font-semibold"
                          )}
                        >
                          {abbreviateName(player.participantName)}
                        </div>
                        {player.participantType && (
                          <div className="text-xs text-soft-grey mt-0.5 font-primary">
                            {player.participantType}
                          </div>
                        )}
                      </div>
                      {player.isMultiPlayer && (
                        <div className="relative group">
                          <Users className="w-3 h-3 text-turf" />
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-fairway text-scorecard rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                            Multi-player format
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      {hasCurrentScore && (
                        <div
                          className={cn(
                            "text-xs font-primary",
                            syncStatus?.hasConnectivityIssues && hasCurrentScore
                              ? "text-coral"
                              : "text-turf"
                          )}
                        >
                          {syncStatus?.hasConnectivityIssues && hasCurrentScore
                            ? "⚠️ Score saved locally"
                            : "✓ "}
                        </div>
                      )}
                      <div
                        className={cn(
                          "text-xs font-medium font-primary",
                          toPar !== null
                            ? getToParColor(toPar)
                            : "text-soft-grey"
                        )}
                      >
                        {toPar !== null ? formatToPar(toPar) : "-"}
                      </div>
                    </div>
                  </div>

                  {/* Score Columns - Aligned with Header */}
                  <div className="flex items-center gap-0 pr-6 ml-2">
                    {/* Previous Hole Score */}
                    {previousHoleData && (
                      <div className="w-[60px] text-center">
                        <div className="text-lg font-bold text-charcoal font-display">
                          {previousScore !== null
                            ? formatScoreEntryDisplay(previousScore)
                            : "-"}
                        </div>
                      </div>
                    )}

                    {/* Current Hole Score */}
                    <div className="w-[60px] text-center ml-2 left-4 relative">
                      <button
                        onClick={() => handleScoreFieldClick(index)}
                        className={cn(
                          "w-12 h-12 rounded-xl text-center font-bold transition-all touch-manipulation font-display",
                          "border-2 text-lg flex items-center justify-center",
                          hasCurrentScore
                            ? "bg-scorecard text-charcoal border-turf"
                            : "bg-rough bg-opacity-30 text-soft-grey border-soft-grey",
                          isCurrentPlayer &&
                            "ring-2 ring-coral ring-offset-1 focus:bg-rough focus:bg-opacity-50"
                        )}
                      >
                        {formatScoreEntryDisplay(currentScore)}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Full Scorecard Access Button with TapScore Styling */}
          <button
            onClick={() => setFullScorecardVisible(true)}
            className="w-full bg-rough bg-opacity-30 hover:bg-rough hover:bg-opacity-50 rounded-xl p-4 flex items-center justify-center gap-2 transition-colors mt-4 touch-manipulation border border-soft-grey"
          >
            <BarChart3 className="w-5 h-5 text-turf" />
            <span className="font-medium text-fairway font-primary">
              View Full Scorecard
            </span>
          </button>
        </div>
      </div>

      {/* Enhanced Custom Keyboard with Previous Hole Display */}
      <CustomKeyboard
        visible={keyboardVisible}
        onNumberPress={handleNumberPress}
        onSpecialPress={handleSpecialPress}
        holePar={currentHoleData?.par || 4}
        currentHole={currentHole}
        onDismiss={handleKeyboardDismiss}
        teeTimeGroup={teeTimeGroup}
        course={course}
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

      {/* Native Keyboard Modal with TapScore Styling */}
      {nativeKeyboardVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-scorecard rounded-xl p-6 w-full max-w-sm border border-soft-grey">
            <h3 className="text-lg font-bold mb-4 font-display text-fairway">
              Enter Score (9 or higher)
            </h3>
            <input
              type="number"
              value={inputValue}
              onChange={handleInputChange}
              className="w-full p-3 border-2 border-soft-grey rounded-xl mb-4 text-2xl text-center font-display text-charcoal focus:border-turf focus:bg-rough focus:bg-opacity-20 transition-colors"
              placeholder="Enter score"
              autoFocus
            />
            <div className="flex space-x-2">
              <button
                onClick={hideNativeKeyboard}
                className="flex-1 p-3 bg-rough bg-opacity-30 rounded-xl hover:bg-rough hover:bg-opacity-50 font-medium font-primary text-fairway transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleNativeKeyboardSubmit}
                className="flex-1 p-3 bg-turf text-scorecard rounded-xl hover:bg-fairway font-medium font-primary transition-colors"
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

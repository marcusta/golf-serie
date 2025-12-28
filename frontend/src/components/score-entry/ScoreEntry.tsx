import { useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ScoreInputModal } from "./ScoreInputModal";
import {
  formatToPar,
  getToParColor,
  formatScoreEntryDisplay,
} from "../../utils/scoreCalculations";
import { FullScorecardModal, type PlayerNetScoringData } from "./FullScorecardModal";
import { BarChart3, Pencil } from "lucide-react";
import { useNativeKeyboard } from "./useNativeKeyboard";

interface PlayerScore {
  participantId: string;
  participantName: string;
  participantType?: string;
  isMultiPlayer?: boolean;
  scores: number[];
  playerNames?: string | null;
  playerId?: number | null;
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
  onPlayerNameClick?: (
    participantId: string,
    currentName: string | null,
    positionName: string
  ) => void;
  isReadyToFinalize?: boolean;
  onFinalize?: () => void;
  isLocked?: boolean;
  competition?: {
    id: number;
    series_id?: number;
    series_name?: string;
    tour_id?: number;
  };
  /** When true, hides team terminology (team name, position) in individual tour competitions */
  isTourCompetition?: boolean;
  /** Net scoring data for tour competitions with handicap scoring */
  netScoringData?: Map<string, PlayerNetScoringData>;
}

export function ScoreEntry({
  teeTimeGroup,
  course,
  onScoreUpdate,
  currentHole: externalCurrentHole,
  onHoleChange,
  syncStatus,
  onPlayerNameClick,
  isReadyToFinalize = false,
  onFinalize,
  isLocked = false,
  competition,
  isTourCompetition = false,
  netScoringData,
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

  const navigate = useNavigate();
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
    // Note: The current player just entered a score, but state hasn't updated yet.
    // So we skip the current player when looking for players without scores.

    // Find the next player without a score on this hole
    // First, check players after current index
    for (let i = currentPlayerIndex + 1; i < teeTimeGroup.players.length; i++) {
      const score = teeTimeGroup.players[i].scores[currentHole - 1];
      if (score === undefined || score === 0) {
        setCurrentPlayerIndex(i);
        return;
      }
    }

    // Then check players before current index (wrap around, but skip current player)
    for (let i = 0; i < currentPlayerIndex; i++) {
      const score = teeTimeGroup.players[i].scores[currentHole - 1];
      if (score === undefined || score === 0) {
        setCurrentPlayerIndex(i);
        return;
      }
    }

    // If we get here, all OTHER players have scores, and current player just entered theirs.
    // So all players now have scores - advance to next hole and close modal.
    setShowingConfirmation(true);
    setKeyboardVisible(false);
    setIsEditing(false);

    setTimeout(() => {
      setShowingConfirmation(false);

      const nextHole = currentHole < 18 ? currentHole + 1 : 1;
      if (onHoleChange) {
        onHoleChange(nextHole);
      } else {
        setInternalCurrentHole(nextHole);
      }
      setCurrentPlayerIndex(0);
    }, 800);
  };

  const handleScoreFieldClick = (playerIndex: number) => {
    if (isLocked) return; // Only prevent interaction when actually locked
    setCurrentPlayerIndex(playerIndex);
    setKeyboardVisible(true);
    setIsEditing(true);
  };

  const handleNumberPress = (number: number) => {
    if (isLocked) return; // Only prevent interaction when actually locked
    if (!currentPlayer) return;

    onScoreUpdate(currentPlayer.participantId, currentHole, number);
    moveToNextPlayer();
  };

  const handleSpecialPress = (action: "more" | "clear" | "unreported") => {
    if (isLocked) return; // Only prevent interaction when actually locked
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

  const handlePlayerNameClick = (player: PlayerScore) => {
    if (onPlayerNameClick) {
      onPlayerNameClick(
        player.participantId,
        player.playerNames || null,
        player.participantType || ""
      );
    }
  };

  const abbreviateName = (name: string) => {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      // For two-part names, use different strategies based on length
      const firstName = parts[0];
      const lastName = parts[1];

      // If total length is reasonable, keep both
      if (name.length <= 22) {
        return name;
      }

      // If first name is short, use first name + last initial
      if (firstName.length <= 10) {
        return `${firstName} ${lastName.charAt(0)}.`;
      }

      // If first name is long, use first initial + last name
      if (lastName.length <= 10) {
        return `${firstName.charAt(0)}. ${lastName}`;
      }

      // Both names are long, use initials
      return `${firstName.charAt(0)}. ${lastName.charAt(0)}.`;
    }

    // Single name - truncate if too long
    return name.length > 22 ? `${name.substring(0, 21)}...` : name;
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
      {/* Confirmation Message with TapScore Colors */}
      {showingConfirmation && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-turf text-scorecard px-6 py-4 rounded-xl shadow-lg z-30 animate-pulse">
          <div className="text-center">
            <div className="text-lg font-bold font-display">
              ✓ Hole {currentHole} Complete!
            </div>
            <div className="text-sm opacity-90 font-primary">
              Moving to hole {currentHole < 18 ? currentHole + 1 : 1}...
            </div>
          </div>
        </div>
      )}
      {/* Player Area with Aligned Score Columns */}
      <div className="flex-1 overflow-y-auto" style={{ minHeight: "60%" }}>
        {/* Hole Header - full width bar */}
        <div className="bg-rough bg-opacity-30 px-4 py-2 border-b border-soft-grey border-l-4 border-l-transparent">
          <div className="flex items-center justify-end">
            <div className="flex items-center space-x-4">
              {/* Previous hole (only when on hole 2+) */}
              {currentHole > 1 && (
                <div className="text-center w-12">
                  <div className="text-lg font-bold text-fairway font-display">
                    {currentHole - 1}
                  </div>
                  <div className="text-xs text-fairway/70 font-primary">
                    Par{" "}
                    {course.holes.find((h) => h.number === currentHole - 1)
                      ?.par || 4}
                  </div>
                </div>
              )}

              {/* Current hole (always shown, rightmost) */}
              <div className="text-center w-12">
                <div className="text-lg font-bold text-fairway font-display">
                  {currentHole}
                </div>
                <div className="text-xs text-fairway/70 font-primary">
                  Par {currentHoleData?.par || 4}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="divide-y divide-soft-grey">
          {teeTimeGroup.players.map((player, index) => {
            const currentScore = player.scores[currentHole - 1] ?? 0;
            const previousScore =
              currentHole > 1 ? player.scores[currentHole - 2] ?? 0 : null;
            const toPar = calculatePlayerToPar(player);

            // Net scoring data for this player
            const playerNetData = netScoringData?.get(player.participantId);
            const strokesOnThisHole = playerNetData?.handicapStrokesPerHole?.[currentHole - 1] ?? 0;
            const courseHandicap = playerNetData?.courseHandicap;
            const netScore = currentScore > 0 ? currentScore - strokesOnThisHole : null;

            return (
              <div
                key={player.participantId}
                className="py-4 px-4 transition-colors hover:bg-gray-50/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    {/* Player name/position area - only editable for ad-hoc players (no playerId) */}
                    {player.playerId ? (
                      // Real account player - not editable
                      <div className="p-1 -m-1">
                        <h3 className="text-body-lg font-semibold text-charcoal font-display">
                          {player.playerNames ? abbreviateName(player.playerNames) : "Player"}
                        </h3>
                        {/* Only show team/position for series competitions, not tour */}
                        {!isTourCompetition && (
                          <p className="text-label-sm text-turf font-primary">
                            {player.participantName} {player.participantType}
                          </p>
                        )}
                      </div>
                    ) : (
                      // Ad-hoc player - tappable to edit name
                      <button
                        onClick={() => handlePlayerNameClick(player)}
                        className="text-left w-full hover:bg-rough/10 rounded-md p-1 -m-1 transition-colors"
                      >
                        {player.playerNames ? (
                          // Player has a name - show player name prominently
                          <>
                            <h3 className="text-body-lg font-semibold text-charcoal font-display">
                              {abbreviateName(player.playerNames)}
                            </h3>
                            {/* Only show team/position for series competitions, not tour */}
                            {!isTourCompetition && (
                              <p className="text-label-sm text-turf font-primary">
                                {player.participantName} {player.participantType}
                              </p>
                            )}
                          </>
                        ) : isTourCompetition ? (
                          // Tour competition without player name - just show prompt
                          <>
                            <h3 className="text-body-lg font-semibold text-charcoal font-display">
                              Player
                            </h3>
                            <div className="flex items-center gap-1 text-label-sm text-soft-grey font-primary">
                              <Pencil className="w-3 h-3" />
                              <span>+ Add player name</span>
                            </div>
                          </>
                        ) : (
                          // Series competition - show team name + position prominently
                          <>
                            <h3 className="text-body-lg font-semibold text-charcoal font-display">
                              {player.participantName} {player.participantType}
                            </h3>
                            <div className="flex items-center gap-1 text-label-sm text-soft-grey font-primary">
                              <Pencil className="w-3 h-3" />
                              <span>+ Add player name</span>
                            </div>
                          </>
                        )}
                      </button>
                    )}

                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={cn(
                          "text-label-sm font-medium font-primary",
                          toPar !== null ? getToParColor(toPar) : "text-soft-grey"
                        )}
                      >
                        {toPar !== null ? formatToPar(toPar) : "-"}
                      </span>
                      {/* Handicap badge when net scoring enabled */}
                      {courseHandicap !== undefined && (
                        <span className="text-xs px-1.5 py-0.5 bg-soft-grey/20 text-charcoal/70 rounded font-primary">
                          HCP {courseHandicap}
                        </span>
                      )}
                      {/* Stroke indicator dot for this hole */}
                      {strokesOnThisHole > 0 && (
                        <span className="flex items-center gap-0.5">
                          {Array.from({ length: strokesOnThisHole }).map((_, i) => (
                            <span
                              key={i}
                              className="w-2 h-2 bg-coral rounded-full"
                              title={`Receives ${strokesOnThisHole} stroke${strokesOnThisHole > 1 ? 's' : ''} on this hole`}
                            />
                          ))}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Previous hole score (only when on hole 2+) */}
                    {currentHole > 1 && (
                      <div className="text-center w-12 relative">
                        <div className={cn(
                          "text-xl font-bold font-display inline-block relative",
                          previousScore && previousScore > 0 ? "text-fairway" : "text-charcoal/40"
                        )}>
                          {formatScoreEntryDisplay(previousScore || 0)}
                          {/* Subscript net score for previous hole - only when score > 0 */}
                          {netScoringData && previousScore !== null && previousScore > 0 ? (() => {
                            const prevHoleStrokes = playerNetData?.handicapStrokesPerHole?.[currentHole - 2] ?? 0;
                            const prevNetScore = previousScore - prevHoleStrokes;
                            return (
                              <span className="absolute -bottom-0.5 -right-2.5 text-xs font-medium text-charcoal/60 font-primary">
                                {prevNetScore}
                              </span>
                            );
                          })() : null}
                        </div>
                      </div>
                    )}

                    {/* Current hole score - ALWAYS in a circle */}
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => handleScoreFieldClick(index)}
                        disabled={isLocked}
                        className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center touch-manipulation transition-colors relative",
                          isLocked
                            ? "bg-soft-grey/30 cursor-not-allowed"
                            : "bg-turf/10 hover:bg-turf/20 active:bg-turf/30"
                        )}
                      >
                        {/* Main score display */}
                        <span className={cn(
                          "text-xl font-bold font-display",
                          currentScore > 0 ? "text-fairway" : "text-charcoal/40"
                        )}>
                          {currentScore > 0
                            ? currentScore
                            : currentScore === -1
                            ? "−"
                            : netScoringData && strokesOnThisHole > 0
                            ? `-${strokesOnThisHole}`
                            : "0"}
                        </span>
                        {/* Subscript net score - only show when score entered */}
                        {netScoringData && currentScore > 0 && (
                          <span className="absolute bottom-1 right-1.5 text-xs font-medium text-charcoal/60 font-primary">
                            {netScore}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="px-4 py-6">
          {/* View Full Scorecard Button - Only show if not ready to finalize */}
          {!isReadyToFinalize && (
            <button
              onClick={() => setFullScorecardVisible(true)}
              className="w-full bg-turf hover:bg-fairway text-scorecard font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2 font-primary"
            >
              <BarChart3 size={20} />
              <span>View Full Scorecard</span>
            </button>
          )}

          {isReadyToFinalize && !isLocked && (
            <div className="flex gap-3">
              <button
                onClick={() => setFullScorecardVisible(true)}
                className="flex-1 bg-turf hover:bg-fairway text-scorecard font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 font-primary"
              >
                <span>Review Scorecard</span>
              </button>
              <button
                onClick={onFinalize}
                className="flex-1 bg-coral hover:bg-orange-600 text-scorecard font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2 font-primary"
              >
                <span>Complete Round</span>
              </button>
            </div>
          )}
          {/* Locked State Overlay - Success state with navigation */}
          {isLocked && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-scorecard rounded-2xl shadow-xl max-w-sm w-full mx-4">
                <div className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-6 bg-turf bg-opacity-20 rounded-full flex items-center justify-center">
                    <span className="text-turf text-3xl">✓</span>
                  </div>
                  <h3 className="text-2xl font-bold mb-4 font-display text-fairway">
                    Round Complete!
                  </h3>
                  <p className="text-charcoal font-primary mb-8 leading-relaxed">
                    Your round has been successfully finalized and locked. All
                    scores have been submitted and the results are now official.
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        // Navigate to appropriate leaderboard based on series/non-series
                        const pathParts = window.location.pathname.split("/");
                        const competitionId =
                          pathParts[pathParts.indexOf("competitions") + 1];

                        if (competition?.series_id) {
                          // Series competition - go to team leaderboard
                          navigate({
                            to: `/player/competitions/${competitionId}`,
                            hash: "teamresult",
                          });
                        } else {
                          // Non-series competition - go to regular leaderboard
                          navigate({
                            to: `/player/competitions/${competitionId}`,
                            hash: "leaderboard",
                          });
                        }
                      }}
                      className="w-full bg-turf hover:bg-fairway text-scorecard font-semibold py-4 px-6 rounded-xl transition-colors font-primary"
                    >
                      View Leaderboard
                    </button>
                    <button
                      onClick={() => {
                        if (competition?.series_id) {
                          // Series competition - go to series landing page
                          navigate({
                            to: `/player/series/${competition.series_id}`,
                          });
                        } else {
                          // Non-series competition - go to app landing page
                          navigate({ to: "/player" });
                        }
                      }}
                      className="w-full bg-soft-grey bg-opacity-30 hover:bg-soft-grey hover:bg-opacity-50 text-charcoal font-semibold py-4 px-6 rounded-xl transition-colors font-primary"
                    >
                      {competition?.series_id
                        ? `Back to ${competition.series_name}`
                        : "Back to Home"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dark Score Input Modal */}
      {!isLocked && (
        <ScoreInputModal
          visible={keyboardVisible}
          players={teeTimeGroup.players}
          currentPlayerIndex={currentPlayerIndex}
          currentHole={currentHole}
          holePar={currentHoleData?.par || 4}
          netScoringData={netScoringData}
          onScoreSelect={handleNumberPress}
          onPlayerSelect={(index) => setCurrentPlayerIndex(index)}
          onClose={handleKeyboardDismiss}
          onSpecialAction={handleSpecialPress}
          isTourCompetition={isTourCompetition}
        />
      )}
      {/* Completion Actions Bar - Show when ready to finalize and not locked */}

      {/* Full Scorecard Modal */}
      <FullScorecardModal
        visible={fullScorecardVisible}
        teeTimeGroup={teeTimeGroup}
        course={course}
        currentHole={currentHole}
        onClose={() => setFullScorecardVisible(false)}
        netScoringData={netScoringData}
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

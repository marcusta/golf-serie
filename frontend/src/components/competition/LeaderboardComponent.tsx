import { useState } from "react";
import { formatToPar, getToParColor } from "../../utils/scoreCalculations";
import type { LeaderboardEntry } from "../../api/competitions";

interface LeaderboardComponentProps {
  leaderboard: LeaderboardEntry[] | undefined;
  leaderboardLoading: boolean;
  onParticipantClick: (participantId: number) => void;
  // For CompetitionRound context
  isRoundView?: boolean;
}

export function LeaderboardComponent({
  leaderboard,
  leaderboardLoading,
  onParticipantClick,
  isRoundView = false,
}: LeaderboardComponentProps) {
  // Filter state
  const [filter, setFilter] = useState<"all" | "finished">("all");

  // Helper function to determine player status
  const getPlayerStatus = (entry: LeaderboardEntry) => {
    const hasInvalidRound = entry.participant.score.includes(-1);
    const isLocked = entry.participant.is_locked;
    const hasStarted = entry.holesPlayed > 0;

    if (!hasStarted) return "NOT_STARTED";
    if (isLocked && !hasInvalidRound) return "FINISHED";
    return "IN_PROGRESS";
  };

  // Helper function to get display progress
  const getDisplayProgress = (entry: LeaderboardEntry) => {
    const status = getPlayerStatus(entry);

    if (status === "NOT_STARTED") {
      if (entry.startTime) {
        // startTime is in "HH:MM" format, so we can return it directly
        return entry.startTime;
      }
      return "TBD";
    }
    if (status === "FINISHED") return "F";
    return entry.holesPlayed.toString();
  };

  // Shared sorting logic for both mobile and desktop views
  const sortedLeaderboard = leaderboard
    ? [...leaderboard].sort((a, b) => {
        // Check if rounds are invalid (contain -1 scores)
        const aHasInvalidRound = a.participant.score.includes(-1);
        const bHasInvalidRound = b.participant.score.includes(-1);

        // Check if players have started (holes played > 0)
        const aStarted = a.holesPlayed > 0;
        const bStarted = b.holesPlayed > 0;

        // Category 1: Valid scores (started, no -1 scores)
        const aHasValidScore = aStarted && !aHasInvalidRound;
        const bHasValidScore = bStarted && !bHasInvalidRound;

        // Category 2: Invalid scores (started, has -1 scores)
        const aHasInvalidScore = aStarted && aHasInvalidRound;
        const bHasInvalidScore = bStarted && bHasInvalidRound;

        // Category 3: Not started (0 holes played)
        const aNotStarted = !aStarted;
        const bNotStarted = !bStarted;

        // Sort by category priority: Valid scores first, then invalid scores, then not started
        if (aHasValidScore && !bHasValidScore) return -1;
        if (!aHasValidScore && bHasValidScore) return 1;

        if (aHasInvalidScore && bNotStarted) return -1;
        if (aNotStarted && bHasInvalidScore) return 1;

        // Within valid scores category: sort by relativeToPar (best score first)
        if (aHasValidScore && bHasValidScore) {
          return a.relativeToPar - b.relativeToPar;
        }

        // Within invalid scores category: maintain original order
        if (aHasInvalidScore && bHasInvalidScore) {
          return 0;
        }

        // Within not started category: maintain original order
        if (aNotStarted && bNotStarted) {
          return 0;
        }

        return 0;
      })
    : [];

  // Apply filter
  const filteredLeaderboard = sortedLeaderboard.filter((entry) => {
    if (filter === "finished") {
      return getPlayerStatus(entry) === "FINISHED";
    }
    return true; // 'all' shows everything
  });

  // Helper function to get position styling
  const getPositionStyling = (index: number, holesPlayed: number) => {
    if (holesPlayed === 0) {
      return "border-gray-300 text-gray-500";
    }
    switch (index) {
      case 0:
        return "border-yellow-400 text-yellow-400"; // Gold
      case 1:
        return "border-gray-400 text-gray-400"; // Silver
      case 2:
        return "border-orange-400 text-orange-400"; // Bronze
      default:
        return "border-gray-300 text-gray-500";
    }
  };

  // Helper function to get row background for table
  const getRowBackground = (index: number, holesPlayed: number) => {
    if (holesPlayed === 0) return "bg-scorecard hover:bg-gray-50";
    switch (index) {
      case 0:
        return "bg-yellow-50 hover:bg-yellow-100"; // Gold
      case 1:
        return "bg-gray-50 hover:bg-gray-100"; // Silver
      case 2:
        return "bg-orange-50 hover:bg-orange-100"; // Bronze
      default:
        return "bg-scorecard hover:bg-gray-50";
    }
  };

  const content = (
    <div className="space-y-3 md:space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-semibold text-fairway font-display">
          Leaderboard
        </h2>
        <div className="text-xs md:text-sm text-turf font-primary">
          Live scoring
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === "all"
              ? "bg-coral text-scorecard"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("finished")}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === "finished"
              ? "bg-coral text-scorecard"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Only Finished
        </button>
      </div>

      {leaderboardLoading ? (
        <div className="p-4 text-charcoal font-primary">
          Loading leaderboard...
        </div>
      ) : !leaderboard || leaderboard.length === 0 ? (
        <div className="text-center py-6 md:py-8 text-soft-grey font-primary">
          No scores reported yet.
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredLeaderboard.map((entry, index) => {
              const isRoundInvalid = entry.participant.score.includes(-1);
              const isActive = index === 0; // Highlight leader
              const status = getPlayerStatus(entry);
              const displayProgress = getDisplayProgress(entry);

              return (
                <button
                  key={entry.participant.id}
                  onClick={() => onParticipantClick(entry.participant.id)}
                  className={`w-full text-left bg-scorecard rounded-lg p-4 shadow-sm border transition-all duration-200 hover:shadow-md hover:border-turf cursor-pointer ${
                    isActive
                      ? "border-coral/20 shadow-md ring-2 ring-coral/10"
                      : "border-soft-grey"
                  }`}
                >
                  <div className="flex items-center">
                    <div className="flex items-center flex-1">
                      {/* Position Circle */}
                      <div
                        className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg font-bold mr-3 ${getPositionStyling(
                          index,
                          entry.holesPlayed
                        )}`}
                      >
                        {entry.holesPlayed === 0 ? "-" : index + 1}
                      </div>

                      {/* Player Info */}
                      <div>
                        {entry.participant.player_names ? (
                          // Player has a name - show player name prominently
                          <>
                            <h3 className="text-body-lg font-semibold text-charcoal font-display">
                              {entry.participant.player_names}
                            </h3>
                            <p className="text-label-sm text-turf font-primary">
                              {entry.participant.team_name}{" "}
                              {entry.participant.position_name}
                            </p>
                          </>
                        ) : (
                          // No player name - show team name + position
                          <>
                            <h3 className="text-body-lg font-semibold text-charcoal font-display">
                              {entry.participant.team_name}{" "}
                              {entry.participant.position_name}
                            </h3>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Score Section - Hole and Score side by side */}
                    <div className="flex items-center space-x-4 text-right ml-auto">
                      {status === "NOT_STARTED" ? (
                        <div className="text-center">
                          <div className="text-xs text-gray-500">
                            Start Time
                          </div>
                          <div className="text-lg font-medium text-gray-500">
                            {displayProgress}
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Hole Number */}
                          <div className="text-center">
                            <div className="text-xs text-gray-500">Hole</div>
                            <div className="text-xl font-bold text-gray-800">
                              {displayProgress}
                            </div>
                          </div>

                          {/* Score */}
                          <div className="text-center">
                            <div className="text-xs text-gray-500">To Par</div>
                            <div
                              className={`text-xl font-bold ${
                                isRoundInvalid
                                  ? "text-gray-500"
                                  : getToParColor(entry.relativeToPar)
                              }`}
                            >
                              {isRoundInvalid
                                ? "-"
                                : formatToPar(entry.relativeToPar)}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <div className="bg-scorecard rounded-lg border border-soft-grey overflow-hidden shadow-sm">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-soft-grey">
                  <tr>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-charcoal font-display">
                      Pos
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-charcoal font-display">
                      Player/Team
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-charcoal font-display">
                      Hole & Score
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-charcoal font-display"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeaderboard.map((entry, index) => {
                    const isRoundInvalid = entry.participant.score.includes(-1);
                    const status = getPlayerStatus(entry);
                    const displayProgress = getDisplayProgress(entry);

                    return (
                      <tr
                        key={entry.participant.id}
                        className={`border-b border-soft-grey last:border-b-0 transition-colors duration-200 ${getRowBackground(
                          index,
                          entry.holesPlayed
                        )}`}
                      >
                        <td className="py-4 px-4">
                          <div
                            className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold ${getPositionStyling(
                              index,
                              entry.holesPlayed
                            )}`}
                          >
                            {entry.holesPlayed === 0 ? "-" : index + 1}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            {entry.participant.player_names ? (
                              // Player has a name - show player name prominently
                              <>
                                <div className="text-body-md font-semibold text-charcoal font-display">
                                  {entry.participant.player_names}
                                </div>
                                <div className="text-label-sm text-turf font-primary">
                                  {entry.participant.team_name}{" "}
                                  {entry.participant.position_name}
                                </div>
                              </>
                            ) : (
                              // No player name - show team name + position
                              <>
                                <div className="text-body-md font-semibold text-charcoal font-display">
                                  {entry.participant.team_name}{" "}
                                  {entry.participant.position_name}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {status === "NOT_STARTED" ? (
                            <div className="text-center">
                              <div className="text-xs text-gray-500">
                                Start Time
                              </div>
                              <div className="text-base font-medium text-gray-500">
                                {displayProgress}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center space-x-4">
                              {/* Hole Number */}
                              <div className="text-center">
                                <div className="text-xs text-gray-500">
                                  Hole
                                </div>
                                <div className="text-xl font-bold text-charcoal font-display">
                                  {displayProgress}
                                </div>
                              </div>

                              {/* Score */}
                              {status === "FINISHED" ? (
                                <div className="text-center">
                                  <div className="text-xs text-gray-500">
                                    Total
                                  </div>
                                  <div className="text-xl font-bold text-charcoal font-display">
                                    {isRoundInvalid ? "-" : entry.totalShots}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center">
                                  <div className="text-xs text-gray-500">
                                    To Par
                                  </div>
                                  <div
                                    className={`text-xl font-bold font-display ${
                                      isRoundInvalid
                                        ? "text-gray-500"
                                        : getToParColor(entry.relativeToPar)
                                    }`}
                                  >
                                    {isRoundInvalid
                                      ? "-"
                                      : formatToPar(entry.relativeToPar)}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() =>
                              onParticipantClick(entry.participant.id)
                            }
                            className="bg-turf text-scorecard px-3 py-2 rounded-md text-sm font-medium hover:bg-fairway transition-colors duration-200 font-primary"
                          >
                            View Card
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // For CompetitionRound.tsx - wrap in scrollable container
  if (isRoundView) {
    return (
      <div className="h-full overflow-y-auto bg-scorecard">
        <div className="p-4">{content}</div>
      </div>
    );
  }

  // For CompetitionDetail.tsx - return content directly
  return content;
}

import { useState } from "react";
import { formatToPar, getToParColor } from "../../utils/scoreCalculations";
import type { LeaderboardEntry, TourScoringMode, TeeInfo } from "../../api/competitions";

interface LeaderboardComponentProps {
  leaderboard: LeaderboardEntry[] | undefined;
  leaderboardLoading: boolean;
  onParticipantClick: (participantId: number) => void;
  // For CompetitionRound context
  isRoundView?: boolean;
  // For Tour competitions - hide team/position info
  isTourCompetition?: boolean;
  // Scoring mode from tour
  scoringMode?: TourScoringMode;
  // Tee info for display
  teeInfo?: TeeInfo;
}

export function LeaderboardComponent({
  leaderboard,
  leaderboardLoading,
  onParticipantClick,
  isRoundView = false,
  isTourCompetition = false,
  scoringMode,
  teeInfo,
}: LeaderboardComponentProps) {
  // Filter state
  const [filter, setFilter] = useState<"all" | "finished">("all");
  // Sort mode for when scoring_mode is 'both' - defaults to 'net' for net-aware modes
  const [sortBy, setSortBy] = useState<"gross" | "net">(
    scoringMode === "net" || scoringMode === "both" ? "net" : "gross"
  );

  // Check if we should show net scores
  const showNetScores = scoringMode === "net" || scoringMode === "both";

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

        // Within valid scores category: sort by score (best score first)
        if (aHasValidScore && bHasValidScore) {
          // Use net score for sorting if sorting by net and net scores are available
          if (sortBy === "net" && a.netRelativeToPar !== undefined && b.netRelativeToPar !== undefined) {
            return a.netRelativeToPar - b.netRelativeToPar;
          }
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
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-fairway font-display">
            Leaderboard
          </h2>
          {/* Show tee info if available */}
          {teeInfo && (
            <div className="text-xs text-turf font-primary mt-1">
              <span
                className="inline-block w-3 h-3 rounded-full mr-1.5 align-middle"
                style={{ backgroundColor: teeInfo.color || '#666' }}
              />
              {teeInfo.name} Tees (CR: {teeInfo.courseRating.toFixed(1)}, SR: {teeInfo.slopeRating})
            </div>
          )}
        </div>
        <div className="text-xs md:text-sm text-turf font-primary">
          Live scoring
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-2">
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

        {/* Gross/Net toggle when scoring mode is 'both' */}
        {scoringMode === "both" && (
          <div className="ml-auto flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setSortBy("gross")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                sortBy === "gross"
                  ? "bg-scorecard text-charcoal shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Gross
            </button>
            <button
              onClick={() => setSortBy("net")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                sortBy === "net"
                  ? "bg-scorecard text-charcoal shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Net
            </button>
          </div>
        )}
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
                            {/* Hide team/position for Tour competitions */}
                            {!isTourCompetition && (
                              <p className="text-label-sm text-turf font-primary">
                                {entry.participant.team_name}{" "}
                                {entry.participant.position_name}
                              </p>
                            )}
                          </>
                        ) : (
                          // No player name - show team name + position (unless Tour competition)
                          <>
                            <h3 className="text-body-lg font-semibold text-charcoal font-display">
                              {isTourCompetition
                                ? entry.participant.position_name
                                : `${entry.participant.team_name} ${entry.participant.position_name}`}
                            </h3>
                          </>
                        )}
                        {/* Show handicap info when net scoring enabled */}
                        {showNetScores && entry.participant.handicap_index !== undefined && (
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-turf font-primary">
                              HCP {entry.participant.handicap_index.toFixed(1)}
                            </span>
                            {entry.courseHandicap !== undefined && (
                              <span className="text-xs bg-coral/20 text-coral px-1.5 py-0.5 rounded font-medium font-primary">
                                PH {entry.courseHandicap}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Score Section - Hole and Score side by side */}
                    <div className="flex items-center space-x-3 text-right ml-auto">
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

                          {/* Gross Score */}
                          <div className="text-center">
                            <div className="text-xs text-gray-500">
                              {showNetScores ? "Gross" : "To Par"}
                            </div>
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

                          {/* Net Score - only show when scoring mode includes net */}
                          {showNetScores && (
                            <div className="text-center">
                              <div className="text-xs text-gray-500">Net</div>
                              <div
                                className={`text-xl font-bold ${
                                  isRoundInvalid || entry.netRelativeToPar === undefined
                                    ? "text-gray-500"
                                    : getToParColor(entry.netRelativeToPar)
                                }`}
                              >
                                {isRoundInvalid || entry.netRelativeToPar === undefined
                                  ? "-"
                                  : formatToPar(entry.netRelativeToPar)}
                              </div>
                            </div>
                          )}
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
                      {isTourCompetition ? "Player" : "Player/Team"}
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
                                {/* Hide team/position for Tour competitions */}
                                {!isTourCompetition && (
                                  <div className="text-label-sm text-turf font-primary">
                                    {entry.participant.team_name}{" "}
                                    {entry.participant.position_name}
                                  </div>
                                )}
                              </>
                            ) : (
                              // No player name - show team name + position (unless Tour competition)
                              <>
                                <div className="text-body-md font-semibold text-charcoal font-display">
                                  {isTourCompetition
                                    ? entry.participant.position_name
                                    : `${entry.participant.team_name} ${entry.participant.position_name}`}
                                </div>
                              </>
                            )}
                            {/* Show handicap info when net scoring enabled */}
                            {showNetScores && entry.participant.handicap_index !== undefined && (
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-turf font-primary">
                                  HCP {entry.participant.handicap_index.toFixed(1)}
                                </span>
                                {entry.courseHandicap !== undefined && (
                                  <span className="text-xs bg-coral/20 text-coral px-1.5 py-0.5 rounded font-medium font-primary">
                                    PH {entry.courseHandicap}
                                  </span>
                                )}
                              </div>
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

                              {/* Gross Score */}
                              {status === "FINISHED" ? (
                                <div className="text-center">
                                  <div className="text-xs text-gray-500">
                                    {showNetScores ? "Gross" : "Total"}
                                  </div>
                                  <div className="text-xl font-bold text-charcoal font-display">
                                    {isRoundInvalid ? "-" : entry.totalShots}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center">
                                  <div className="text-xs text-gray-500">
                                    {showNetScores ? "Gross" : "To Par"}
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

                              {/* Net Score - only show when scoring mode includes net */}
                              {showNetScores && (
                                status === "FINISHED" ? (
                                  <div className="text-center">
                                    <div className="text-xs text-gray-500">Net</div>
                                    <div className="text-xl font-bold text-charcoal font-display">
                                      {isRoundInvalid || entry.netTotalShots === undefined
                                        ? "-"
                                        : entry.netTotalShots}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center">
                                    <div className="text-xs text-gray-500">Net</div>
                                    <div
                                      className={`text-xl font-bold font-display ${
                                        isRoundInvalid || entry.netRelativeToPar === undefined
                                          ? "text-gray-500"
                                          : getToParColor(entry.netRelativeToPar)
                                      }`}
                                    >
                                      {isRoundInvalid || entry.netRelativeToPar === undefined
                                        ? "-"
                                        : formatToPar(entry.netRelativeToPar)}
                                    </div>
                                  </div>
                                )
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

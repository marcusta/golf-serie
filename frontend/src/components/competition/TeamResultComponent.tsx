import { useState } from "react";
import { formatToPar, getToParColor } from "../../utils/scoreCalculations";
import type { TeamLeaderboardEntry } from "../../api/competitions";
import type { LeaderboardEntry } from "../../api/competitions";

interface TeamResultComponentProps {
  teamResults: TeamLeaderboardEntry[] | undefined;
  leaderboardLoading: boolean;
  individualResults?: LeaderboardEntry[] | undefined; // For individual player sorting
  // For CompetitionRound context
  isRoundView?: boolean;
  // Add participant click handler for scorecard modal
  onParticipantClick?: (participantId: number) => void;
}

export function TeamResultComponent({
  teamResults,
  leaderboardLoading,
  individualResults,
  isRoundView = false,
  onParticipantClick,
}: TeamResultComponentProps) {
  // Filter state
  const [filter, setFilter] = useState<"all" | "finished">("all");

  // Apply filter
  const filteredTeamResults = teamResults?.filter((team) => {
    if (filter === "finished") {
      return team.status === "FINISHED";
    }
    return true; // 'all' shows everything
  });

  // Helper function to get individual players for a team, sorted according to leaderboard rules
  const getTeamPlayers = (teamName: string) => {
    if (!individualResults) return [];

    const teamPlayers = individualResults.filter(
      (entry) => entry.participant.team_name === teamName
    );

    // Sort players according to leaderboard rules (same as in LeaderboardComponent)
    return teamPlayers.sort((a, b) => {
      const aHasInvalidRound = a.participant.score.includes(-1);
      const bHasInvalidRound = b.participant.score.includes(-1);
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

      return 0;
    });
  };

  // Helper function to determine player status
  const getPlayerStatus = (entry: LeaderboardEntry) => {
    const hasInvalidRound = entry.participant.score.includes(-1);
    const isLocked = entry.participant.is_locked;
    const hasStarted = entry.holesPlayed > 0;

    if (!hasStarted) return "NOT_STARTED";
    if (isLocked && !hasInvalidRound) return "FINISHED";
    return "IN_PROGRESS";
  };

  // Helper function to get display progress for individual players (matching LeaderboardComponent)
  const getPlayerDisplayProgress = (entry: LeaderboardEntry) => {
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

  const content = (
    <div className="space-y-4 md:space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-fairway font-display">
            Team Results
          </h2>
          <p className="text-sm md:text-base text-turf font-primary mt-1">
            Team standings with individual player results
          </p>
        </div>
        <div className="text-center text-xs md:text-sm text-turf font-primary bg-rough/20 px-3 py-2 rounded-full border border-soft-grey">
          {teamResults?.filter((t) => t.status !== "NOT_STARTED").length || 0}{" "}
          teams scored
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
        <div className="flex items-center justify-center py-8 md:py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-coral border-t-transparent rounded-full animate-spin"></div>
            <p className="text-charcoal font-primary">
              Loading team results...
            </p>
          </div>
        </div>
      ) : !teamResults || teamResults.length === 0 ? (
        <div className="text-center py-8 md:py-12 bg-rough/10 rounded-xl border border-soft-grey">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 bg-soft-grey/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-soft-grey"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-charcoal font-display mb-2">
              No Results Yet
            </h3>
            <p className="text-soft-grey font-primary">
              Team results will appear here once scores are submitted.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTeamResults?.map((team, index) => {
            const isLeading = index === 0 && team.status !== "NOT_STARTED";
            const isPodium = index <= 2 && team.status !== "NOT_STARTED";
            const hasValidResults = team.status !== "NOT_STARTED";
            const teamPlayers = getTeamPlayers(team.teamName);

            return (
              <div
                key={team.teamId}
                className={`relative bg-scorecard rounded-xl p-4 shadow-sm border transition-all duration-300 hover:shadow-md ${
                  isLeading
                    ? "border-coral/30 shadow-lg ring-2 ring-coral/20 bg-gradient-to-br from-scorecard to-coral/5"
                    : isPodium
                    ? "border-turf/30 shadow-md ring-1 ring-turf/20 bg-gradient-to-br from-scorecard to-turf/5"
                    : hasValidResults
                    ? "border-soft-grey hover:border-turf/40"
                    : "border-soft-grey/50 opacity-75 bg-scorecard/50"
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {/* Position Badge */}
                      <div
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-bold shadow-md ${
                          isLeading
                            ? "bg-scorecard text-coral border-coral"
                            : isPodium
                            ? "bg-scorecard text-turf border-turf"
                            : hasValidResults
                            ? "bg-scorecard text-charcoal border-charcoal"
                            : "bg-scorecard text-soft-grey border-soft-grey"
                        }`}
                      >
                        #{index + 1}
                      </div>

                      <div>
                        <h3 className="text-lg md:text-xl font-bold text-charcoal font-display">
                          {team.teamName}
                        </h3>
                        {isLeading && (
                          <div className="flex items-center gap-1 bg-coral/20 text-coral px-2 py-1 rounded-full text-xs font-medium mt-1">
                            <svg
                              className="w-3 h-3"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 2L13.09 8.26L20 9L15 13.74L16.18 20.66L10 17.27L3.82 20.66L5 13.74L0 9L6.91 8.26L10 2Z"
                                clipRule="evenodd"
                              />
                            </svg>
                            Leader
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-turf font-primary">
                      <span>{teamPlayers.length} players</span>
                    </div>
                  </div>

                  {/* Right side - Team summary based on status */}
                  <div className="text-right flex flex-col items-end gap-2">
                    {team.status === "NOT_STARTED" ? (
                      <div className="text-center">
                        <div className="text-xs font-medium text-turf mb-1 uppercase tracking-wide">
                          Status
                        </div>
                        <div className="text-lg font-medium text-soft-grey bg-soft-grey/10 px-3 py-1 rounded-lg">
                          Not Started
                        </div>
                      </div>
                    ) : team.status === "IN_PROGRESS" ? (
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="text-xs font-medium text-turf mb-1 uppercase tracking-wide">
                            Score
                          </div>
                          <div
                            className={`text-xl font-bold font-display px-3 py-1 rounded-lg ${
                              team.totalRelativeScore !== null
                                ? getToParColor(team.totalRelativeScore)
                                : "bg-charcoal/10 text-charcoal"
                            }`}
                          >
                            {team.totalRelativeScore !== null
                              ? formatToPar(team.totalRelativeScore)
                              : "-"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-turf mb-1 uppercase tracking-wide">
                            Points
                          </div>
                          <div className="text-xl font-bold font-display px-3 py-1 rounded-lg bg-charcoal/10 text-charcoal">
                            {team.teamPoints}
                          </div>
                        </div>
                      </div>
                    ) : (
                      // FINISHED status
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="text-xs font-medium text-turf mb-1 uppercase tracking-wide">
                            Total Shots
                          </div>
                          <div className="text-2xl font-bold text-charcoal font-display px-3 py-1 rounded-lg bg-charcoal/10">
                            {team.totalShots || "-"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-turf mb-1 uppercase tracking-wide">
                            To Par
                          </div>
                          <div
                            className={`text-xl font-bold font-display px-3 py-1 rounded-lg ${
                              team.totalRelativeScore !== null
                                ? getToParColor(team.totalRelativeScore)
                                : "bg-charcoal/10 text-charcoal"
                            }`}
                          >
                            {team.totalRelativeScore !== null
                              ? formatToPar(team.totalRelativeScore)
                              : "-"}
                          </div>
                        </div>
                        {team.teamPoints !== null && (
                          <div>
                            <div className="text-xs font-medium text-turf mb-1 uppercase tracking-wide">
                              Points
                            </div>
                            <div
                              className={`text-xl font-bold font-display px-3 py-1 rounded-lg shadow-md ${
                                isLeading
                                  ? "bg-coral text-scorecard"
                                  : isPodium
                                  ? "bg-turf text-scorecard"
                                  : "bg-charcoal/10 text-charcoal"
                              }`}
                            >
                              {team.teamPoints}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Individual Players Section */}
                <div className="border-t border-soft-grey/30 pt-3">
                  <h5 className="text-sm font-semibold text-fairway mb-2 font-primary uppercase tracking-wide">
                    Individual Players
                  </h5>
                  <div className="space-y-1">
                    {teamPlayers.map((player, idx) => {
                      const playerStatus = getPlayerStatus(player);
                      const playerProgress = getPlayerDisplayProgress(player);
                      const isRoundInvalid =
                        player.participant.score.includes(-1);

                      return (
                        <button
                          key={player.participant.id}
                          onClick={() =>
                            onParticipantClick?.(player.participant.id)
                          }
                          className={`w-full flex items-center justify-between py-2 px-3 rounded-lg transition-colors text-left ${
                            playerStatus !== "NOT_STARTED"
                              ? "bg-rough/10 hover:bg-rough/20 cursor-pointer"
                              : "bg-soft-grey/5 cursor-default"
                          } ${onParticipantClick ? "hover:shadow-sm" : ""}`}
                          disabled={
                            !onParticipantClick ||
                            playerStatus === "NOT_STARTED"
                          }
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                playerStatus !== "NOT_STARTED"
                                  ? "bg-turf/20 text-turf"
                                  : "bg-soft-grey/20 text-soft-grey"
                              }`}
                            >
                              {idx + 1}
                            </div>
                            <div className="flex-1">
                              <span
                                className={`font-medium font-primary text-sm ${
                                  playerStatus !== "NOT_STARTED"
                                    ? "text-charcoal"
                                    : "text-soft-grey"
                                }`}
                              >
                                {player.participant.player_names
                                  ? `${player.participant.player_names} (${player.participant.position_name})`
                                  : player.participant.position_name}
                              </span>
                            </div>
                          </div>

                          {/* Score Section - matching LeaderboardComponent layout */}
                          <div className="flex items-center gap-3">
                            {playerStatus === "NOT_STARTED" ? (
                              <div className="text-center">
                                <div className="text-xs text-gray-500">
                                  Start Time
                                </div>
                                <div className="text-sm font-medium text-gray-500">
                                  {playerProgress}
                                </div>
                              </div>
                            ) : (
                              <>
                                {/* Hole Number */}
                                <div className="text-center">
                                  <div className="text-xs text-gray-500">
                                    Thru
                                  </div>
                                  <div className="text-sm font-bold text-gray-800">
                                    {playerProgress}
                                  </div>
                                </div>

                                {/* Score */}
                                <div className="text-center">
                                  <div className="text-xs text-gray-500">
                                    To Par
                                  </div>
                                  <div
                                    className={`text-sm font-bold ${
                                      isRoundInvalid
                                        ? "text-gray-500"
                                        : getToParColor(player.relativeToPar)
                                    }`}
                                  >
                                    {isRoundInvalid
                                      ? "-"
                                      : formatToPar(player.relativeToPar)}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // For CompetitionRound.tsx - wrap in scrollable container
  if (isRoundView) {
    return (
      <div className="h-full overflow-y-auto bg-scorecard">
        <div className="p-4 md:p-6">{content}</div>
      </div>
    );
  }

  // For CompetitionDetail.tsx - return content directly
  return content;
}

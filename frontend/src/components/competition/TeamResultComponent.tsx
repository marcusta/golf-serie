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
  // Track which teams are expanded to show players
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  const toggleTeamExpanded = (teamId: string) => {
    setExpandedTeams(prev => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  };

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
        <h2 className="text-xl md:text-2xl font-bold text-fairway font-display">
          Team Results
        </h2>
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
        <div className="text-center py-8 md:py-12">
          <h3 className="text-lg font-semibold text-charcoal font-display mb-2">
            No Results Yet
          </h3>
          <p className="text-soft-grey font-primary">
            Team results will appear here once scores are submitted.
          </p>
        </div>
      ) : (
        <div>
          {/* Column Headers - shown once */}
          <div className="flex items-center justify-between pb-2 mb-2 pr-3 border-b border-soft-grey text-xs text-charcoal/50 uppercase tracking-wide">
            <div className="flex-1">Team</div>
            <div className="flex items-center gap-4 text-right">
              <div className="w-14">To Par</div>
              <div className="w-10">Pts</div>
            </div>
          </div>

          {/* Team List */}
          <div className="divide-y divide-soft-grey">
            {filteredTeamResults?.map((team, index) => {
              const isLeading = index === 0 && team.status !== "NOT_STARTED";
              const isPodium = index <= 2 && team.status !== "NOT_STARTED";
              const hasValidResults = team.status !== "NOT_STARTED";
              const teamPlayers = getTeamPlayers(team.teamName);
              const isExpanded = expandedTeams.has(team.teamId);

              // Determine left border color
              const leftBorderClass = isLeading
                ? "border-l-4 border-l-coral bg-coral/5"
                : isPodium
                ? "border-l-4 border-l-turf"
                : hasValidResults
                ? "border-l-4 border-l-charcoal/20"
                : "";

              return (
                <div
                  key={team.teamId}
                  className={`${leftBorderClass} ${!hasValidResults ? "opacity-60" : ""}`}
                >
                  {/* Team Header Row - Clickable to expand */}
                  <button
                    onClick={() => hasValidResults && teamPlayers.length > 0 && toggleTeamExpanded(team.teamId)}
                    className={`w-full flex items-center justify-between py-3 pr-3 text-left ${
                      hasValidResults && teamPlayers.length > 0 ? "hover:bg-gray-50/50 cursor-pointer" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Expand indicator */}
                      {hasValidResults && teamPlayers.length > 0 ? (
                        <svg
                          className={`w-4 h-4 text-charcoal/30 transition-transform flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      ) : (
                        <div className="w-4" />
                      )}
                      {/* Position Number */}
                      <span
                        className={`text-base font-bold w-5 flex-shrink-0 ${
                          isLeading
                            ? "text-coral"
                            : isPodium
                            ? "text-turf"
                            : hasValidResults
                            ? "text-charcoal"
                            : "text-soft-grey"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="text-base font-semibold text-charcoal font-display truncate">
                        {team.teamName}
                      </span>
                    </div>

                    {/* Team Stats - just To Par and Points */}
                    <div className="flex items-center gap-4 text-right flex-shrink-0">
                      {team.status === "NOT_STARTED" ? (
                        <span className="text-sm text-soft-grey">—</span>
                      ) : (
                        <>
                          <div
                            className={`w-14 text-base font-bold font-display ${
                              team.totalRelativeScore !== null
                                ? getToParColor(team.totalRelativeScore)
                                : "text-charcoal"
                            }`}
                          >
                            {team.totalRelativeScore !== null
                              ? formatToPar(team.totalRelativeScore)
                              : "-"}
                          </div>
                          <div
                            className={`w-10 text-base font-bold font-display ${
                              isLeading ? "text-coral" : isPodium ? "text-turf" : "text-charcoal"
                            }`}
                          >
                            {team.teamPoints ?? "-"}
                          </div>
                        </>
                      )}
                    </div>
                  </button>

                  {/* Individual Players Section - Expandable */}
                  {isExpanded && teamPlayers.length > 0 && (
                    <div className="pl-7 pr-4 pb-3 bg-gray-50/50">
                      {/* Total shots shown when expanded */}
                      {team.totalShots && (
                        <div className="text-xs text-charcoal/50 mb-2">
                          Total: {team.totalShots} shots
                        </div>
                      )}
                      <div className="divide-y divide-soft-grey/30">
                        {teamPlayers.map((player, idx) => {
                          const playerStatus = getPlayerStatus(player);
                          const playerProgress = getPlayerDisplayProgress(player);
                          const isRoundInvalid = player.participant.score.includes(-1);

                          return (
                            <button
                              key={player.participant.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                onParticipantClick?.(player.participant.id);
                              }}
                              className={`w-full flex items-center justify-between py-2 transition-colors text-left ${
                                playerStatus !== "NOT_STARTED" && onParticipantClick
                                  ? "hover:bg-gray-50 cursor-pointer"
                                  : "cursor-default"
                              }`}
                              disabled={!onParticipantClick || playerStatus === "NOT_STARTED"}
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <span className="text-xs text-charcoal/30 w-4">
                                  {idx + 1}
                                </span>
                                <span
                                  className={`font-medium font-primary text-sm ${
                                    playerStatus !== "NOT_STARTED" ? "text-charcoal" : "text-soft-grey"
                                  }`}
                                >
                                  {player.participant.player_name
                                    ? `${player.participant.player_name} (${player.participant.position_name})`
                                    : player.participant.position_name}
                                </span>
                              </div>

                              <div className="flex items-center gap-4 text-sm">
                                {playerStatus === "NOT_STARTED" ? (
                                  <span className="text-charcoal/40">{playerProgress}</span>
                                ) : (
                                  <>
                                    <span className="text-charcoal/60 w-6 text-center">
                                      {playerProgress}
                                    </span>
                                    <span
                                      className={`font-bold w-8 text-right ${
                                        isRoundInvalid
                                          ? "text-charcoal/40"
                                          : getToParColor(player.relativeToPar)
                                      }`}
                                    >
                                      {isRoundInvalid ? "-" : formatToPar(player.relativeToPar)}
                                    </span>
                                  </>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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

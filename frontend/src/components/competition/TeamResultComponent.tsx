import { formatToPar, getToParColor } from "../../utils/scoreCalculations";
import type { TeamResultWithPoints } from "../../utils/pointCalculation";

interface TeamResultComponentProps {
  teamResults: TeamResultWithPoints[] | undefined;
  leaderboardLoading: boolean;
  // For CompetitionRound context
  isRoundView?: boolean;
}

export function TeamResultComponent({
  teamResults,
  leaderboardLoading,
  isRoundView = false,
}: TeamResultComponentProps) {
  // Debug log to check data structure
  if (teamResults) {
    console.log("TeamResultComponent data:", teamResults);
  }

  const content = (
    <div className="space-y-4 md:space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-fairway font-display">
            Team Results
          </h2>
          <p className="text-sm md:text-base text-turf font-primary mt-1">
            Final standings with ranking points
          </p>
        </div>
        <div className="text-xs md:text-sm text-turf font-primary bg-rough/20 px-3 py-2 rounded-full border border-soft-grey">
          {teamResults?.filter((t) => t.hasResults).length || 0} teams scored
        </div>
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
          {teamResults.map((team) => {
            const isLeading = team.position === 1 && team.hasResults;
            const isPodium = team.position <= 3 && team.hasResults;
            const hasValidResults = team.hasResults;

            return (
              <div
                key={team.teamName}
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
                      {/* Position Badge - inline with team name */}
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
                        #{team.position}
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
                      <span>{team.participants.length} players</span>
                      {hasValidResults && (
                        <span className="flex items-center gap-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                            />
                          </svg>
                          {
                            team.participants.filter((p) => p.totalShots > 0)
                              .length
                          }{" "}
                          scored
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right side - Team totals and Points */}
                  <div className="text-right flex flex-col items-end gap-2">
                    {hasValidResults ? (
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-lg font-bold font-display px-3 py-1 rounded-lg ${getToParColor(
                            team.relativeToPar
                          )} ${
                            team.relativeToPar < 0
                              ? "bg-turf/10"
                              : team.relativeToPar > 0
                              ? "bg-flag/10"
                              : "bg-charcoal/10"
                          }`}
                        >
                          {formatToPar(team.relativeToPar)}
                        </span>
                        <span className="text-2xl font-bold text-charcoal font-display">
                          {team.totalShots}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-medium text-soft-grey font-primary bg-soft-grey/10 px-3 py-1 rounded-lg">
                          No results
                        </span>
                      </div>
                    )}

                    {/* Points Display */}
                    {hasValidResults && (
                      <div>
                        <div className="text-xs font-medium text-turf mb-1 uppercase tracking-wide">
                          Points
                        </div>
                        <div
                          className={`text-xl font-bold font-display px-3 py-1 rounded-lg ${
                            isLeading
                              ? "bg-coral text-scorecard shadow-md"
                              : isPodium
                              ? "bg-turf text-scorecard shadow-md"
                              : "bg-charcoal/10 text-charcoal"
                          }`}
                        >
                          {team.rankingPoints}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Individual Scores Section - ONLY place participants should be rendered */}
                <div className="border-t border-soft-grey/30 pt-3">
                  <h5 className="text-sm font-semibold text-fairway mb-2 font-primary uppercase tracking-wide">
                    Individual Scores
                  </h5>
                  <div className="space-y-1">
                    {team.participants.map((participant, idx) => (
                      <div
                        key={participant.name || idx}
                        className={`flex items-center justify-between py-1.5 px-3 rounded-lg transition-colors ${
                          participant.totalShots > 0
                            ? "bg-rough/10 hover:bg-rough/20"
                            : "bg-soft-grey/5"
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                              participant.totalShots > 0
                                ? "bg-turf/20 text-turf"
                                : "bg-soft-grey/20 text-soft-grey"
                            }`}
                          >
                            {idx + 1}
                          </div>
                          <div>
                            <span
                              className={`font-medium font-primary text-sm ${
                                participant.totalShots > 0
                                  ? "text-charcoal"
                                  : "text-soft-grey"
                              }`}
                            >
                              {participant.name || "Unknown Player"}
                            </span>
                            <span
                              className={`text-xs ml-2 ${
                                participant.totalShots > 0
                                  ? "text-turf"
                                  : "text-soft-grey"
                              }`}
                            >
                              ({participant.position})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {participant.totalShots > 0 ? (
                            <>
                              <span
                                className={`text-sm font-semibold px-2 py-1 rounded ${getToParColor(
                                  participant.relativeToPar
                                )} ${
                                  participant.relativeToPar < 0
                                    ? "bg-turf/10"
                                    : participant.relativeToPar > 0
                                    ? "bg-flag/10"
                                    : "bg-charcoal/10"
                                }`}
                              >
                                {formatToPar(participant.relativeToPar)}
                              </span>
                              <span className="text-base font-bold text-charcoal font-display min-w-[2.5rem] text-right">
                                {participant.totalShots}
                              </span>
                            </>
                          ) : (
                            <span className="text-sm text-soft-grey font-primary bg-soft-grey/10 px-3 py-1 rounded">
                              No score
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
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

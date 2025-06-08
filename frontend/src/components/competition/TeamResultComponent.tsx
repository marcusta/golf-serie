import { formatToPar, getToParColor } from "../../utils/scoreCalculations";

interface TeamResultEntry {
  teamName: string;
  participants: Array<{
    name: string;
    position: string;
    totalShots: number;
    relativeToPar: number;
  }>;
  totalShots: number;
  relativeToPar: number;
  position: number;
  points: number;
}

interface TeamResultComponentProps {
  teamResults: TeamResultEntry[] | undefined;
  leaderboardLoading: boolean;
  // For CompetitionRound context
  isRoundView?: boolean;
}

export function TeamResultComponent({
  teamResults,
  leaderboardLoading,
  isRoundView = false,
}: TeamResultComponentProps) {
  const content = (
    <div className="space-y-3 md:space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-semibold text-fairway font-display">
          Team Results
        </h2>
        <div className="text-xs md:text-sm text-turf font-primary">
          Final standings
        </div>
      </div>

      {leaderboardLoading ? (
        <div className="p-4 text-charcoal font-primary">
          Loading team results...
        </div>
      ) : !teamResults || teamResults.length === 0 ? (
        <div className="text-center py-6 md:py-8 text-soft-grey font-primary">
          No team results available yet.
        </div>
      ) : (
        <div className="space-y-3">
          {teamResults.map((team) => {
            const isLeading = team.position === 1;
            return (
              <div
                key={team.teamName}
                className={`bg-scorecard rounded-lg p-4 shadow-sm border transition-all duration-200 ${
                  isLeading
                    ? "border-coral/20 shadow-md ring-2 ring-coral/10"
                    : "border-soft-grey"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-body-lg font-semibold text-charcoal font-display">
                      {team.teamName}
                    </h3>
                    <p className="text-label-sm text-turf mb-1 font-primary">
                      {team.participants.length} players
                    </p>
                    <span
                      className={`text-label-sm font-medium font-primary ${getToParColor(
                        team.relativeToPar
                      )}`}
                    >
                      {formatToPar(team.relativeToPar)}
                    </span>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-display-md font-bold text-charcoal font-display">
                      {team.totalShots}
                    </div>
                    <div className="w-12 h-12 rounded-full border-2 border-soft-grey bg-rough/10 flex items-center justify-center text-label-sm font-medium text-turf">
                      #{team.position}
                    </div>
                  </div>
                </div>

                {/* Player Scores */}
                <div className="space-y-2">
                  <h5 className="text-label-sm font-medium text-fairway font-primary">
                    Player Scores
                  </h5>
                  <div className="space-y-1">
                    {team.participants.map((participant) => (
                      <div
                        key={participant.name}
                        className="flex items-center justify-between text-label-sm"
                      >
                        <span className="text-turf truncate flex-1 mr-2 font-primary">
                          {participant.name} ({participant.position})
                        </span>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span
                            className={`font-primary ${getToParColor(
                              participant.relativeToPar
                            )}`}
                          >
                            {formatToPar(participant.relativeToPar)}
                          </span>
                          <span className="text-charcoal font-medium font-display">
                            {participant.totalShots}
                          </span>
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
        <div className="p-4">{content}</div>
      </div>
    );
  }

  // For CompetitionDetail.tsx - return content directly
  return content;
}

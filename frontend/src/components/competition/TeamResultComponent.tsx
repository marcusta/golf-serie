import {
  formatToPar,
  getToParColor,
  getPositionColor,
} from "../../utils/scoreCalculations";

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
        <div className="bg-scorecard rounded-xl border border-soft-grey overflow-hidden shadow-sm">
          <div className="divide-y divide-soft-grey">
            {teamResults.map((team) => (
              <div
                key={team.teamName}
                className={`px-4 md:px-6 py-3 md:py-4 ${getPositionColor(
                  team.position
                )} border-l-4`}
              >
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                    <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full bg-scorecard border-2 border-turf flex-shrink-0">
                      <span className="text-xs md:text-sm font-bold text-fairway font-display">
                        {team.position}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm md:text-lg font-medium text-fairway truncate font-display">
                        {team.teamName}
                      </h4>
                      <p className="text-xs md:text-sm text-turf font-primary">
                        {team.participants.length} players
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-2 md:gap-6">
                      <div>
                        <div className="text-xs text-turf font-primary">
                          Total
                        </div>
                        <div className="text-sm md:text-xl font-bold text-charcoal font-display">
                          {team.totalShots}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-turf font-primary">
                          To Par
                        </div>
                        <div
                          className={`text-sm md:text-xl font-bold font-display ${getToParColor(
                            team.relativeToPar
                          )}`}
                        >
                          {formatToPar(team.relativeToPar)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-turf font-primary">
                          Points
                        </div>
                        <div className="text-sm md:text-xl font-bold text-turf font-display">
                          {team.points}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 md:gap-4 mt-2 md:mt-4">
                  <div>
                    <h5 className="text-xs md:text-sm font-medium text-fairway mb-1 md:mb-2 font-primary">
                      Player Scores
                    </h5>
                    <div className="space-y-1 md:space-y-2">
                      {team.participants.map((participant) => (
                        <div
                          key={participant.name}
                          className="flex items-center justify-between text-xs md:text-sm"
                        >
                          <span className="text-turf truncate flex-1 mr-2 font-primary">
                            {participant.name} ({participant.position})
                          </span>
                          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
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
              </div>
            ))}
          </div>
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

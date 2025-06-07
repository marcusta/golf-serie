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
  const getPositionColor = (position: number) => {
    switch (position) {
      case 1:
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case 2:
        return "text-gray-600 bg-gray-50 border-gray-200";
      case 3:
        return "text-amber-600 bg-amber-50 border-amber-200";
      default:
        return "text-gray-900 bg-white border-gray-200";
    }
  };

  const getToParColor = (toPar: number) => {
    if (toPar < 0) return "text-green-600";
    if (toPar > 0) return "text-red-600";
    return "text-gray-600";
  };

  const formatToPar = (toPar: number) => {
    if (toPar === 0) return "E";
    return toPar > 0 ? `+${toPar}` : `${toPar}`;
  };

  const content = (
    <div className="space-y-3 md:space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-semibold text-gray-900">
          Team Results
        </h2>
        <div className="text-xs md:text-sm text-gray-500">Final standings</div>
      </div>

      {leaderboardLoading ? (
        <div className="p-4">Loading team results...</div>
      ) : !teamResults || teamResults.length === 0 ? (
        <div className="text-center py-6 md:py-8 text-gray-500">
          No team results available yet.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {teamResults.map((team) => (
              <div
                key={team.teamName}
                className={`px-4 md:px-6 py-3 md:py-4 ${getPositionColor(
                  team.position
                )} border-l-4`}
              >
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                    <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full bg-white border-2 flex-shrink-0">
                      <span className="text-xs md:text-sm font-bold">
                        {team.position}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm md:text-lg font-medium text-gray-900 truncate">
                        {team.teamName}
                      </h4>
                      <p className="text-xs md:text-sm text-gray-600">
                        {team.participants.length} players
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center gap-2 md:gap-6">
                      <div>
                        <div className="text-xs text-gray-600">Total</div>
                        <div className="text-sm md:text-xl font-bold text-gray-900">
                          {team.totalShots}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">To Par</div>
                        <div
                          className={`text-sm md:text-xl font-bold ${getToParColor(
                            team.relativeToPar
                          )}`}
                        >
                          {formatToPar(team.relativeToPar)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600">Points</div>
                        <div className="text-sm md:text-xl font-bold text-green-600">
                          {team.points}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 md:gap-4 mt-2 md:mt-4">
                  <div>
                    <h5 className="text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                      Player Scores
                    </h5>
                    <div className="space-y-1 md:space-y-2">
                      {team.participants.map((participant) => (
                        <div
                          key={participant.name}
                          className="flex items-center justify-between text-xs md:text-sm"
                        >
                          <span className="text-gray-600 truncate flex-1 mr-2">
                            {participant.name} ({participant.position})
                          </span>
                          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                            <span
                              className={getToParColor(
                                participant.relativeToPar
                              )}
                            >
                              {formatToPar(participant.relativeToPar)}
                            </span>
                            <span className="text-gray-900 font-medium">
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
      <div className="h-full overflow-y-auto">
        <div className="p-4">{content}</div>
      </div>
    );
  }

  // For CompetitionDetail.tsx - return content directly
  return content;
}

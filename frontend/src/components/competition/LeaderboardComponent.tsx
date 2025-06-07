import {
  formatToPar,
  getToParColor,
  getPositionColor,
} from "../../utils/scoreCalculations";

interface LeaderboardEntry {
  participant: {
    id: number;
    team_name: string;
    position_name: string;
    player_names?: string | null;
  };
  totalShots: number;
  relativeToPar: number;
  holesPlayed: number;
}

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
  const content = (
    <div className="space-y-3 md:space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-semibold text-gray-900">
          Leaderboard
        </h2>
        <div className="text-xs md:text-sm text-gray-500">Live scoring</div>
      </div>

      {leaderboardLoading ? (
        <div className="p-4">Loading leaderboard...</div>
      ) : !leaderboard || leaderboard.length === 0 ? (
        <div className="text-center py-6 md:py-8 text-gray-500">
          No scores reported yet.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {[...leaderboard]
              .sort((a, b) => {
                // First sort by whether they have started (holes played > 0)
                const aStarted = a.holesPlayed > 0;
                const bStarted = b.holesPlayed > 0;
                if (aStarted !== bStarted) {
                  return aStarted ? -1 : 1;
                }
                // Then sort by relativeToPar
                return a.relativeToPar - b.relativeToPar;
              })
              .map((entry, index) => (
                <button
                  key={entry.participant.id}
                  onClick={() => onParticipantClick(entry.participant.id)}
                  className={`w-full text-left px-4 md:px-6 py-3 md:py-4 ${getPositionColor(
                    index + 1
                  )} border-l-4 hover:bg-opacity-80 transition-colors cursor-pointer`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                      <div className="flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full bg-white border-2 flex-shrink-0">
                        <span className="text-xs md:text-sm font-bold">
                          {index + 1}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm md:text-lg font-medium text-gray-900 truncate">
                          {entry.participant.team_name}{" "}
                          {entry.participant.position_name}
                        </h4>
                        <p className="text-xs md:text-sm text-gray-600">
                          Thru {entry.holesPlayed} holes
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-3 md:gap-6">
                        <div>
                          <div className="text-xs text-gray-600">Score</div>
                          <div className="text-lg md:text-xl font-bold text-gray-900">
                            {entry.totalShots}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600">To Par</div>
                          <div
                            className={`text-lg md:text-xl font-bold ${getToParColor(
                              entry.relativeToPar
                            )}`}
                          >
                            {formatToPar(entry.relativeToPar)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
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

import { formatToPar, getToParColor } from "../../utils/scoreCalculations";

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
        <h2 className="text-lg md:text-xl font-semibold text-fairway font-display">
          Leaderboard
        </h2>
        <div className="text-xs md:text-sm text-turf font-primary">
          Live scoring
        </div>
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
        <div className="space-y-3">
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
            .map((entry, index) => {
              const isActive = index === 0; // Highlight leader
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
                        className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg font-bold mr-3 ${
                          entry.holesPlayed === 0
                            ? "border-gray-300 text-gray-500"
                            : index === 0
                            ? "border-yellow-400 text-yellow-400"
                            : index === 1
                            ? "border-gray-400 text-gray-400"
                            : index === 2
                            ? "border-orange-400 text-orange-400"
                            : "border-gray-300 text-gray-500"
                        }`}
                      >
                        {entry.holesPlayed === 0 ? "-" : index + 1}
                      </div>

                      {/* Player Info */}
                      <div>
                        <h3 className="text-body-lg font-semibold text-charcoal font-display">
                          {entry.participant.team_name}{" "}
                          {entry.participant.position_name}
                        </h3>
                        <p className="text-label-sm text-turf font-primary">
                          Thru {entry.holesPlayed} holes
                        </p>
                      </div>
                    </div>

                    {/* Score Section */}
                    <div className="flex items-center space-x-6 text-right ml-auto">
                      <div>
                        <div className="text-xs text-gray-500">Total</div>
                        <div className="text-2xl font-bold text-gray-800">
                          {entry.holesPlayed === 0 ? "-" : entry.totalShots}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">To Par</div>
                        <div
                          className={`text-2xl font-bold ${
                            entry.holesPlayed === 0
                              ? "text-gray-500"
                              : getToParColor(entry.relativeToPar)
                          }`}
                        >
                          {entry.holesPlayed === 0
                            ? "-"
                            : formatToPar(entry.relativeToPar)}
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
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

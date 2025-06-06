import { X, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayerScore {
  participantId: string;
  participantName: string;
  participantType?: string;
  isMultiPlayer?: boolean;
  scores: number[];
}

interface TeeTimeGroup {
  id: string;
  players: PlayerScore[];
}

interface Course {
  id: string;
  name: string;
  holes: {
    number: number;
    par: number;
  }[];
}

interface FullScorecardModalProps {
  visible: boolean;
  teeTimeGroup: TeeTimeGroup;
  course: Course;
  currentHole: number;
  onClose: () => void;
  onContinueEntry: (hole: number) => void;
}

export function FullScorecardModal({
  visible,
  teeTimeGroup,
  course,
  currentHole,
  onClose,
  onContinueEntry,
}: FullScorecardModalProps) {
  if (!visible) return null;

  const frontNine = course.holes.slice(0, 9);
  const backNine = course.holes.slice(9, 18);

  const calculateTotal = (
    playerScores: number[],
    holes: { number: number }[]
  ) => {
    return holes.reduce((total, hole) => {
      const score = playerScores[hole.number - 1];
      // Only count actual scores (positive numbers) in totals
      // Exclude gave up (-1) and not reported (0) holes
      return total + (score && score > 0 ? score : 0);
    }, 0);
  };

  // Helper function to format score display
  const formatScoreDisplay = (score: number): string => {
    if (score === -1) return "-"; // Gave up
    if (score === 0) return "0"; // Not reported
    return score.toString(); // Actual score
  };

  // Helper function to check if score should be counted in color coding
  const isValidScore = (score: number): boolean => {
    return score > 0;
  };

  // Helper function to calculate played holes par
  const calculatePlayedPar = (
    playerScores: number[],
    holes: { number: number; par: number }[]
  ) => {
    return holes.reduce((totalPar, hole) => {
      const score = playerScores[hole.number - 1];
      // Only count par for holes that have been played (score > 0)
      // Exclude gave up (-1) and not reported (0) holes
      return totalPar + (score && score > 0 ? hole.par : 0);
    }, 0);
  };

  const getPlayerTotals = (player: PlayerScore) => {
    // Check if player gave up on any hole - if so, invalidate entire round
    const hasGaveUp = player.scores.some((score) => score === -1);

    if (hasGaveUp) {
      return {
        frontTotal: null,
        backTotal: null,
        totalScore: null,
        toPar: null,
        frontToPar: null,
        backToPar: null,
      };
    }

    const frontTotal = calculateTotal(player.scores, frontNine);
    const backTotal = calculateTotal(player.scores, backNine);
    const totalScore = frontTotal + backTotal;

    // Calculate par only for played holes
    const frontPlayedPar = calculatePlayedPar(player.scores, frontNine);
    const backPlayedPar = calculatePlayedPar(player.scores, backNine);
    const totalPlayedPar = frontPlayedPar + backPlayedPar;

    return {
      frontTotal,
      backTotal,
      totalScore,
      toPar: totalScore > 0 ? totalScore - totalPlayedPar : 0,
      frontToPar: frontTotal > 0 ? frontTotal - frontPlayedPar : 0,
      backToPar: backTotal > 0 ? backTotal - backPlayedPar : 0,
    };
  };

  const formatToPar = (toPar: number) => {
    if (toPar === 0) return "E";
    return toPar > 0 ? `+${toPar}` : `${toPar}`;
  };

  const renderScoreColor = (score: number, par: number) => {
    let scoreColor = "text-gray-900";

    if (isValidScore(score)) {
      if (score === 1) scoreColor = "text-purple-600 font-bold"; // Hole in one
      else if (score < par - 1)
        scoreColor = "text-purple-600 font-bold"; // Eagle or better
      else if (score === par - 1)
        scoreColor = "text-blue-600 font-bold"; // Birdie
      else if (score === par) scoreColor = "text-gray-900"; // Par
      else if (score === par + 1) scoreColor = "text-orange-600"; // Bogey
      else if (score >= par + 2) scoreColor = "text-red-600"; // Double bogey or worse
    } else if (score === -1) {
      scoreColor = "text-red-500"; // Gave up
    } else if (score === 0) {
      scoreColor = "text-gray-400"; // Not reported
    }

    return scoreColor;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
      <div
        className={cn(
          "bg-white w-full max-h-[90vh] rounded-t-2xl transition-transform duration-300 ease-in-out",
          "transform translate-y-0"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold">Full Scorecard</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="px-2 py-4 space-y-6">
            {teeTimeGroup.players.map((player) => {
              const totals = getPlayerTotals(player);

              return (
                <div
                  key={player.participantId}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                >
                  {/* Player Name Header */}
                  <div className="bg-green-600 text-white px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-lg">
                          {player.participantName}
                        </span>
                        {player.isMultiPlayer && (
                          <span className="text-green-200 text-sm">👥</span>
                        )}
                      </div>
                      {player.participantType && (
                        <span className="text-green-200 text-sm">
                          {player.participantType}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Front Nine */}
                  <div className="overflow-x-auto">
                    <div className="min-w-max">
                      {/* Front Nine Header */}
                      <div className="bg-green-500 text-white">
                        <div className="flex">
                          <div className="w-12 min-w-[48px] px-1 py-2 text-xs font-medium">
                            Hole
                          </div>
                          {frontNine.map((hole) => (
                            <div
                              key={hole.number}
                              className={cn(
                                "w-8 min-w-[32px] px-1 py-2 text-center text-xs font-medium",
                                hole.number === currentHole && "bg-blue-500"
                              )}
                            >
                              {hole.number}
                            </div>
                          ))}
                          <div className="w-10 min-w-[40px] px-1 py-2 text-center text-xs font-medium">
                            Out
                          </div>
                        </div>
                      </div>

                      {/* Front Nine Par */}
                      <div className="bg-gray-100 border-b border-gray-200">
                        <div className="flex">
                          <div className="w-12 min-w-[48px] px-1 py-2 text-xs font-medium text-gray-700">
                            Par
                          </div>
                          {frontNine.map((hole) => (
                            <div
                              key={hole.number}
                              className="w-8 min-w-[32px] px-1 py-2 text-center text-xs font-medium text-gray-700"
                            >
                              {hole.par}
                            </div>
                          ))}
                          <div className="w-10 min-w-[40px] px-1 py-2 text-center text-xs font-bold text-gray-700">
                            {frontNine.reduce((sum, hole) => sum + hole.par, 0)}
                          </div>
                        </div>
                      </div>

                      {/* Front Nine Results */}
                      <div className="bg-white border-b border-gray-300">
                        <div className="flex">
                          <div className="w-12 min-w-[48px] px-1 py-2 text-xs font-medium text-gray-700">
                            Result
                          </div>
                          {frontNine.map((hole) => {
                            const score = player.scores[hole.number - 1] ?? 0;
                            const scoreColor = renderScoreColor(
                              score,
                              hole.par
                            );

                            return (
                              <div
                                key={hole.number}
                                className={cn(
                                  "w-8 min-w-[32px] px-1 py-2 text-center text-xs font-medium",
                                  hole.number === currentHole && "bg-blue-50",
                                  scoreColor
                                )}
                              >
                                {formatScoreDisplay(score)}
                              </div>
                            );
                          })}
                          <div className="w-10 min-w-[40px] px-1 py-2 text-center text-xs font-bold text-gray-900">
                            {totals.frontTotal ?? "-"}
                          </div>
                        </div>
                      </div>

                      {/* Back Nine Header */}
                      <div className="bg-green-500 text-white">
                        <div className="flex">
                          <div className="w-12 min-w-[48px] px-1 py-2 text-xs font-medium">
                            Hole
                          </div>
                          {backNine.map((hole) => (
                            <div
                              key={hole.number}
                              className={cn(
                                "w-8 min-w-[32px] px-1 py-2 text-center text-xs font-medium",
                                hole.number === currentHole && "bg-blue-500"
                              )}
                            >
                              {hole.number}
                            </div>
                          ))}
                          <div className="w-10 min-w-[40px] px-1 py-2 text-center text-xs font-medium">
                            In
                          </div>
                        </div>
                      </div>

                      {/* Back Nine Par */}
                      <div className="bg-gray-100 border-b border-gray-200">
                        <div className="flex">
                          <div className="w-12 min-w-[48px] px-1 py-2 text-xs font-medium text-gray-700">
                            Par
                          </div>
                          {backNine.map((hole) => (
                            <div
                              key={hole.number}
                              className="w-8 min-w-[32px] px-1 py-2 text-center text-xs font-medium text-gray-700"
                            >
                              {hole.par}
                            </div>
                          ))}
                          <div className="w-10 min-w-[40px] px-1 py-2 text-center text-xs font-bold text-gray-700">
                            {backNine.reduce((sum, hole) => sum + hole.par, 0)}
                          </div>
                        </div>
                      </div>

                      {/* Back Nine Results */}
                      <div className="bg-white">
                        <div className="flex">
                          <div className="w-12 min-w-[48px] px-1 py-2 text-xs font-medium text-gray-700">
                            Result
                          </div>
                          {backNine.map((hole) => {
                            const score = player.scores[hole.number - 1] ?? 0;
                            const scoreColor = renderScoreColor(
                              score,
                              hole.par
                            );

                            return (
                              <div
                                key={hole.number}
                                className={cn(
                                  "w-8 min-w-[32px] px-1 py-2 text-center text-xs font-medium",
                                  hole.number === currentHole && "bg-blue-50",
                                  scoreColor
                                )}
                              >
                                {formatScoreDisplay(score)}
                              </div>
                            );
                          })}
                          <div className="w-10 min-w-[40px] px-1 py-2 text-center text-xs font-bold text-gray-900">
                            {totals.backTotal ?? "-"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Player Total Section */}
                  <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">
                        Total Score
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="text-gray-600 text-sm">
                          Total: {totals.totalScore ?? "-"}
                        </span>
                        <span className="text-lg font-bold text-gray-900">
                          To par:{" "}
                          {totals.totalScore && totals.toPar !== null
                            ? formatToPar(totals.toPar)
                            : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => onContinueEntry(currentHole)}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Continue Entry on Hole {currentHole}
          </button>
        </div>
      </div>
    </div>
  );
}

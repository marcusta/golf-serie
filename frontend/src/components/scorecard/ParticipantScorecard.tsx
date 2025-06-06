import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ParticipantData {
  id: number;
  team_name: string;
  position_name: string;
  player_names: string | null;
  score: number[];
  tee_time_id: number;
}

export interface CourseData {
  id: string;
  name: string;
  holes: {
    number: number;
    par: number;
  }[];
}

interface ParticipantScorecardProps {
  visible: boolean;
  participant: ParticipantData | null;
  course: CourseData | null;
  onClose: () => void;
}

export function ParticipantScorecard({
  visible,
  participant,
  course,
  onClose,
}: ParticipantScorecardProps) {
  if (!visible || !participant || !course) return null;

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

  const getPlayerTotals = () => {
    // Check if player gave up on any hole - if so, invalidate entire round
    const hasGaveUp = participant.score.some((score) => score === -1);

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

    const frontTotal = calculateTotal(participant.score, frontNine);
    const backTotal = calculateTotal(participant.score, backNine);
    const totalScore = frontTotal + backTotal;

    // Calculate par only for played holes
    const frontPlayedPar = calculatePlayedPar(participant.score, frontNine);
    const backPlayedPar = calculatePlayedPar(participant.score, backNine);
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

  const renderScoreDecoration = (score: number, par: number) => {
    if (!isValidScore(score)) {
      if (score === -1) return { color: "text-red-500", decoration: "" }; // Gave up
      if (score === 0) return { color: "text-gray-400", decoration: "" }; // Not reported
      return { color: "text-gray-900", decoration: "" };
    }

    if (score === 1) {
      // Hole in one - special case (purple circle)
      return {
        color: "text-white font-bold",
        decoration: "bg-purple-600 rounded-full border-2 border-purple-600",
      };
    } else if (score < par - 1) {
      // Eagle or better - red double circle
      return {
        color: "text-red-600 font-bold",
        decoration:
          "border-2 border-red-600 rounded-full shadow-[0_0_0_2px_white,0_0_0_4px_red]",
      };
    } else if (score === par - 1) {
      // Birdie - red circle
      return {
        color: "text-red-600 font-bold",
        decoration: "border-2 border-red-600 rounded-full",
      };
    } else if (score === par) {
      // Par - no decoration
      return { color: "text-gray-900", decoration: "" };
    } else if (score === par + 1) {
      // Bogey - blue square
      return {
        color: "text-blue-600 font-bold",
        decoration: "border-2 border-blue-600",
      };
    } else if (score >= par + 2) {
      // Double bogey or worse - double blue square
      return {
        color: "text-blue-600 font-bold",
        decoration:
          "border-2 border-blue-600 shadow-[0_0_0_2px_white,0_0_0_4px_blue]",
      };
    }

    return { color: "text-gray-900", decoration: "" };
  };

  const totals = getPlayerTotals();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Team: {participant.team_name}
            </h2>
            <p className="text-sm text-blue-600 mt-1">
              {participant.position_name}
            </p>
            {participant.player_names && (
              <p className="text-sm text-gray-600 mt-1">
                Players: {participant.player_names}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scorecard */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="px-2 py-4">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Player Name Header */}
              <div className="bg-green-600 text-white px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-lg">
                    {participant.team_name}
                  </span>
                  <span className="text-green-200 text-sm">
                    {participant.position_name}
                  </span>
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
                          className="w-8 min-w-[32px] px-1 py-2 text-center text-xs font-medium"
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
                        const score = participant.score[hole.number - 1] ?? 0;
                        const scoreStyle = renderScoreDecoration(
                          score,
                          hole.par
                        );

                        return (
                          <div
                            key={hole.number}
                            className="w-8 min-w-[32px] px-1 py-2 text-center text-xs font-medium flex items-center justify-center"
                          >
                            <div
                              className={cn(
                                "w-6 h-6 flex items-center justify-center",
                                scoreStyle.color,
                                scoreStyle.decoration
                              )}
                            >
                              {formatScoreDisplay(score)}
                            </div>
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
                          className="w-8 min-w-[32px] px-1 py-2 text-center text-xs font-medium"
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
                        const score = participant.score[hole.number - 1] ?? 0;
                        const scoreStyle = renderScoreDecoration(
                          score,
                          hole.par
                        );

                        return (
                          <div
                            key={hole.number}
                            className="w-8 min-w-[32px] px-1 py-2 text-center text-xs font-medium flex items-center justify-center"
                          >
                            <div
                              className={cn(
                                "w-6 h-6 flex items-center justify-center",
                                scoreStyle.color,
                                scoreStyle.decoration
                              )}
                            >
                              {formatScoreDisplay(score)}
                            </div>
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
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 transition-colors"
          >
            Close Scorecard
          </button>
        </div>
      </div>
    </div>
  );
}

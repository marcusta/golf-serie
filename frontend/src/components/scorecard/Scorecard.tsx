import { cn } from "@/lib/utils";
import {
  formatToPar,
  formatScoreDisplay,
  isValidScore,
  calculateHoleTotal,
  calculatePlayedPar,
} from "../../utils/scoreCalculations";

interface ScorecardParticipant {
  id: string;
  name: string;
  type?: string;
  isMultiPlayer?: boolean;
  scores: number[];
}

interface ScorecardCourse {
  holes: {
    number: number;
    par: number;
  }[];
}

interface ScorecardProps {
  participant: ScorecardParticipant;
  course: ScorecardCourse;
  currentHole?: number;
}

export function Scorecard({
  participant,
  course,
  currentHole,
}: ScorecardProps) {
  const frontNine = course.holes.slice(0, 9);
  const backNine = course.holes.slice(9, 18);

  const getPlayerTotals = () => {
    // Check if player gave up on any hole - if so, invalidate entire round
    const hasGaveUp = participant.scores.some((score) => score === -1);

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

    const frontTotal = calculateHoleTotal(participant.scores, frontNine);
    const backTotal = calculateHoleTotal(participant.scores, backNine);
    const totalScore = frontTotal + backTotal;

    // Calculate par only for played holes
    const frontPlayedPar = calculatePlayedPar(participant.scores, frontNine);
    const backPlayedPar = calculatePlayedPar(participant.scores, backNine);
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
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Player Name Header */}
      <div className="bg-green-600 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg">{participant.name}</span>
            {participant.isMultiPlayer && (
              <span className="text-green-200 text-sm">👥</span>
            )}
          </div>
          {participant.type && (
            <span className="text-green-200 text-sm">{participant.type}</span>
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
                const score = participant.scores[hole.number - 1] ?? 0;
                const scoreStyle = renderScoreDecoration(score, hole.par);

                return (
                  <div
                    key={hole.number}
                    className={cn(
                      "w-8 min-w-[32px] px-1 py-2 text-center text-xs font-medium flex items-center justify-center",
                      hole.number === currentHole && "bg-blue-50"
                    )}
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
                const score = participant.scores[hole.number - 1] ?? 0;
                const scoreStyle = renderScoreDecoration(score, hole.par);

                return (
                  <div
                    key={hole.number}
                    className={cn(
                      "w-8 min-w-[32px] px-1 py-2 text-center text-xs font-medium flex items-center justify-center",
                      hole.number === currentHole && "bg-blue-50"
                    )}
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
          <span className="text-sm font-medium text-gray-700">Total Score</span>
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
}

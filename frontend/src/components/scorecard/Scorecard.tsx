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
      if (score === -1) return { color: "text-flag", decoration: "" }; // Gave up
      if (score === 0) return { color: "text-soft-grey", decoration: "" }; // Not reported
      return { color: "text-charcoal", decoration: "" };
    }

    if (score === 1) {
      // Hole in one - special case (purple circle)
      return {
        color: "text-scorecard font-bold",
        decoration: "bg-coral rounded-full border-2 border-coral",
      };
    } else if (score < par - 1) {
      // Eagle or better - turf double circle
      return {
        color: "text-turf font-bold",
        decoration:
          "border-2 border-turf rounded-full shadow-[0_0_0_2px_white,0_0_0_4px_#2d6a4f]",
      };
    } else if (score === par - 1) {
      // Birdie - turf circle
      return {
        color: "text-turf font-bold",
        decoration: "border-2 border-turf rounded-full",
      };
    } else if (score === par) {
      // Par - no decoration
      return { color: "text-charcoal", decoration: "" };
    } else if (score === par + 1) {
      // Bogey - flag square
      return {
        color: "text-flag font-bold",
        decoration: "border-2 border-flag",
      };
    } else if (score >= par + 2) {
      // Double bogey or worse - double flag square
      return {
        color: "text-flag font-bold",
        decoration:
          "border-2 border-flag shadow-[0_0_0_2px_white,0_0_0_4px_#ef476f]",
      };
    }

    return { color: "text-charcoal", decoration: "" };
  };

  const totals = getPlayerTotals();

  return (
    <div className="bg-scorecard overflow-hidden">
      {/* Player Name Header */}
      <div className="bg-turf text-scorecard px-2 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-base font-display">
              {participant.name}
            </span>
            {participant.isMultiPlayer && (
              <span className="text-rough text-sm">👥</span>
            )}
          </div>
          {participant.type && (
            <span className="text-rough text-sm font-primary">
              {participant.type}
            </span>
          )}
        </div>
      </div>

      {/* Front Nine Section */}
      <div className="border-b border-soft-grey">
        {/* Front Nine Section Header */}
        <div className="bg-turf text-scorecard px-2 py-1">
          <span className="text-sm font-medium font-primary">FRONT NINE</span>
        </div>
        {/* Front Nine Header */}
        <div className="bg-rough bg-opacity-30">
          <div className="flex">
            <div className="w-10 min-w-10 px-0.5 py-1 text-xs font-medium text-fairway border-r border-soft-grey font-primary">
              Hole
            </div>
            {frontNine.map((hole) => (
              <div
                key={hole.number}
                className={cn(
                  "min-w-6 px-0.5 py-1 text-center text-xs font-medium text-fairway border-r border-soft-grey flex-1 font-primary",
                  hole.number === currentHole && "bg-coral"
                )}
              >
                {hole.number}
              </div>
            ))}
            <div className="min-w-10 px-0.5 py-1 text-center text-xs font-medium text-fairway bg-rough bg-opacity-50 font-primary">
              OUT
            </div>
          </div>
        </div>

        {/* Front Nine Par */}
        <div className="bg-rough bg-opacity-20">
          <div className="flex">
            <div className="w-10 min-w-10 px-0.5 py-1 text-xs font-medium text-fairway border-r border-soft-grey font-primary">
              Par
            </div>
            {frontNine.map((hole) => (
              <div
                key={hole.number}
                className="min-w-6 px-0.5 py-1 text-center text-xs font-medium text-fairway border-r border-soft-grey flex-1 font-primary"
              >
                {hole.par}
              </div>
            ))}
            <div className="min-w-10 px-0.5 py-1 text-center text-xs font-bold text-fairway bg-rough bg-opacity-40 font-display">
              {frontNine.reduce((sum, hole) => sum + hole.par, 0)}
            </div>
          </div>
        </div>

        {/* Front Nine Results */}
        <div className="bg-scorecard border-b border-soft-grey">
          <div className="flex">
            <div className="w-10 min-w-10 px-0.5 py-1 text-xs font-medium text-fairway border-r border-soft-grey font-primary">
              Score
            </div>
            {frontNine.map((hole) => {
              const score = participant.scores[hole.number - 1] ?? 0;
              const scoreStyle = renderScoreDecoration(score, hole.par);

              return (
                <div
                  key={hole.number}
                  className={cn(
                    "min-w-6 px-0.5 py-1 text-center text-xs font-medium flex items-center justify-center border-r border-soft-grey flex-1",
                    hole.number === currentHole && "bg-coral bg-opacity-20"
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 flex items-center justify-center text-xs font-display",
                      scoreStyle.color,
                      scoreStyle.decoration
                    )}
                  >
                    {formatScoreDisplay(score)}
                  </div>
                </div>
              );
            })}
            <div className="min-w-10 px-0.5 py-1 text-center text-xs font-bold text-charcoal bg-rough bg-opacity-40 font-display">
              {totals.frontTotal ?? "-"}
            </div>
          </div>
        </div>
      </div>

      {/* Back Nine Section */}
      <div className="border-b border-soft-grey">
        {/* Back Nine Section Header */}
        <div className="bg-turf text-scorecard px-2 py-1">
          <span className="text-sm font-medium font-primary">BACK NINE</span>
        </div>
        {/* Back Nine Header */}
        <div className="bg-rough bg-opacity-30">
          <div className="flex">
            <div className="w-10 min-w-10 px-0.5 py-1 text-xs font-medium text-fairway border-r border-soft-grey font-primary">
              Hole
            </div>
            {backNine.map((hole) => (
              <div
                key={hole.number}
                className={cn(
                  "min-w-6 px-0.5 py-1 text-center text-xs font-medium text-fairway border-r border-soft-grey flex-1 font-primary",
                  hole.number === currentHole && "bg-coral"
                )}
              >
                {hole.number}
              </div>
            ))}
            <div className="min-w-10 px-0.5 py-1 text-center text-xs font-medium text-fairway bg-rough bg-opacity-50 font-primary">
              IN
            </div>
          </div>
        </div>

        {/* Back Nine Par */}
        <div className="bg-rough bg-opacity-20">
          <div className="flex">
            <div className="w-10 min-w-10 px-0.5 py-1 text-xs font-medium text-fairway border-r border-soft-grey font-primary">
              Par
            </div>
            {backNine.map((hole) => (
              <div
                key={hole.number}
                className="min-w-6 px-0.5 py-1 text-center text-xs font-medium text-fairway border-r border-soft-grey flex-1 font-primary"
              >
                {hole.par}
              </div>
            ))}
            <div className="min-w-10 px-0.5 py-1 text-center text-xs font-bold text-fairway bg-rough bg-opacity-40 font-display">
              {backNine.reduce((sum, hole) => sum + hole.par, 0)}
            </div>
          </div>
        </div>

        {/* Back Nine Results */}
        <div className="bg-scorecard">
          <div className="flex">
            <div className="w-10 min-w-10 px-0.5 py-1 text-xs font-medium text-fairway border-r border-soft-grey font-primary">
              Score
            </div>
            {backNine.map((hole) => {
              const score = participant.scores[hole.number - 1] ?? 0;
              const scoreStyle = renderScoreDecoration(score, hole.par);

              return (
                <div
                  key={hole.number}
                  className={cn(
                    "min-w-6 px-0.5 py-1 text-center text-xs font-medium flex items-center justify-center border-r border-soft-grey flex-1",
                    hole.number === currentHole && "bg-coral bg-opacity-20"
                  )}
                >
                  <div
                    className={cn(
                      "w-5 h-5 flex items-center justify-center text-xs font-display",
                      scoreStyle.color,
                      scoreStyle.decoration
                    )}
                  >
                    {formatScoreDisplay(score)}
                  </div>
                </div>
              );
            })}
            <div className="min-w-10 px-0.5 py-1 text-center text-xs font-bold text-charcoal bg-rough bg-opacity-40 font-display">
              {totals.backTotal ?? "-"}
            </div>
          </div>
        </div>
      </div>

      {/* Totals Section */}
      <div className="bg-rough bg-opacity-20 px-2 py-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-fairway font-primary">
            Total Score
          </span>
          <div className="flex items-center gap-3">
            <span className="text-turf text-sm font-primary">
              Total: {totals.totalScore ?? "-"}
            </span>
            <span className="text-base font-bold text-charcoal font-display">
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

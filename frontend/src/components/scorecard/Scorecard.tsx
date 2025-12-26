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
  // Net scoring props (for tour competitions with handicap)
  strokeIndex?: number[];
  handicapStrokesPerHole?: number[];
  courseHandicap?: number;
  handicapIndex?: number;
}

export function Scorecard({
  participant,
  course,
  currentHole,
  strokeIndex,
  handicapStrokesPerHole,
  courseHandicap,
  handicapIndex,
}: ScorecardProps) {
  const frontNine = course.holes.slice(0, 9);
  const backNine = course.holes.slice(9, 18);

  // Check if we should show net scoring info
  const showNetScoring = !!(strokeIndex && handicapStrokesPerHole && courseHandicap !== undefined);

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
        netFrontTotal: null,
        netBackTotal: null,
        netTotalScore: null,
        netToPar: null,
      };
    }

    const frontTotal = calculateHoleTotal(participant.scores, frontNine);
    const backTotal = calculateHoleTotal(participant.scores, backNine);
    const totalScore = frontTotal + backTotal;

    // Calculate par only for played holes
    const frontPlayedPar = calculatePlayedPar(participant.scores, frontNine);
    const backPlayedPar = calculatePlayedPar(participant.scores, backNine);
    const totalPlayedPar = frontPlayedPar + backPlayedPar;

    // Calculate net totals if handicap data is available
    let netFrontTotal: number | null = null;
    let netBackTotal: number | null = null;
    let netTotalScore: number | null = null;
    let netToPar: number | null = null;

    if (showNetScoring && handicapStrokesPerHole) {
      // Calculate net score for front nine (holes 0-8)
      const frontNetStrokes = handicapStrokesPerHole.slice(0, 9).reduce((sum, strokes) => sum + strokes, 0);
      netFrontTotal = frontTotal - frontNetStrokes;

      // Calculate net score for back nine (holes 9-17)
      const backNetStrokes = handicapStrokesPerHole.slice(9, 18).reduce((sum, strokes) => sum + strokes, 0);
      netBackTotal = backTotal - backNetStrokes;

      netTotalScore = netFrontTotal + netBackTotal;
      netToPar = netTotalScore > 0 ? netTotalScore - totalPlayedPar : 0;
    }

    return {
      frontTotal,
      backTotal,
      totalScore,
      toPar: totalScore > 0 ? totalScore - totalPlayedPar : 0,
      frontToPar: frontTotal > 0 ? frontTotal - frontPlayedPar : 0,
      backToPar: backTotal > 0 ? backTotal - backPlayedPar : 0,
      netFrontTotal,
      netBackTotal,
      netTotalScore,
      netToPar,
    };
  };

  const renderScoreDecoration = (score: number, par: number) => {
    if (!isValidScore(score)) {
      if (score === -1) return { color: "text-red-600", decoration: "" }; // Gave up
      if (score === 0) return { color: "text-soft-grey", decoration: "" }; // Not reported
      return { color: "text-charcoal", decoration: "" };
    }

    if (score === 1) {
      // Hole in one - special case (red circle)
      return {
        color: "text-scorecard font-bold",
        decoration: "bg-red-800 rounded-full border-2 border-red-800",
      };
    } else if (score < par - 1) {
      // Eagle or better - red double circle
      return {
        color: "text-red-800 font-bold",
        decoration:
          "border-2 border-red-800 rounded-full shadow-[0_0_0_2px_white,0_0_0_4px_#aa2626]",
      };
    } else if (score === par - 1) {
      // Birdie - red circle
      return {
        color: "text-red-800 font-bold",
        decoration: "border-2 border-red-800 rounded-full",
      };
    } else if (score === par) {
      // Par - fairway green (no decoration)
      return { color: "text-turf", decoration: "" };
    } else if (score === par + 1) {
      // Bogey - dark blue square
      return {
        color: "text-blue-900 font-bold",
        decoration: "border-2 border-blue-900",
      };
    } else if (score === par + 2) {
      // Double bogey - dark blue double square
      return {
        color: "text-blue-900 font-bold",
        decoration:
          "border-2 border-blue-900 shadow-[0_0_0_2px_white,0_0_0_4px_#1e40af]",
      };
    } else if (score >= par + 3) {
      // Triple bogey or worse - bright blue double square
      return {
        color: "text-blue-600 font-bold",
        decoration:
          "border-2 border-blue-600 shadow-[0_0_0_2px_white,0_0_0_4px_#60a5fa]",
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
          <div className="flex items-center gap-3">
            {/* Show handicap info when net scoring is enabled */}
            {showNetScoring && (
              <div className="flex items-center gap-2 text-xs font-primary">
                {handicapIndex !== undefined && (
                  <span className="bg-scorecard/20 px-1.5 py-0.5 rounded">
                    HCP {handicapIndex.toFixed(1)}
                  </span>
                )}
                {courseHandicap !== undefined && (
                  <span className="bg-coral/30 px-1.5 py-0.5 rounded font-medium">
                    PH {courseHandicap}
                  </span>
                )}
              </div>
            )}
            {participant.type && (
              <span className="text-rough text-sm font-primary">
                {participant.type}
              </span>
            )}
          </div>
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

        {/* Front Nine Stroke Index - only show when net scoring enabled */}
        {showNetScoring && strokeIndex && (
          <div className="bg-rough bg-opacity-10">
            <div className="flex">
              <div className="w-10 min-w-10 px-0.5 py-1 text-xs font-medium text-fairway border-r border-soft-grey font-primary">
                SI
              </div>
              {frontNine.map((hole) => {
                const si = strokeIndex[hole.number - 1];
                const receivesStroke = handicapStrokesPerHole && handicapStrokesPerHole[hole.number - 1] > 0;
                return (
                  <div
                    key={hole.number}
                    className={cn(
                      "min-w-6 px-0.5 py-1 text-center text-xs font-medium border-r border-soft-grey flex-1 font-primary",
                      receivesStroke ? "text-coral font-bold" : "text-turf"
                    )}
                  >
                    {si}
                  </div>
                );
              })}
              <div className="min-w-10 px-0.5 py-1 text-center text-xs font-medium text-fairway bg-rough bg-opacity-30 font-primary">
                -
              </div>
            </div>
          </div>
        )}

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

        {/* Front Nine Net Results - only show when net scoring enabled */}
        {showNetScoring && handicapStrokesPerHole && (
          <div className="bg-coral/5 border-b border-soft-grey">
            <div className="flex">
              <div className="w-10 min-w-10 px-0.5 py-1 text-xs font-medium text-coral border-r border-soft-grey font-primary">
                Net
              </div>
              {frontNine.map((hole) => {
                const score = participant.scores[hole.number - 1] ?? 0;
                const strokes = handicapStrokesPerHole[hole.number - 1] ?? 0;
                const netScore = isValidScore(score) ? score - strokes : 0;
                const netScoreStyle = isValidScore(score) ? renderScoreDecoration(netScore, hole.par) : { color: "text-soft-grey", decoration: "" };

                return (
                  <div
                    key={hole.number}
                    className={cn(
                      "min-w-6 px-0.5 py-1 text-center text-xs font-medium flex items-center justify-center border-r border-soft-grey flex-1 relative",
                      hole.number === currentHole && "bg-coral bg-opacity-10"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 flex items-center justify-center text-xs font-display",
                        netScoreStyle.color,
                        netScoreStyle.decoration
                      )}
                    >
                      {isValidScore(score) ? netScore : "-"}
                    </div>
                    {/* Stroke indicator dot */}
                    {strokes > 0 && (
                      <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-coral rounded-full" />
                    )}
                  </div>
                );
              })}
              <div className="min-w-10 px-0.5 py-1 text-center text-xs font-bold text-coral bg-coral/10 font-display">
                {totals.netFrontTotal ?? "-"}
              </div>
            </div>
          </div>
        )}
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

        {/* Back Nine Stroke Index - only show when net scoring enabled */}
        {showNetScoring && strokeIndex && (
          <div className="bg-rough bg-opacity-10">
            <div className="flex">
              <div className="w-10 min-w-10 px-0.5 py-1 text-xs font-medium text-fairway border-r border-soft-grey font-primary">
                SI
              </div>
              {backNine.map((hole) => {
                const si = strokeIndex[hole.number - 1];
                const receivesStroke = handicapStrokesPerHole && handicapStrokesPerHole[hole.number - 1] > 0;
                return (
                  <div
                    key={hole.number}
                    className={cn(
                      "min-w-6 px-0.5 py-1 text-center text-xs font-medium border-r border-soft-grey flex-1 font-primary",
                      receivesStroke ? "text-coral font-bold" : "text-turf"
                    )}
                  >
                    {si}
                  </div>
                );
              })}
              <div className="min-w-10 px-0.5 py-1 text-center text-xs font-medium text-fairway bg-rough bg-opacity-30 font-primary">
                -
              </div>
            </div>
          </div>
        )}

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

        {/* Back Nine Net Results - only show when net scoring enabled */}
        {showNetScoring && handicapStrokesPerHole && (
          <div className="bg-coral/5">
            <div className="flex">
              <div className="w-10 min-w-10 px-0.5 py-1 text-xs font-medium text-coral border-r border-soft-grey font-primary">
                Net
              </div>
              {backNine.map((hole) => {
                const score = participant.scores[hole.number - 1] ?? 0;
                const strokes = handicapStrokesPerHole[hole.number - 1] ?? 0;
                const netScore = isValidScore(score) ? score - strokes : 0;
                const netScoreStyle = isValidScore(score) ? renderScoreDecoration(netScore, hole.par) : { color: "text-soft-grey", decoration: "" };

                return (
                  <div
                    key={hole.number}
                    className={cn(
                      "min-w-6 px-0.5 py-1 text-center text-xs font-medium flex items-center justify-center border-r border-soft-grey flex-1 relative",
                      hole.number === currentHole && "bg-coral bg-opacity-10"
                    )}
                  >
                    <div
                      className={cn(
                        "w-5 h-5 flex items-center justify-center text-xs font-display",
                        netScoreStyle.color,
                        netScoreStyle.decoration
                      )}
                    >
                      {isValidScore(score) ? netScore : "-"}
                    </div>
                    {/* Stroke indicator dot */}
                    {strokes > 0 && (
                      <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-coral rounded-full" />
                    )}
                  </div>
                );
              })}
              <div className="min-w-10 px-0.5 py-1 text-center text-xs font-bold text-coral bg-coral/10 font-display">
                {totals.netBackTotal ?? "-"}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Totals Section */}
      <div className="bg-rough bg-opacity-20 px-2 py-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-fairway font-primary">
            {showNetScoring ? "Gross" : "Total Score"}
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

      {/* Net Totals Section - only show when net scoring enabled */}
      {showNetScoring && (
        <div className="bg-coral/10 px-2 py-2 border-t border-coral/20">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-coral font-primary">
              Net
            </span>
            <div className="flex items-center gap-3">
              <span className="text-coral/80 text-sm font-primary">
                Total: {totals.netTotalScore ?? "-"}
              </span>
              <span className="text-base font-bold text-coral font-display">
                To par:{" "}
                {totals.netTotalScore && totals.netToPar !== null
                  ? formatToPar(totals.netToPar)
                  : "-"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

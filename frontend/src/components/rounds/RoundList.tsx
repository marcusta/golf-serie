import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { PlayerRoundHistory } from "@/api/player-profile";

interface RoundListProps {
  rounds: PlayerRoundHistory[];
  showViewAll?: boolean;
  viewAllLink?: string;
}

export function RoundList({ rounds, showViewAll = false, viewAllLink }: RoundListProps) {
  if (rounds.length === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-white rounded overflow-hidden divide-y divide-soft-grey">
        {rounds.map((round) => {
          const scoreClass = round.relative_to_par < 0
            ? "text-turf"
            : round.relative_to_par === 0
            ? "text-charcoal"
            : "text-coral";
          const scorePrefix = round.relative_to_par > 0 ? "+" : "";

          return (
            <Link
              key={round.participant_id}
              to="/player/competitions/$competitionId"
              params={{ competitionId: round.competition_id.toString() }}
              search={{ view: "teams" }}
              hash="leaderboard"
              className="block px-5 py-4 hover:bg-charcoal/5 transition-colors border-l-4 border-charcoal/30 hover:border-charcoal/50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-charcoal mb-1">
                    {round.competition_name}
                  </div>
                  <div className="flex items-center gap-3 text-body-sm text-charcoal/70 mb-2">
                    <span>{round.course_name}</span>
                    <span>•</span>
                    <span>{new Date(round.competition_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-4 text-body-sm">
                    <span className="text-charcoal/70">
                      Gross: <span className="font-semibold text-charcoal">{round.gross_score}</span>
                    </span>
                    {round.net_score && (
                      <span className="text-charcoal/70">
                        Net: <span className="font-semibold text-charcoal">{round.net_score}</span>
                      </span>
                    )}
                    <span className={`font-bold ${scoreClass}`}>
                      {scorePrefix}{round.relative_to_par}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-charcoal/40 flex-shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>

      {showViewAll && viewAllLink && (
        <div className="text-center mt-4">
          <Link
            to={viewAllLink}
            className="text-turf hover:underline text-body-sm font-medium inline-flex items-center gap-1"
          >
            View All Rounds
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}
    </>
  );
}

import { Link } from "@tanstack/react-router";
import { Trophy, Calendar, ChevronRight, TrendingUp } from "lucide-react";
import type { PlayerRoundHistory } from "@/api/player-profile";

interface ProfileRecentRoundsProps {
  rounds: PlayerRoundHistory[] | undefined;
  isLoading?: boolean;
}

function formatRelativeToPar(relativeToPar: number): string {
  if (relativeToPar === 0) return "E";
  if (relativeToPar > 0) return `+${relativeToPar}`;
  return relativeToPar.toString();
}

export function ProfileRecentRounds({ rounds, isLoading }: ProfileRecentRoundsProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border-l-4 border-turf mb-6 animate-pulse">
        <div className="px-4 pt-4 pb-2">
          <div className="h-6 bg-gray-200 rounded w-1/3" />
        </div>
        <div className="divide-y divide-soft-grey">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="px-4 py-3">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border-l-4 border-turf mb-6">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h2 className="text-lg font-display font-bold text-charcoal flex items-center gap-2">
          <Trophy className="h-5 w-5 text-turf" />
          Recent Rounds
        </h2>
      </div>

      {rounds && rounds.length > 0 ? (
        <div className="divide-y divide-soft-grey">
          {rounds.map((round) => (
            <Link
              key={round.participant_id}
              to="/player/competitions/$competitionId"
              params={{ competitionId: round.competition_id.toString() }}
              className="block"
            >
              <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-charcoal truncate">
                    {round.competition_name}
                  </div>
                  <div className="text-sm text-charcoal/60 flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-turf" />
                    {new Date(round.competition_date).toLocaleDateString()}
                    <span className="text-charcoal/40">•</span>
                    {round.course_name}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-bold text-charcoal">
                      {round.gross_score}
                    </div>
                    <div
                      className={`text-sm ${
                        round.relative_to_par < 0
                          ? "text-green-600"
                          : round.relative_to_par > 0
                            ? "text-red-600"
                            : "text-charcoal/60"
                      }`}
                    >
                      {formatRelativeToPar(round.relative_to_par)}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-charcoal/40" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 px-4 text-charcoal/60">
          <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p>No rounds played yet</p>
          <p className="text-sm">
            Rounds will appear here after playing competitions
          </p>
        </div>
      )}
    </div>
  );
}

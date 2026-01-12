import { Link } from "@tanstack/react-router";
import { BarChart3, ChevronRight, TrendingUp } from "lucide-react";
import type { PlayerRoundHistory } from "@/api/player-profile";
import { RoundList } from "@/components/rounds/RoundList";

interface ProfileRecentRoundsProps {
  rounds: PlayerRoundHistory[] | undefined;
  isLoading?: boolean;
  showViewAll?: boolean;
}

export function ProfileRecentRounds({ rounds, isLoading, showViewAll = true }: ProfileRecentRoundsProps) {
  if (isLoading) {
    return (
      <div className="mb-8">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4 animate-pulse" />
        <div className="bg-scorecard rounded-xl overflow-hidden divide-y divide-soft-grey animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="px-5 py-4">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!rounds || rounds.length === 0) {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-charcoal" />
          <h2 className="text-body-xl font-bold text-charcoal">Recent Rounds</h2>
        </div>
        <div className="bg-scorecard rounded-xl text-center py-12 px-4">
          <TrendingUp className="h-12 w-12 mx-auto mb-3 text-charcoal/20" />
          <p className="text-charcoal/60 mb-1">No rounds played yet</p>
          <p className="text-body-sm text-charcoal/50">
            Rounds will appear here after playing competitions
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-charcoal" />
          <h2 className="text-body-xl font-bold text-charcoal">Recent Rounds</h2>
        </div>
        {showViewAll && (
          <Link
            to="/player/rounds"
            className="text-turf hover:underline text-body-sm font-medium flex items-center gap-1"
          >
            View All
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      <RoundList rounds={rounds} />
    </div>
  );
}

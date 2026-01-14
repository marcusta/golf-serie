import { Link } from "@tanstack/react-router";
import { ChevronRight, Gamepad2, Users, Calendar } from "lucide-react";
import type { GameWithDetails } from "@/types/games";

interface ProfileCasualGamesProps {
  games: GameWithDetails[] | undefined;
  isLoading?: boolean;
  showViewAll?: boolean;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return (
        <span className="inline-block px-2 py-0.5 bg-turf/10 text-turf text-label-xs rounded font-medium">
          Active
        </span>
      );
    case "ready":
      return (
        <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 text-label-xs rounded font-medium">
          Ready
        </span>
      );
    case "completed":
      return (
        <span className="inline-block px-2 py-0.5 bg-charcoal/10 text-charcoal text-label-xs rounded font-medium">
          Completed
        </span>
      );
    case "setup":
      return (
        <span className="inline-block px-2 py-0.5 bg-sky/10 text-sky text-label-xs rounded font-medium">
          Setup
        </span>
      );
    default:
      return null;
  }
}

function formatGameDate(date: string | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ProfileCasualGames({
  games,
  isLoading,
  showViewAll = true,
}: ProfileCasualGamesProps) {
  if (isLoading) {
    return (
      <div className="bg-soft-grey/30 rounded-2xl shadow-lg p-6 mb-8">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4 animate-pulse" />
        <div className="bg-white rounded overflow-hidden divide-y divide-soft-grey animate-pulse">
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

  if (!games || games.length === 0) {
    return (
      <div className="bg-soft-grey/30 rounded-2xl shadow-lg p-6 mb-8">
        <h2 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
          Casual Games
        </h2>
        <div className="bg-white rounded text-center py-12 px-4">
          <Gamepad2 className="h-12 w-12 mx-auto mb-3 text-charcoal/20" />
          <p className="text-charcoal/60 mb-1">No casual games yet</p>
          <p className="text-body-sm text-charcoal/50 mb-4">
            Start a casual round with friends
          </p>
          <Link
            to="/player/games/new"
            className="inline-block bg-turf hover:bg-turf/90 text-scorecard px-4 py-2 rounded font-semibold transition-colors text-sm"
          >
            Start New Game
          </Link>
        </div>
      </div>
    );
  }

  // Show up to 5 most recent games
  const displayGames = games.slice(0, 5);

  return (
    <div className="bg-soft-grey/30 rounded-2xl shadow-lg p-6 mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-charcoal uppercase tracking-wide">
          Casual Games
        </h2>
        {showViewAll && (
          <Link
            to="/player/games"
            className="text-turf hover:underline text-body-sm font-medium flex items-center gap-1"
          >
            View All
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      <div className="bg-white rounded overflow-hidden divide-y divide-soft-grey">
        {displayGames.map((game) => (
          <Link
            key={game.id}
            to="/player/games/$gameId/play"
            params={{ gameId: game.id.toString() }}
            className="block px-5 py-4 hover:bg-turf/5 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-charcoal truncate">
                    {game.course_name}
                  </span>
                  {getStatusBadge(game.status)}
                </div>
                <div className="flex items-center gap-3 text-body-sm text-charcoal/70">
                  <div className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    <span>{game.player_count}</span>
                  </div>
                  {(game.scheduled_date || game.started_at) && (
                    <>
                      <span className="text-charcoal/40">|</span>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {formatGameDate(game.scheduled_date || game.started_at)}
                        </span>
                      </div>
                    </>
                  )}
                  {game.status !== "setup" && game.my_current_score && (
                    <>
                      <span className="text-charcoal/40">|</span>
                      <span className="font-medium text-turf">
                        {game.my_current_score}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-charcoal/40 flex-shrink-0 mt-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

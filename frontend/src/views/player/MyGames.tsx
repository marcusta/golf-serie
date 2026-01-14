import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useMyGames } from "@/api/games";
import { useAuth } from "@/hooks/useAuth";
import { PlayerPageLayout } from "@/components/layout/PlayerPageLayout";
import {
  Loader2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Users,
  Calendar,
  Gamepad2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function MyGames() {
  useAuth();
  const { data: games, isLoading } = useMyGames();
  const [showCompleted, setShowCompleted] = useState(false);

  // Separate active/ready games from completed
  const { activeGames, completedGames } = useMemo(() => {
    if (!games) return { activeGames: [], completedGames: [] };

    const active = games.filter(
      (g) => g.status === "active" || g.status === "ready" || g.status === "setup"
    );
    const completed = games.filter((g) => g.status === "completed");

    return { activeGames: active, completedGames: completed };
  }, [games]);

  if (isLoading) {
    return (
      <PlayerPageLayout title="My Games">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-turf" />
        </div>
      </PlayerPageLayout>
    );
  }

  const hasNoGames = activeGames.length === 0 && completedGames.length === 0;

  return (
    <PlayerPageLayout title="My Games">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Header with New Game Button */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-display-md font-display font-bold text-charcoal">
            My Casual Games
          </h1>
          <Link to="/player/games/new">
            <Button className="bg-turf hover:bg-turf/90 text-white">
              <Plus className="h-4 w-4 mr-2" />
              New Game
            </Button>
          </Link>
        </div>

        {/* Empty State */}
        {hasNoGames && (
          <div className="bg-soft-grey/30 rounded-2xl shadow-lg p-6">
            <div className="text-center py-12">
              <Gamepad2 className="h-16 w-16 mx-auto mb-4 text-charcoal/20" />
              <h2 className="text-display-sm font-semibold text-charcoal mb-2">
                No games yet
              </h2>
              <p className="text-body-md text-charcoal/60 mb-6 max-w-sm mx-auto">
                Start a casual round with friends and track your scores together.
              </p>
              <Link to="/player/games/new">
                <Button className="bg-turf hover:bg-turf/90 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Start New Game
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Active Games */}
        {activeGames.length > 0 && (
          <div className="bg-soft-grey/30 rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-sm font-bold text-charcoal mb-4 uppercase tracking-wide">
              Active Games
            </h2>
            <div className="bg-white rounded overflow-hidden divide-y divide-soft-grey">
              {activeGames.map((game) => (
                <Link
                  key={game.id}
                  to="/player/games/$gameId/play"
                  params={{ gameId: game.id.toString() }}
                  className="block px-5 py-4 hover:bg-turf/5 transition-colors border-l-4 border-turf hover:border-turf/80"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-charcoal truncate">
                          {game.course_name}
                        </span>
                        {getStatusBadge(game.status)}
                      </div>
                      <div className="flex items-center gap-3 text-body-sm text-charcoal/70 mb-1">
                        <div className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          <span>{game.player_count} players</span>
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
                      </div>
                      {game.status !== "setup" && game.my_holes_played !== undefined && (
                        <div className="text-body-sm text-turf font-medium">
                          {game.my_holes_played} holes played
                          {game.my_current_score && ` • ${game.my_current_score}`}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-charcoal/40 flex-shrink-0 mt-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Completed Games - Collapsible */}
        {completedGames.length > 0 && (
          <div className="bg-soft-grey/30 rounded-2xl shadow-lg overflow-hidden">
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-soft-grey/50 transition-colors"
            >
              <h2 className="text-sm font-bold text-charcoal uppercase tracking-wide">
                Completed Games ({completedGames.length})
              </h2>
              {showCompleted ? (
                <ChevronUp className="h-5 w-5 text-charcoal/60" />
              ) : (
                <ChevronDown className="h-5 w-5 text-charcoal/60" />
              )}
            </button>

            {showCompleted && (
              <div className="px-6 pb-6">
                <div className="bg-white rounded overflow-hidden divide-y divide-soft-grey">
                  {completedGames.map((game) => (
                    <Link
                      key={game.id}
                      to="/player/games/$gameId/play"
                      params={{ gameId: game.id.toString() }}
                      className="block px-5 py-4 hover:bg-charcoal/5 transition-colors border-l-4 border-charcoal/20 hover:border-charcoal/40"
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
                              <span>{game.player_count} players</span>
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
                            {game.my_current_score && (
                              <>
                                <span className="text-charcoal/40">|</span>
                                <span className="font-medium">
                                  Final: {game.my_current_score}
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
            )}
          </div>
        )}
      </div>
    </PlayerPageLayout>
  );
}

import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useMyGames, useLeaveGame } from "@/api/games";
import { useAuth } from "@/hooks/useAuth";
import { PlayerPageLayout } from "@/components/layout/PlayerPageLayout";
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  Users,
  Gamepad2,
  Plus,
  LogOut,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { GameWithDetails } from "@/types/games";
import { EditGameSheet } from "@/components/games/EditGameSheet";

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
  const { user } = useAuth();
  const { data: games, isLoading } = useMyGames();
  const leaveGame = useLeaveGame();
  const [showCompleted, setShowCompleted] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [gameToLeave, setGameToLeave] = useState<GameWithDetails | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [gameToEdit, setGameToEdit] = useState<GameWithDetails | null>(null);

  const handleEditClick = (e: React.MouseEvent, game: GameWithDetails) => {
    e.preventDefault();
    e.stopPropagation();
    setGameToEdit(game);
    setEditSheetOpen(true);
  };

  const isGameOwner = (game: GameWithDetails) => {
    return user?.id === game.owner_id;
  };

  const handleLeaveClick = (
    e: React.MouseEvent,
    game: GameWithDetails
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setGameToLeave(game);
    setLeaveDialogOpen(true);
  };

  const handleConfirmLeave = async () => {
    if (!gameToLeave) return;

    try {
      const result = await leaveGame.mutateAsync(gameToLeave.id);
      toast.success(result.message);
      setLeaveDialogOpen(false);
      setGameToLeave(null);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to leave game"
      );
    }
  };

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
        {/* Header with New Game button */}
        {!hasNoGames && (
          <div className="flex items-center justify-end mb-4">
            <Link to="/player/games/new">
              <Button size="sm" className="bg-turf hover:bg-turf/90 text-white">
                <Plus className="h-4 w-4 mr-1" />
                New Game
              </Button>
            </Link>
          </div>
        )}

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
                <div
                  key={game.id}
                  className="relative border-l-4 border-turf hover:border-turf/80"
                >
                  <Link
                    to="/player/games/$gameId/play"
                    params={{ gameId: game.id.toString() }}
                    className="block px-4 py-3 pr-20 hover:bg-turf/5 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-charcoal truncate">
                        {game.course_name}
                      </span>
                      {getStatusBadge(game.status)}
                    </div>
                    <div className="flex items-center gap-2 text-body-sm text-charcoal/70">
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        <span>{game.player_count}</span>
                      </div>
                      {(game.scheduled_date || game.started_at) && (
                        <>
                          <span className="text-charcoal/30">·</span>
                          <span>{formatGameDate(game.scheduled_date || game.started_at)}</span>
                        </>
                      )}
                      {game.status !== "setup" && game.my_holes_played !== undefined && (
                        <>
                          <span className="text-charcoal/30">·</span>
                          <span className="text-turf font-medium">
                            {game.my_holes_played}H {game.my_current_score && `(${game.my_current_score})`}
                          </span>
                        </>
                      )}
                    </div>
                  </Link>
                  {/* Action buttons - absolute positioned */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {isGameOwner(game) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-charcoal/40 hover:text-turf hover:bg-turf/10"
                        onClick={(e) => handleEditClick(e, game)}
                        title="Edit game settings"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-charcoal/40 hover:text-coral hover:bg-coral/10"
                      onClick={(e) => handleLeaveClick(e, game)}
                      title="Leave game"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
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
                    <div
                      key={game.id}
                      className="relative border-l-4 border-charcoal/20 hover:border-charcoal/40"
                    >
                      <Link
                        to="/player/games/$gameId/play"
                        params={{ gameId: game.id.toString() }}
                        className="block px-4 py-3 pr-20 hover:bg-charcoal/5 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-charcoal truncate">
                            {game.course_name}
                          </span>
                          {getStatusBadge(game.status)}
                        </div>
                        <div className="flex items-center gap-2 text-body-sm text-charcoal/70">
                          <div className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5" />
                            <span>{game.player_count}</span>
                          </div>
                          {(game.scheduled_date || game.started_at) && (
                            <>
                              <span className="text-charcoal/30">·</span>
                              <span>{formatGameDate(game.scheduled_date || game.started_at)}</span>
                            </>
                          )}
                          {game.my_current_score && (
                            <>
                              <span className="text-charcoal/30">·</span>
                              <span className="font-medium">
                                {game.my_current_score}
                              </span>
                            </>
                          )}
                        </div>
                      </Link>
                      {/* Action buttons - absolute positioned */}
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {isGameOwner(game) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 text-charcoal/40 hover:text-turf hover:bg-turf/10"
                            onClick={(e) => handleEditClick(e, game)}
                            title="Edit game settings"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-charcoal/40 hover:text-coral hover:bg-coral/10"
                          onClick={(e) => handleLeaveClick(e, game)}
                          title="Leave game"
                        >
                          <LogOut className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      {/* Leave Game Confirmation Dialog */}
      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Leave Game?</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave this game? If you're the owner and
              no scores have been entered, the game will be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setLeaveDialogOpen(false);
                setGameToLeave(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmLeave}
              disabled={leaveGame.isPending}
              className="bg-coral hover:bg-coral/90"
            >
              {leaveGame.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Leaving...
                </>
              ) : (
                "Leave Game"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Game Sheet */}
      {gameToEdit && (
        <EditGameSheet
          gameId={gameToEdit.id}
          game={gameToEdit}
          open={editSheetOpen}
          onOpenChange={(open) => {
            setEditSheetOpen(open);
            if (!open) {
              setGameToEdit(null);
            }
          }}
        />
      )}
      </div>
    </PlayerPageLayout>
  );
}

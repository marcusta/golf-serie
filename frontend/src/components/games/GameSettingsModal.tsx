import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, X, Info, Users, Settings } from "lucide-react";
import { toast } from "sonner";
import {
  useGamePlayers,
  useUpdateGame,
  useRemoveGamePlayer,
  useAssignTee,
  useLeaveGame,
} from "@/api/games";
import { useCourseTees } from "@/api/courses";
import type { GameWithDetails } from "@/types/games";
import type { GamePlayer } from "../../../../src/types";
import type { CourseTee } from "@/api/courses";

const GAME_TYPES = [
  { value: "stroke_play", label: "Stroke Play" },
];

const SCORING_MODES = [
  { value: "gross", label: "Gross Only" },
  { value: "net", label: "Net Only" },
  { value: "both", label: "Gross & Net" },
];

interface GameSettingsModalProps {
  gameId: number;
  game: GameWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOwner: boolean;
}

export function GameSettingsModal({
  gameId,
  game,
  open,
  onOpenChange,
  isOwner,
}: GameSettingsModalProps) {
  const navigate = useNavigate();
  const [gameName, setGameName] = useState(game.name || "");
  const [gameType, setGameType] = useState(game.game_type);
  const [scoringMode, setScoringMode] = useState<"gross" | "net" | "both">(
    (game.scoring_mode as "gross" | "net" | "both") || "gross"
  );
  const [activeTab, setActiveTab] = useState("players");

  const { data: players, isLoading: playersLoading } = useGamePlayers(gameId);
  const { data: tees, isLoading: teesLoading } = useCourseTees(game.course_id);

  const updateGame = useUpdateGame();
  const removePlayer = useRemoveGamePlayer();
  const assignTee = useAssignTee();
  const leaveGame = useLeaveGame();

  const gameHasScores = game.status !== "setup";

  useEffect(() => {
    if (open) {
      setGameName(game.name || "");
      setGameType(game.game_type);
      setScoringMode((game.scoring_mode as "gross" | "net" | "both") || "gross");
    }
  }, [open, game.name, game.game_type, game.scoring_mode]);

  const handleSaveName = async () => {
    if (!gameName.trim()) {
      toast.error("Game name cannot be empty");
      return;
    }
    try {
      await updateGame.mutateAsync({ gameId, data: { name: gameName.trim() } });
      toast.success("Game name updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    }
  };

  const handleChangeGameType = async (newType: string) => {
    try {
      await updateGame.mutateAsync({ gameId, data: { game_type: newType } });
      setGameType(newType);
      toast.success("Game type updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    }
  };

  const handleChangeScoringMode = async (newMode: "gross" | "net" | "both") => {
    try {
      await updateGame.mutateAsync({ gameId, data: { scoring_mode: newMode } });
      setScoringMode(newMode);
      toast.success("Scoring mode updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update");
    }
  };

  const handleRemovePlayer = async (playerId: number, playerName: string) => {
    try {
      await removePlayer.mutateAsync({ gameId, playerId });
      toast.success(`${playerName} removed`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove");
    }
  };

  const handleAssignTee = async (playerId: number, teeId: string) => {
    try {
      await assignTee.mutateAsync({ gameId, playerId, teeId: parseInt(teeId, 10) });
      toast.success("Tee assigned");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assign tee");
    }
  };

  const handleLeaveGame = async () => {
    try {
      const result = await leaveGame.mutateAsync(gameId);
      toast.success(result.message);
      onOpenChange(false);
      navigate({ to: "/player/games" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to leave game");
    }
  };

  const getPlayerDisplayName = (player: GamePlayer): string => {
    if (player.guest_name) return player.guest_name;
    return player.player_display_name || player.player_name || "Unknown";
  };

  const isLoading = playersLoading || teesLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-full max-w-full m-0 p-0 rounded-none sm:rounded-none flex flex-col">
        <DialogHeader className="px-4 py-3 border-b border-soft-grey flex-shrink-0">
          <DialogTitle className="text-display-sm font-display">
            Game Settings
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-turf" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-soft-grey flex-shrink-0 h-12">
              <TabsTrigger
                value="players"
                className="flex items-center gap-2 rounded-none h-full data-[state=active]:border-b-2 data-[state=active]:border-turf data-[state=active]:bg-transparent"
              >
                <Users className="h-4 w-4" />
                Players
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="flex items-center gap-2 rounded-none h-full data-[state=active]:border-b-2 data-[state=active]:border-turf data-[state=active]:bg-transparent"
              >
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Players Tab */}
            <TabsContent value="players" className="flex-1 overflow-y-auto m-0 p-4">
              <div className="space-y-4">
                <div className="bg-soft-grey/30 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-soft-grey/50">
                    <h3 className="text-sm font-bold text-charcoal uppercase tracking-wide">
                      Players ({players?.length || 0})
                    </h3>
                  </div>
                  <div className="bg-white divide-y divide-soft-grey">
                    {players && players.length > 0 ? (
                      players.map((player) => (
                        <PlayerRow
                          key={player.id}
                          player={player}
                          tees={tees || []}
                          isOwner={isOwner}
                          onRemove={handleRemovePlayer}
                          onAssignTee={handleAssignTee}
                          getPlayerDisplayName={getPlayerDisplayName}
                          isRemoving={removePlayer.isPending}
                        />
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-charcoal/50 text-sm">
                        No players in this game
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings" className="flex-1 overflow-y-auto m-0 p-4">
              <div className="space-y-6">
                {/* Game Name */}
                {isOwner && (
                  <div className="bg-soft-grey/30 rounded-lg p-4">
                    <h3 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
                      Game Name
                    </h3>
                    <div className="bg-white rounded p-3 space-y-3">
                      <Input
                        value={gameName}
                        onChange={(e) => setGameName(e.target.value)}
                        placeholder="Enter game name"
                      />
                      <Button
                        onClick={handleSaveName}
                        disabled={updateGame.isPending || gameName === game.name}
                        className="w-full bg-turf hover:bg-turf/90 text-white"
                      >
                        {updateGame.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Save Name
                      </Button>
                    </div>
                  </div>
                )}

                {/* Game Type */}
                <div className="bg-soft-grey/30 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
                    Game Type
                  </h3>
                  <div className="bg-white rounded p-3">
                    {isOwner ? (
                      <>
                        <Select
                          value={gameType}
                          onValueChange={handleChangeGameType}
                          disabled={gameHasScores || updateGame.isPending}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {GAME_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {gameHasScores && (
                          <div className="mt-2 flex items-start gap-2 text-sm text-charcoal/60">
                            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <span>Cannot change after scores entered</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-charcoal">
                        {GAME_TYPES.find((t) => t.value === gameType)?.label || gameType}
                      </p>
                    )}
                  </div>
                </div>

                {/* Scoring Mode */}
                <div className="bg-soft-grey/30 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
                    Scoring Mode
                  </h3>
                  <div className="bg-white rounded p-3">
                    {isOwner ? (
                      <Select
                        value={scoringMode}
                        onValueChange={(val) => handleChangeScoringMode(val as "gross" | "net" | "both")}
                        disabled={gameHasScores || updateGame.isPending}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SCORING_MODES.map((mode) => (
                            <SelectItem key={mode.value} value={mode.value}>
                              {mode.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-charcoal">
                        {SCORING_MODES.find((m) => m.value === scoringMode)?.label || scoringMode}
                      </p>
                    )}
                  </div>
                </div>

                {/* Game Info (Read-only) */}
                <div className="bg-soft-grey/30 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
                    Game Info
                  </h3>
                  <div className="bg-white rounded p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-charcoal/60">Course</span>
                      <span className="font-medium">{game.course_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-charcoal/60">Status</span>
                      <span className="font-medium capitalize">{game.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-charcoal/60">Players</span>
                      <span className="font-medium">{players?.length || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Leave Game */}
                <div className="bg-coral/5 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-coral mb-3 uppercase tracking-wide">
                    Leave Game
                  </h3>
                  <p className="text-sm text-charcoal/70 mb-4">
                    {isOwner
                      ? "As the owner, leaving will delete the game if no scores have been entered."
                      : "You will be removed from this game. Your scores will be deleted."}
                  </p>
                  <Button
                    onClick={handleLeaveGame}
                    disabled={leaveGame.isPending}
                    className="w-full bg-coral hover:bg-coral/90 text-white"
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
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Player Row Component
interface PlayerRowProps {
  player: GamePlayer;
  tees: CourseTee[];
  isOwner: boolean;
  onRemove: (playerId: number, playerName: string) => void;
  onAssignTee: (playerId: number, teeId: string) => void;
  getPlayerDisplayName: (player: GamePlayer) => string;
  isRemoving: boolean;
}

function PlayerRow({
  player,
  tees,
  isOwner,
  onRemove,
  onAssignTee,
  getPlayerDisplayName,
  isRemoving,
}: PlayerRowProps) {
  const displayName = getPlayerDisplayName(player);

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-charcoal truncate">
              {displayName}
            </span>
            {player.is_owner && (
              <span className="text-xs px-1.5 py-0.5 bg-turf/10 text-turf rounded">
                Owner
              </span>
            )}
            {player.guest_name && (
              <span className="text-xs px-1.5 py-0.5 bg-charcoal/10 text-charcoal/70 rounded">
                Guest
              </span>
            )}
          </div>
        </div>

        {isOwner && (
          <div className="flex items-center gap-1">
            <Select
              value={player.tee_id?.toString() || ""}
              onValueChange={(value) => onAssignTee(player.id, value)}
            >
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue placeholder="Tee" />
              </SelectTrigger>
              <SelectContent>
                {tees.map((tee) => (
                  <SelectItem key={tee.id} value={tee.id.toString()}>
                    <span className="flex items-center gap-1">
                      {tee.color && (
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: tee.color }}
                        />
                      )}
                      {tee.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!player.is_owner && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-charcoal/40 hover:text-coral hover:bg-coral/10"
                onClick={() => onRemove(player.id, displayName)}
                disabled={isRemoving}
                title="Remove player"
              >
                {isRemoving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default GameSettingsModal;

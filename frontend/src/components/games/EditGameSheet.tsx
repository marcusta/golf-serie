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
import { Loader2, Info, Users, Settings } from "lucide-react";
import { toast } from "sonner";
import {
  useGamePlayers,
  useUpdateGame,
  useRemoveGamePlayer,
  useLeaveGame,
  useGameGroups,
  useCreateGameGroup,
  useDeleteGameGroup,
  useSetGroupMembers,
} from "@/api/games";
import { useCourseTees } from "@/api/courses";
import type { GameWithDetails } from "@/types/games";
import type { GameGroup } from "../../../../src/types";
import { GroupManagement, type LocalGroup } from "./GroupManagement";

// Currently only stroke_play is available
const GAME_TYPES = [{ value: "stroke_play", label: "Stroke Play" }];

const SCORING_MODES = [
  { value: "gross", label: "Gross Only" },
  { value: "net", label: "Net Only" },
  { value: "both", label: "Gross & Net" },
];

interface EditGameSheetProps {
  gameId: number;
  game: GameWithDetails;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditGameSheet({
  gameId,
  game,
  open,
  onOpenChange,
}: EditGameSheetProps) {
  const navigate = useNavigate();
  const [gameName, setGameName] = useState(game.name || "");
  const [gameType, setGameType] = useState(game.game_type);
  const [scoringMode, setScoringMode] = useState<"gross" | "net" | "both">(
    (game.scoring_mode as "gross" | "net" | "both") || "gross"
  );
  const [activeTab, setActiveTab] = useState("players");

  // Group management state
  const [localGroups, setLocalGroups] = useState<LocalGroup[]>([]);

  const { data: players, isLoading: playersLoading } = useGamePlayers(gameId);
  const { isLoading: teesLoading } = useCourseTees(game.course_id);
  const { data: groups, isLoading: groupsLoading } = useGameGroups(gameId);

  const updateGame = useUpdateGame();
  const removePlayer = useRemoveGamePlayer();
  const leaveGame = useLeaveGame();
  const createGameGroup = useCreateGameGroup();
  const deleteGameGroup = useDeleteGameGroup();
  const setGroupMembers = useSetGroupMembers();

  const gameHasScores = game.status !== "setup";

  // Initialize local groups from API data
  useEffect(() => {
    if (open && groups && players) {
      // Build local groups from API groups
      const apiGroups = groups.map((g: GameGroup, idx: number) => ({
        id: g.id,
        name: g.name || `Group ${idx + 1}`,
        playerIds: [] as number[], // We'll need to populate this from members
      }));

      // If no groups exist, create a default one
      if (apiGroups.length === 0) {
        setLocalGroups([{ id: null, name: "Group 1", playerIds: [] }]);
      } else {
        setLocalGroups(apiGroups);
      }
    }
  }, [open, groups, players]);

  // Reset form when dialog opens
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
      await updateGame.mutateAsync({
        gameId,
        data: { name: gameName.trim() },
      });
      toast.success("Game name updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update game name"
      );
    }
  };

  const handleChangeGameType = async (newType: string) => {
    try {
      await updateGame.mutateAsync({
        gameId,
        data: { game_type: newType },
      });
      setGameType(newType);
      toast.success("Game type updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update game type"
      );
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

  const handleLeaveGame = async () => {
    try {
      const result = await leaveGame.mutateAsync(gameId);
      toast.success(result.message);
      onOpenChange(false);
      navigate({ to: "/player/games" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to leave game"
      );
    }
  };

  // Group management handlers
  const handleGroupsChange = (newGroups: LocalGroup[]) => {
    setLocalGroups(newGroups);
  };

  const handleRemovePlayerFromGame = async (
    playerId: number,
    playerName: string
  ) => {
    try {
      await removePlayer.mutateAsync({ gameId, playerId });
      toast.success(`${playerName} removed from game`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove player"
      );
    }
  };

  const handleRemoveGroup = async (_groupIndex: number, group: LocalGroup) => {
    if (group.id) {
      await deleteGameGroup.mutateAsync({ gameId, groupId: group.id });
    }
  };

  // Save groups to backend
  const handleSaveGroups = async () => {
    try {
      for (const group of localGroups) {
        if (group.playerIds.length === 0) continue;

        let groupId = group.id;

        // Create group if it doesn't exist
        if (!groupId) {
          const created = await createGameGroup.mutateAsync({
            gameId,
            data: { name: group.name, start_hole: 1 },
          });
          groupId = created.id;
        }

        // Set group members
        await setGroupMembers.mutateAsync({
          gameId,
          groupId,
          gamePlayerIds: group.playerIds,
        });
      }
      toast.success("Groups saved");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save groups"
      );
    }
  };

  const isLoading = playersLoading || teesLoading || groupsLoading;

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
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <TabsList className="grid w-full grid-cols-2 rounded-none border-b border-soft-grey flex-shrink-0 h-12">
              <TabsTrigger
                value="players"
                className="flex items-center gap-2 rounded-none h-full data-[state=active]:border-b-2 data-[state=active]:border-turf data-[state=active]:bg-transparent"
              >
                <Users className="h-4 w-4" />
                Players & Groups
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="flex items-center gap-2 rounded-none h-full data-[state=active]:border-b-2 data-[state=active]:border-turf data-[state=active]:bg-transparent"
              >
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* Players & Groups Tab */}
            <TabsContent
              value="players"
              className="flex-1 overflow-y-auto m-0 p-4"
            >
              {players && (
                <>
                  <GroupManagement
                    players={players}
                    groups={localGroups}
                    onGroupsChange={handleGroupsChange}
                    onRemovePlayer={handleRemovePlayerFromGame}
                    onRemoveGroup={handleRemoveGroup}
                    variant="modal"
                    showTapToAssign={true}
                  />

                  {/* Save Groups Button */}
                  <Button
                    onClick={handleSaveGroups}
                    disabled={
                      createGameGroup.isPending || setGroupMembers.isPending
                    }
                    className="w-full bg-turf hover:bg-turf/90 text-white mt-4"
                  >
                    {createGameGroup.isPending || setGroupMembers.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      "Save Groups"
                    )}
                  </Button>
                </>
              )}
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent
              value="settings"
              className="flex-1 overflow-y-auto m-0 p-4"
            >
              <div className="space-y-6">
                {/* Game Name */}
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

                {/* Game Type */}
                <div className="bg-soft-grey/30 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
                    Game Type
                  </h3>
                  <div className="bg-white rounded p-3">
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
                  </div>
                </div>

                {/* Scoring Mode */}
                <div className="bg-soft-grey/30 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
                    Scoring Mode
                  </h3>
                  <div className="bg-white rounded p-3">
                    <Select
                      value={scoringMode}
                      onValueChange={(val) =>
                        handleChangeScoringMode(val as "gross" | "net" | "both")
                      }
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
                  </div>
                </div>

                {/* Game Info */}
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
                      <span className="font-medium capitalize">
                        {game.status}
                      </span>
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
                    Leaving will remove you from this game. If you're the owner
                    and no scores have been entered, the game will be deleted.
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

export default EditGameSheet;

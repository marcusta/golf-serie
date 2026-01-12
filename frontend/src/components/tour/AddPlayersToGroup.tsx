import { useState, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search,
  UserPlus,
  Users,
  Check,
  Loader2,
  ChevronLeft,
  AlertCircle,
  Play,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  useAvailablePlayers,
  useAddToGroup,
  useRegisterForCompetition,
  useStartPlaying,
  useRemoveFromGroup,
  type AvailablePlayer,
} from "@/api/tour-registration";

interface AddPlayersToGroupProps {
  isOpen: boolean;
  onClose: () => void;
  competitionId: number;
  currentGroupSize?: number;
  maxGroupSize?: number;
  onSuccess?: () => void;
  mode?: "add_to_existing" | "initial_registration";
  currentGroupMembers?: Array<{
    player_id: number;
    name: string;
    handicap?: number;
    is_you?: boolean;
  }>;
}

// Status indicator component
function PlayerStatusBadge({
  status,
}: {
  status: AvailablePlayer["status"];
}) {
  const statusConfig = {
    looking_for_group: {
      label: "LFG",
      className: "text-turf",
    },
    available: {
      label: "Available",
      className: "text-turf",
    },
    in_group: {
      label: "In Group",
      className: "text-sky",
    },
    playing: {
      label: "Playing",
      className: "text-coral",
    },
    finished: {
      label: "Finished",
      className: "text-charcoal/70",
    },
  };

  const config = statusConfig[status];

  return (
    <span className={`text-sm ${config.className}`}>
      {config.label}
    </span>
  );
}

// Player list item
function PlayerListItem({
  player,
  isSelected,
  onToggle,
  disabled,
}: {
  player: AvailablePlayer;
  isSelected: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  const canAdd =
    player.status === "looking_for_group" || player.status === "available";

  return (
    <button
      onClick={onToggle}
      disabled={disabled || !canAdd}
      className={`w-full py-4 px-4 transition-colors text-left ${
        isSelected
          ? "border-l-4 border-turf bg-turf/5"
          : canAdd
          ? "hover:bg-gray-50/50"
          : "bg-rough/20 cursor-not-allowed opacity-60"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Selection indicator */}
        <div
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
            isSelected
              ? "border-turf bg-turf"
              : "border-soft-grey bg-scorecard"
          }`}
        >
          {isSelected && <Check className="h-4 w-4 text-scorecard" />}
        </div>

        {/* Player info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-label-md font-semibold text-charcoal truncate">
              {player.name}
            </span>
            <PlayerStatusBadge status={player.status} />
          </div>
          {player.handicap !== undefined && player.handicap !== null && (
            <span className="text-sm text-charcoal/70">
              HCP {player.handicap.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function AddPlayersToGroup({
  isOpen,
  onClose,
  competitionId,
  currentGroupSize = 1,
  maxGroupSize = 4,
  onSuccess,
  mode = "add_to_existing",
  currentGroupMembers = [],
}: AddPlayersToGroupProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLookingForGroup, setIsLookingForGroup] = useState(false);

  const navigate = useNavigate();
  const { data: availablePlayers, isLoading } = useAvailablePlayers(competitionId);
  const addToGroupMutation = useAddToGroup();
  const registerMutation = useRegisterForCompetition();
  const startPlayingMutation = useStartPlaying();
  const removeFromGroupMutation = useRemoveFromGroup();

  const isInitialRegistration = mode === "initial_registration";
  const remainingSlots = maxGroupSize - currentGroupSize;

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    if (!availablePlayers) return [];

    // Get current group member IDs to exclude them
    const currentGroupPlayerIds = currentGroupMembers.map(m => m.player_id);

    let filtered = availablePlayers.filter((p) => {
      // Exclude players already in the current group
      if (currentGroupPlayerIds.includes(p.player_id)) {
        return false;
      }
      // Filter by search query
      return p.name.toLowerCase().includes(searchQuery.toLowerCase());
    });

    // Sort: LFG players first, then available, then others
    filtered.sort((a, b) => {
      const statusOrder = {
        looking_for_group: 0,
        available: 1,
        in_group: 2,
        playing: 3,
        finished: 4,
      };
      return statusOrder[a.status] - statusOrder[b.status];
    });

    return filtered;
  }, [availablePlayers, searchQuery, currentGroupMembers]);

  // Group players by status for display
  const lfgPlayers = filteredPlayers.filter(
    (p) => p.status === "looking_for_group"
  );
  const otherPlayers = filteredPlayers.filter(
    (p) => p.status !== "looking_for_group"
  );

  const handleTogglePlayer = (playerId: number) => {
    setError(null);
    setSelectedPlayerIds((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId);
      }
      // Check if we can add more players
      if (prev.length >= remainingSlots) {
        setError(`Maximum group size is ${maxGroupSize} players`);
        return prev;
      }
      return [...prev, playerId];
    });
  };

  const handleRemoveFromGroup = async (playerId: number) => {
    setError(null);
    try {
      await removeFromGroupMutation.mutateAsync({
        competitionId,
        playerId,
      });
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || "Failed to remove player from group.");
    }
  };

  const handleAddPlayers = async () => {
    if (selectedPlayerIds.length === 0) return;

    setError(null);
    try {
      await addToGroupMutation.mutateAsync({
        competitionId,
        playerIds: selectedPlayerIds,
      });
      setSelectedPlayerIds([]);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to add players. Please try again.");
    }
  };

  const handleInitialRegistration = async () => {
    setError(null);
    try {
      // If LFG mode, just register as looking_for_group (don't start playing)
      if (isLookingForGroup) {
        await registerMutation.mutateAsync({
          competitionId,
          mode: "looking_for_group",
        });
        onSuccess?.();
        onClose();
        return;
      }

      // If players selected, register as create_group and add them
      if (selectedPlayerIds.length > 0) {
        await registerMutation.mutateAsync({
          competitionId,
          mode: "create_group",
        });
        // Now add the selected players
        await addToGroupMutation.mutateAsync({
          competitionId,
          playerIds: selectedPlayerIds,
        });
      } else {
        // No players selected, register as solo
        await registerMutation.mutateAsync({
          competitionId,
          mode: "solo",
        });
      }

      // Start playing to get tee_time_id and navigate to scorecard
      const { tee_time_id } = await startPlayingMutation.mutateAsync(competitionId);

      setSelectedPlayerIds([]);
      onSuccess?.();
      onClose();

      // Navigate to scorecard
      navigate({
        to: "/player/competitions/$competitionId/tee-times/$teeTimeId",
        params: {
          competitionId: competitionId.toString(),
          teeTimeId: tee_time_id.toString(),
        },
      });
    } catch (err: any) {
      setError(err.message || "Failed to register. Please try again.");
    }
  };

  const handleClose = () => {
    setSearchQuery("");
    setSelectedPlayerIds([]);
    setError(null);
    setIsLookingForGroup(false);
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} maxHeight="92vh">
      <div className="flex flex-col h-full space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <button
            onClick={handleClose}
            className="flex items-center gap-1 text-charcoal/70 hover:text-charcoal transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="text-body-md">Back</span>
          </button>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-turf" />
            <span className="text-label-lg font-semibold text-charcoal">
              {isInitialRegistration
                ? "Join Round"
                : "Edit Group"}
            </span>
          </div>
        </div>

        {/* Looking for Group Toggle (only for initial registration) */}
        {isInitialRegistration && (
          <div className="p-4 bg-turf/10 border border-turf/20 rounded-xl flex-shrink-0">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isLookingForGroup}
                onChange={(e) => {
                  setIsLookingForGroup(e.target.checked);
                  if (e.target.checked) {
                    setSelectedPlayerIds([]); // Clear selections when enabling LFG
                  }
                }}
                className="mt-1 h-5 w-5 rounded border-turf text-turf focus:ring-2 focus:ring-turf focus:ring-offset-0"
              />
              <div>
                <div className="text-label-md font-semibold text-charcoal">
                  I'm looking for a group
                </div>
                <div className="text-body-sm text-charcoal/70 mt-0.5">
                  Mark yourself as available and wait for someone to add you to
                  their group
                </div>
              </div>
            </label>
          </div>
        )}

        {/* Current Group Members (for edit mode) */}
        {mode === "add_to_existing" && currentGroupMembers.length > 0 && (
          <div className="flex-shrink-0">
            <h4 className="text-label-sm font-semibold text-charcoal uppercase tracking-wide mb-2">
              Current Group ({currentGroupMembers.length}/{maxGroupSize})
            </h4>
            <div className="divide-y divide-soft-grey border border-soft-grey rounded-lg">
              {currentGroupMembers.map((member) => (
                <div
                  key={member.player_id}
                  className="px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-label-md font-semibold text-charcoal">
                        {member.name}
                        {member.is_you && (
                          <span className="text-sm text-turf ml-2">(you)</span>
                        )}
                      </span>
                    </div>
                    {member.handicap !== undefined && member.handicap !== null && (
                      <span className="text-sm text-charcoal/70">
                        HCP {member.handicap.toFixed(1)}
                      </span>
                    )}
                  </div>
                  {!member.is_you && (
                    <button
                      onClick={() => handleRemoveFromGroup(member.player_id)}
                      disabled={removeFromGroupMutation.isPending}
                      className="p-2 hover:bg-flag/10 rounded transition-colors text-flag hover:text-flag/80 disabled:opacity-50"
                      title="Remove from group"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-3 p-3 bg-flag/10 border border-flag/20 rounded-lg flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-flag flex-shrink-0" />
            <p className="text-body-sm text-flag">{error}</p>
          </div>
        )}

        {/* Search */}
        {!isLookingForGroup && (
          <div className="relative flex-shrink-0">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-charcoal/50" />
            <input
              type="text"
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-soft-grey rounded-xl bg-scorecard text-charcoal placeholder-charcoal/50 focus:outline-none focus:ring-2 focus:ring-turf focus:border-turf transition-colors"
            />
          </div>
        )}

        {/* Selection info */}
        {!isLookingForGroup && selectedPlayerIds.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-turf/10 rounded-lg flex-shrink-0">
            <span className="text-body-sm text-turf font-medium">
              {selectedPlayerIds.length} player
              {selectedPlayerIds.length !== 1 ? "s" : ""} selected
            </span>
            <button
              onClick={() => setSelectedPlayerIds([])}
              className="text-body-sm text-turf underline hover:no-underline"
            >
              Clear
            </button>
          </div>
        )}

        {/* Player list */}
        {!isLookingForGroup && (
          <div className="flex-1 overflow-y-auto min-h-0">
          {mode === "add_to_existing" && (
            <h4 className="text-label-sm font-semibold text-charcoal uppercase tracking-wide mb-3 flex-shrink-0">
              Add Players
            </h4>
          )}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-turf" />
            </div>
          ) : filteredPlayers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-charcoal/30 mx-auto mb-4" />
              <p className="text-body-md text-charcoal/70">
                {searchQuery
                  ? "No players match your search"
                  : "No players available to add"}
              </p>
            </div>
          ) : (
            <>
              {/* LFG Players Section */}
              {lfgPlayers.length > 0 && (
                <div>
                  <h4 className="text-label-sm font-semibold text-turf uppercase tracking-wide mb-2">
                    Looking for Group
                  </h4>
                  <div className="divide-y divide-soft-grey">
                    {lfgPlayers.map((player) => (
                      <PlayerListItem
                        key={player.player_id}
                        player={player}
                        isSelected={selectedPlayerIds.includes(player.player_id)}
                        onToggle={() => handleTogglePlayer(player.player_id)}
                        disabled={addToGroupMutation.isPending}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Other Players Section */}
              {otherPlayers.length > 0 && (
                <div>
                  <h4 className="text-label-sm font-semibold text-charcoal/70 uppercase tracking-wide mb-2">
                    {lfgPlayers.length > 0 ? "Other Players" : "Players"}
                  </h4>
                  <div className="divide-y divide-soft-grey">
                    {otherPlayers.map((player) => (
                      <PlayerListItem
                        key={player.player_id}
                        player={player}
                        isSelected={selectedPlayerIds.includes(player.player_id)}
                        onToggle={() => handleTogglePlayer(player.player_id)}
                        disabled={addToGroupMutation.isPending}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          </div>
        )}

        {/* Action button */}
        <Button
          onClick={
            isInitialRegistration ? handleInitialRegistration : handleAddPlayers
          }
          disabled={
            isInitialRegistration
              ? registerMutation.isPending || addToGroupMutation.isPending || startPlayingMutation.isPending
              : selectedPlayerIds.length === 0 || addToGroupMutation.isPending
          }
          className="w-full bg-turf hover:bg-fairway text-scorecard flex-shrink-0"
        >
          {registerMutation.isPending || addToGroupMutation.isPending || startPlayingMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {isInitialRegistration ? "Starting..." : "Adding..."}
            </>
          ) : isInitialRegistration ? (
            <>
              {isLookingForGroup ? (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Mark as Looking for Group
                </>
              ) : selectedPlayerIds.length > 0 ? (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Playing with {selectedPlayerIds.length} Player
                  {selectedPlayerIds.length !== 1 ? "s" : ""}
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Playing Solo
                </>
              )}
            </>
          ) : mode === "add_to_existing" ? (
            <>
              <UserPlus className="h-4 w-4 mr-2" />
              Add {selectedPlayerIds.length}{" "}
              Player{selectedPlayerIds.length !== 1 ? "s" : ""}
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-2" />
              Add {selectedPlayerIds.length > 0 ? selectedPlayerIds.length : ""}{" "}
              Player{selectedPlayerIds.length !== 1 ? "s" : ""} to Group
            </>
          )}
        </Button>
      </div>
    </BottomSheet>
  );
}

export default AddPlayersToGroup;

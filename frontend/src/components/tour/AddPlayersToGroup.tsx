import { useState, useMemo } from "react";
import {
  Search,
  UserPlus,
  Users,
  Check,
  Loader2,
  ChevronLeft,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  useAvailablePlayers,
  useAddToGroup,
  type AvailablePlayer,
} from "@/api/tour-registration";

interface AddPlayersToGroupProps {
  isOpen: boolean;
  onClose: () => void;
  competitionId: number;
  currentGroupSize: number;
  maxGroupSize?: number;
  onSuccess?: () => void;
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
      className: "bg-turf text-scorecard",
    },
    available: {
      label: "Available",
      className: "bg-rough text-charcoal",
    },
    in_group: {
      label: "In Group",
      className: "bg-sky/20 text-sky",
    },
    playing: {
      label: "Playing",
      className: "bg-coral/20 text-coral",
    },
    finished: {
      label: "Finished",
      className: "bg-charcoal/20 text-charcoal",
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${config.className}`}
    >
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
      className={`w-full p-3 rounded-lg border-2 transition-all duration-200 text-left ${
        isSelected
          ? "border-turf bg-turf/10"
          : canAdd
          ? "border-soft-grey bg-scorecard hover:border-turf/50"
          : "border-soft-grey bg-rough/30 cursor-not-allowed opacity-60"
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
            <span className="text-body-sm text-charcoal/60">
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
  currentGroupSize,
  maxGroupSize = 4,
  onSuccess,
}: AddPlayersToGroupProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const { data: availablePlayers, isLoading } = useAvailablePlayers(competitionId);
  const addToGroupMutation = useAddToGroup();

  const remainingSlots = maxGroupSize - currentGroupSize;

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    if (!availablePlayers) return [];

    let filtered = availablePlayers.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
  }, [availablePlayers, searchQuery]);

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

  const handleClose = () => {
    setSearchQuery("");
    setSelectedPlayerIds([]);
    setError(null);
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} maxHeight="90vh">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
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
              Your Group ({currentGroupSize}/{maxGroupSize})
            </span>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-3 p-3 bg-flag/10 border border-flag/20 rounded-lg">
            <AlertCircle className="h-5 w-5 text-flag flex-shrink-0" />
            <p className="text-body-sm text-flag">{error}</p>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-charcoal/50" />
          <input
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-soft-grey rounded-xl bg-scorecard text-charcoal placeholder-charcoal/50 focus:outline-none focus:ring-2 focus:ring-turf focus:border-turf transition-colors"
          />
        </div>

        {/* Selection info */}
        {selectedPlayerIds.length > 0 && (
          <div className="flex items-center justify-between p-3 bg-turf/10 rounded-lg">
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
        <div
          className="space-y-4 overflow-y-auto"
          style={{ maxHeight: "calc(90vh - 320px)" }}
        >
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
                  <div className="space-y-2">
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
                  <div className="space-y-2">
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

        {/* Action button */}
        <Button
          onClick={handleAddPlayers}
          disabled={selectedPlayerIds.length === 0 || addToGroupMutation.isPending}
          className="w-full bg-turf hover:bg-fairway text-scorecard"
        >
          {addToGroupMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Adding...
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

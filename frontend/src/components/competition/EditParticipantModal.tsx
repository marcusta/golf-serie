import { useState, useEffect } from "react";
import { X, UserPlus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlayerSearchInput } from "./PlayerSearchInput";
import {
  useParticipantPlayers,
  useLinkPlayer,
  useUnlinkPlayer,
  type LinkedPlayer,
} from "@/api/participants";
import type { Player } from "@/api/players";
import { cn } from "@/lib/utils";

interface Participant {
  id: string;
  currentName: string | null;
  positionName: string;
}

interface EditParticipantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (participantId: string, newName: string) => void;
  participant: Participant | null;
}

export function EditParticipantModal({
  isOpen,
  onClose,
  onSave,
  participant,
}: EditParticipantModalProps) {
  const [displayName, setDisplayName] = useState("");
  const [showPlayerSearch, setShowPlayerSearch] = useState(false);

  const participantId = participant ? parseInt(participant.id) : 0;

  // Fetch linked players
  const { data: linkedPlayers, isLoading: playersLoading } =
    useParticipantPlayers(participantId);

  // Mutations
  const linkPlayerMutation = useLinkPlayer();
  const unlinkPlayerMutation = useUnlinkPlayer();

  // Reset state when participant changes
  useEffect(() => {
    if (participant) {
      setDisplayName(participant.currentName || "");
      setShowPlayerSearch(false);
    }
  }, [participant]);

  const handleSave = () => {
    if (!participant) return;

    const trimmedName = displayName.trim();
    if (trimmedName.length === 0) return;

    onSave(participant.id, trimmedName);
  };

  const handleCancel = () => {
    setDisplayName(participant?.currentName || "");
    setShowPlayerSearch(false);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleLinkPlayer = (player: Player) => {
    if (!participant) return;

    linkPlayerMutation.mutate({
      participantId: parseInt(participant.id),
      playerId: player.id,
    });
    setShowPlayerSearch(false);
  };

  const handleUnlinkPlayer = (playerId: number) => {
    if (!participant) return;

    unlinkPlayerMutation.mutate({
      participantId: parseInt(participant.id),
      playerId,
    });
  };

  const formatHandicap = (handicap: number | null | undefined): string => {
    if (handicap === null || handicap === undefined) return "-";
    return handicap >= 0 ? `+${handicap.toFixed(1)}` : handicap.toFixed(1);
  };

  // Get list of already linked player IDs for exclusion
  const excludePlayerIds = linkedPlayers?.map((p) => p.player_id) || [];

  if (!participant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-4 rounded bg-scorecard p-0 gap-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="text-lg font-semibold text-fairway font-display">
            Edit Participant
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-6">
          {/* Position context */}
          <p className="text-sm text-turf">
            Editing position:{" "}
            <span className="font-medium">{participant.positionName}</span>
          </p>

          {/* Display Name Section */}
          <div>
            <label
              htmlFor="display-name"
              className="text-sm font-bold text-charcoal mb-2 uppercase tracking-wide block"
            >
              Display Name
            </label>
            <Input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter display name"
              className="rounded border-soft-grey focus:border-turf focus:ring-turf/20"
              autoFocus
            />
          </div>

          {/* Linked Players Section */}
          <div>
            <h3 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
              Linked Players
            </h3>

            <div className="bg-white rounded overflow-hidden border border-soft-grey">
              {/* Loading state */}
              {playersLoading && (
                <div className="px-4 py-8 flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-turf" />
                </div>
              )}

              {/* Empty state */}
              {!playersLoading &&
                (!linkedPlayers || linkedPlayers.length === 0) && (
                  <div className="px-4 py-6 text-center text-charcoal/60 text-sm">
                    No players linked yet.
                    <br />
                    <span className="text-xs">
                      Link players to track round history.
                    </span>
                  </div>
                )}

              {/* Linked players list */}
              {!playersLoading && linkedPlayers && linkedPlayers.length > 0 && (
                <div className="divide-y divide-soft-grey">
                  {linkedPlayers.map((player: LinkedPlayer) => (
                    <div
                      key={player.player_id}
                      className="px-4 py-3 flex items-center justify-between hover:bg-turf/5 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-charcoal">
                          {player.player_name}
                        </p>
                        <p className="text-sm text-charcoal/70">
                          HCP {formatHandicap(player.handicap_index)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnlinkPlayer(player.player_id)}
                        disabled={unlinkPlayerMutation.isPending}
                        className={cn(
                          "p-1.5 rounded hover:bg-flag/10 transition-colors",
                          unlinkPlayerMutation.isPending && "opacity-50"
                        )}
                        aria-label={`Remove ${player.player_name}`}
                      >
                        <X className="h-4 w-4 text-flag" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Player Section */}
            <div className="mt-3">
              {showPlayerSearch ? (
                <PlayerSearchInput
                  onPlayerSelect={handleLinkPlayer}
                  onCancel={() => setShowPlayerSearch(false)}
                  excludePlayerIds={excludePlayerIds}
                  placeholder="Search for a player..."
                  autoFocus
                />
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPlayerSearch(true)}
                  className="w-full rounded border-soft-grey hover:bg-turf/5 hover:border-turf text-charcoal"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Player
                </Button>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1 rounded border-soft-grey hover:bg-soft-grey/20"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={displayName.trim().length === 0}
              className={cn(
                "flex-1 rounded",
                displayName.trim().length > 0
                  ? "bg-turf text-scorecard hover:bg-fairway"
                  : "bg-soft-grey text-charcoal/40 cursor-not-allowed"
              )}
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

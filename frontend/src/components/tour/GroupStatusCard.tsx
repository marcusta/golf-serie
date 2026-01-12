import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  UserPlus,
  LogOut,
  Play,
  Loader2,
  Search,
  User,
  ChevronRight,
  X,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useLeaveGroup,
  useStartPlaying,
  useWithdrawFromCompetition,
  useRemoveFromGroup,
  type Registration,
  type PlayingGroup,
  type RegistrationStatus,
} from "@/api/tour-registration";
import { AddPlayersToGroup } from "./AddPlayersToGroup";
import { QRCodeDialog } from "@/components/competition/QRCodeDialog";
import { getTeeTimeUrl } from "@/utils/qrCodeUrls";

interface GroupStatusCardProps {
  competitionId: number;
  registration: Registration;
  group: PlayingGroup | null;
  teeTimeId?: number;
  participantId?: number;
  onUpdate?: () => void;
  hideActions?: boolean; // Hide action buttons when all holes are completed
}

// Status badge component
function StatusBadge({
  status,
  allHolesCompleted = false
}: {
  status: RegistrationStatus;
  allHolesCompleted?: boolean;
}) {
  // If all holes completed but not finalized, show "Round Complete" instead of "On Course"
  if (allHolesCompleted && status === "playing") {
    return (
      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-turf/20 text-turf">
        Round Complete
      </span>
    );
  }

  const statusConfig: Record<
    RegistrationStatus,
    { label: string; className: string }
  > = {
    looking_for_group: {
      label: "Looking for Group",
      className: "bg-turf/20 text-turf",
    },
    registered: {
      label: "Registered",
      className: "bg-sky/20 text-sky",
    },
    playing: {
      label: "On Course",
      className: "bg-coral text-scorecard animate-pulse",
    },
    finished: {
      label: "Finished",
      className: "bg-charcoal/20 text-charcoal",
    },
    withdrawn: {
      label: "Withdrawn",
      className: "bg-flag/20 text-flag",
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`text-xs font-semibold px-2 py-1 rounded-full ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export function GroupStatusCard({
  competitionId,
  registration,
  group,
  teeTimeId,
  // participantId is kept for backward compatibility but no longer used for navigation
  onUpdate,
  hideActions = false,
}: GroupStatusCardProps) {
  const [showAddPlayers, setShowAddPlayers] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const navigate = useNavigate();

  const leaveGroupMutation = useLeaveGroup();
  const startPlayingMutation = useStartPlaying();
  const withdrawMutation = useWithdrawFromCompetition();
  const removeFromGroupMutation = useRemoveFromGroup();

  const isLFG = registration.status === "looking_for_group";
  const isRegistered = registration.status === "registered";
  const isPlaying = registration.status === "playing";
  const isFinished = registration.status === "finished";
  const canModifyGroup = (isLFG || isRegistered || isPlaying);
  const hasGroup = group && group.players.length > 1;

  const groupMembers = group?.players.filter((p) => !p.is_you) || [];
  const currentGroupSize = group?.players.length || 1;

  // Check if current player is the group creator
  const isGroupCreator = registration.group_created_by === registration.player_id;

  const handleLeaveGroup = async () => {
    try {
      await leaveGroupMutation.mutateAsync(competitionId);
      onUpdate?.();
    } catch (error) {
      console.error("Failed to leave group:", error);
    }
  };

  const handleStartPlaying = async () => {
    try {
      const result = await startPlayingMutation.mutateAsync(competitionId);
      onUpdate?.();

      // Navigate to the scorecard view after starting to play
      if (result.tee_time_id) {
        navigate({
          to: "/player/competitions/$competitionId/tee-times/$teeTimeId",
          params: {
            competitionId: competitionId.toString(),
            teeTimeId: result.tee_time_id.toString(),
          },
        });
      }
    } catch (error) {
      console.error("Failed to start playing:", error);
    }
  };

  const handleWithdraw = async () => {
    if (
      !confirm(
        "Are you sure you want to withdraw from this competition? This cannot be undone."
      )
    ) {
      return;
    }
    try {
      await withdrawMutation.mutateAsync(competitionId);
      onUpdate?.();
    } catch (error) {
      console.error("Failed to withdraw:", error);
    }
  };

  const handleRemovePlayer = async (playerId: number, playerName: string) => {
    if (
      !confirm(
        `Remove ${playerName} from your group? They will be moved to playing solo.`
      )
    ) {
      return;
    }
    try {
      await removeFromGroupMutation.mutateAsync({
        competitionId,
        playerId,
      });
      onUpdate?.();
    } catch (error) {
      console.error("Failed to remove player:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to remove player from group"
      );
    }
  };

  // Render for "Looking for Group" status
  if (isLFG) {
    return (
      <div className="bg-scorecard border border-soft-grey rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-turf/20 rounded-full flex items-center justify-center">
              <Search className="h-5 w-5 text-turf" />
            </div>
            <div>
              <h4 className="text-label-lg font-semibold text-charcoal">
                Looking for Group
              </h4>
              <p className="text-body-sm text-charcoal/70">
                Waiting for someone to add you
              </p>
            </div>
          </div>
          <StatusBadge status={registration.status} allHolesCompleted={hideActions} />
        </div>

        {/* Start Playing Solo - for LFG players who want to start without waiting */}
        <div className="space-y-2">
          <Button
            onClick={handleStartPlaying}
            disabled={startPlayingMutation.isPending}
            className="w-full bg-turf hover:bg-fairway text-scorecard"
          >
            {startPlayingMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Start Playing Solo
          </Button>
          <p className="text-body-xs text-charcoal/50 text-center">
            Start your round now instead of waiting for a group
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleWithdraw}
            disabled={withdrawMutation.isPending}
            className="flex-1 border-soft-grey text-charcoal hover:bg-rough/20"
          >
            {withdrawMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <LogOut className="h-4 w-4 mr-2" />
                Withdraw
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Render for registered/playing status
  return (
    <div className="bg-scorecard border border-soft-grey rounded-xl overflow-hidden">
      {/* Group members section with inline actions */}
      {hasGroup && (
        <div className="p-4 border-b border-soft-grey bg-rough/30">
          <div className="flex items-center justify-between mb-2">
            <p className="text-label-sm font-medium text-charcoal/70">
              {hideActions || isFinished ? "Played with:" : "Playing with:"}
            </p>
            {/* Compact action toolbar */}
            {canModifyGroup && (
              <div className="flex items-center gap-1">
                {/* Add Players */}
                <button
                  onClick={() => setShowAddPlayers(true)}
                  disabled={currentGroupSize >= 4}
                  className="p-1.5 text-turf hover:bg-turf/10 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Add players to group"
                >
                  <UserPlus className="h-4 w-4" />
                </button>

                {/* Share Group - only for group creator with tee time */}
                {isGroupCreator && teeTimeId && (
                  <button
                    onClick={() => setShowShareDialog(true)}
                    className="p-1.5 text-turf hover:bg-turf/10 rounded-lg transition-colors"
                    title="Share group with QR code"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                )}

                {/* Leave/Withdraw */}
                {hasGroup ? (
                  <button
                    onClick={handleLeaveGroup}
                    disabled={leaveGroupMutation.isPending}
                    className="p-1.5 text-charcoal/70 hover:bg-rough/40 rounded-lg transition-colors disabled:opacity-50"
                    title="Leave group"
                  >
                    {leaveGroupMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleWithdraw}
                    disabled={withdrawMutation.isPending}
                    className="p-1.5 text-flag hover:bg-flag/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Withdraw from competition"
                  >
                    {withdrawMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="space-y-2">
            {groupMembers.map((member) => (
              <div
                key={member.player_id}
                className="flex items-center justify-between gap-2 text-charcoal group/member"
              >
                <div className="flex items-center gap-2 flex-1">
                  <User className="h-4 w-4 text-charcoal/50" />
                  <span className="text-body-md">{member.name}</span>
                  {member.handicap !== undefined && (
                    <span className="text-body-sm text-charcoal/50">
                      (HCP {member.handicap?.toFixed(1)})
                    </span>
                  )}
                </div>
                {isGroupCreator && canModifyGroup && (
                  <button
                    onClick={() =>
                      handleRemovePlayer(member.player_id, member.name)
                    }
                    disabled={removeFromGroupMutation.isPending}
                    className="opacity-0 group-hover/member:opacity-100 transition-opacity p-1 hover:bg-flag/10 rounded-md"
                    title={`Remove ${member.name}`}
                  >
                    <X className="h-4 w-4 text-flag" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Solo player - no header, just show actions before primary button */}
      {!hasGroup && canModifyGroup && (
        <div className="px-4 pt-4 flex justify-end gap-1">
          <button
            onClick={() => setShowAddPlayers(true)}
            disabled={currentGroupSize >= 4}
            className="p-1.5 text-turf hover:bg-turf/10 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Add players to group"
          >
            <UserPlus className="h-4 w-4" />
          </button>
          {isGroupCreator && teeTimeId && (
            <button
              onClick={() => setShowShareDialog(true)}
              className="p-1.5 text-turf hover:bg-turf/10 rounded-lg transition-colors"
              title="Share group with QR code"
            >
              <Share2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={handleWithdraw}
            disabled={withdrawMutation.isPending}
            className="p-1.5 text-flag hover:bg-flag/10 rounded-lg transition-colors disabled:opacity-50"
            title="Withdraw from competition"
          >
            {withdrawMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
          </button>
        </div>
      )}

      {/* Actions */}
      {!hideActions && (
        <div className="p-4 space-y-3">
          {/* Playing/Continue button */}
          {isPlaying && teeTimeId ? (
            <Link
              to="/player/competitions/$competitionId/tee-times/$teeTimeId"
              params={{
                competitionId: competitionId.toString(),
                teeTimeId: teeTimeId.toString(),
              }}
              className="block"
            >
              <Button className="w-full bg-coral hover:bg-coral/90 text-scorecard">
                <Play className="h-4 w-4 mr-2" />
                Continue Playing
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          ) : isRegistered ? (
            <Button
              onClick={handleStartPlaying}
              disabled={startPlayingMutation.isPending}
              className="w-full bg-turf hover:bg-fairway text-scorecard"
            >
              {startPlayingMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Start Playing
            </Button>
          ) : isFinished ? (
            <div className="text-center py-2">
              <p className="text-body-md text-charcoal/70">Round completed</p>
            </div>
          ) : null}

        </div>
      )}

      {/* Add Players Sheet */}
      <AddPlayersToGroup
        isOpen={showAddPlayers}
        onClose={() => setShowAddPlayers(false)}
        competitionId={competitionId}
        currentGroupSize={currentGroupSize}
        maxGroupSize={4}
        onSuccess={onUpdate}
      />

      {/* Share Group Dialog */}
      {teeTimeId && (
        <QRCodeDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          url={getTeeTimeUrl(competitionId, teeTimeId)}
          title="Share Group"
          description="Share this QR code or link with your group members to get them to the scorecard"
        />
      )}
    </div>
  );
}

export default GroupStatusCard;

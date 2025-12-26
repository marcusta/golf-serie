import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Users,
  UserPlus,
  LogOut,
  Play,
  Loader2,
  Search,
  User,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useLeaveGroup,
  useStartPlaying,
  useWithdrawFromCompetition,
  type Registration,
  type PlayingGroup,
  type RegistrationStatus,
} from "@/api/tour-registration";
import { AddPlayersToGroup } from "./AddPlayersToGroup";

interface GroupStatusCardProps {
  competitionId: number;
  registration: Registration;
  group: PlayingGroup | null;
  teeTimeId?: number;
  participantId?: number;
  onUpdate?: () => void;
}

// Status badge component
function StatusBadge({ status }: { status: RegistrationStatus }) {
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
}: GroupStatusCardProps) {
  const [showAddPlayers, setShowAddPlayers] = useState(false);
  const navigate = useNavigate();

  const leaveGroupMutation = useLeaveGroup();
  const startPlayingMutation = useStartPlaying();
  const withdrawMutation = useWithdrawFromCompetition();

  const isLFG = registration.status === "looking_for_group";
  const isRegistered = registration.status === "registered";
  const isPlaying = registration.status === "playing";
  const isFinished = registration.status === "finished";
  const canModifyGroup = isLFG || isRegistered;
  const hasGroup = group && group.players.length > 1;

  const groupMembers = group?.players.filter((p) => !p.is_you) || [];
  const currentGroupSize = group?.players.length || 1;

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
          <StatusBadge status={registration.status} />
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
      {/* Header */}
      <div className="p-4 border-b border-soft-grey">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isPlaying ? "bg-coral/20" : "bg-turf/20"
              }`}
            >
              {isPlaying ? (
                <Play className="h-5 w-5 text-coral" />
              ) : (
                <Users className="h-5 w-5 text-turf" />
              )}
            </div>
            <div>
              <h4 className="text-label-lg font-semibold text-charcoal">
                {hasGroup ? "Your Group" : "Playing Solo"}
              </h4>
              <p className="text-body-sm text-charcoal/70">
                {currentGroupSize}/4 players
              </p>
            </div>
          </div>
          <StatusBadge status={registration.status} />
        </div>
      </div>

      {/* Group members */}
      {hasGroup && (
        <div className="p-4 border-b border-soft-grey bg-rough/30">
          <p className="text-label-sm font-medium text-charcoal/70 mb-2">
            Playing with:
          </p>
          <div className="space-y-2">
            {groupMembers.map((member) => (
              <div
                key={member.player_id}
                className="flex items-center gap-2 text-charcoal"
              >
                <User className="h-4 w-4 text-charcoal/50" />
                <span className="text-body-md">{member.name}</span>
                {member.handicap !== undefined && (
                  <span className="text-body-sm text-charcoal/50">
                    (HCP {member.handicap?.toFixed(1)})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
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

        {/* Group management buttons */}
        {canModifyGroup && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddPlayers(true)}
              disabled={currentGroupSize >= 4}
              className="flex-1 border-soft-grey text-charcoal hover:bg-rough/20"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Players
            </Button>

            {hasGroup && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLeaveGroup}
                disabled={leaveGroupMutation.isPending}
                className="flex-1 border-soft-grey text-charcoal hover:bg-rough/20"
              >
                {leaveGroupMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <LogOut className="h-4 w-4 mr-2" />
                    Leave Group
                  </>
                )}
              </Button>
            )}

            {!hasGroup && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleWithdraw}
                disabled={withdrawMutation.isPending}
                className="flex-1 border-flag/50 text-flag hover:bg-flag/10"
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
            )}
          </div>
        )}
      </div>

      {/* Add Players Sheet */}
      <AddPlayersToGroup
        isOpen={showAddPlayers}
        onClose={() => setShowAddPlayers(false)}
        competitionId={competitionId}
        currentGroupSize={currentGroupSize}
        maxGroupSize={4}
        onSuccess={onUpdate}
      />
    </div>
  );
}

export default GroupStatusCard;

import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, Users, CheckCircle2, Circle, Play, Edit2, QrCode } from "lucide-react";
import {
  formatParticipantTypeDisplay,
  isMultiPlayerFormat,
} from "../../utils/playerUtils";
import type { TeeTimeParticipant } from "../../api/tee-times";
import { AddPlayersToGroup } from "../tour/AddPlayersToGroup";
import { useMyRegistration } from "../../api/tour-registration";
import { Button } from "../ui/button";
import { QRCodeDialog } from "./QRCodeDialog";
import { getTeeTimeUrl } from "../../utils/qrCodeUrls";

interface TeeTime {
  id: number;
  teetime: string;
  start_hole: number;
  hitting_bay?: number;
  participants: TeeTimeParticipant[];
  pars: number[];
  course_name: string;
}

// Helper to check if a group has finished (all participants locked)
function isGroupFinished(group: TeeTime): boolean {
  return group.participants.length > 0 &&
    group.participants.every((p) => p.is_locked);
}

// Helper to check if a group has started (any non-zero scores)
function hasGroupStarted(group: TeeTime): boolean {
  return group.participants.some((p) =>
    Array.isArray(p.score) && p.score.some((s) => s !== 0)
  );
}

// Helper to get the current hole a group is on (highest hole with a score)
function getGroupCurrentHole(group: TeeTime): number {
  let maxHole = 0;
  for (const p of group.participants) {
    if (Array.isArray(p.score)) {
      for (let i = p.score.length - 1; i >= 0; i--) {
        if (p.score[i] !== 0) {
          maxHole = Math.max(maxHole, i + 1);
          break;
        }
      }
    }
  }
  return maxHole;
}

type GroupStatus = "playing" | "not_started" | "finished";

function getGroupStatus(group: TeeTime): GroupStatus {
  if (isGroupFinished(group)) return "finished";
  if (hasGroupStarted(group)) return "playing";
  return "not_started";
}

interface ParticipantsListComponentProps {
  teeTimes: TeeTime[] | undefined;
  teeTimesLoading: boolean;
  competitionId: string;
  venueType?: "outdoor" | "indoor";
  // For CompetitionRound context
  currentTeeTimeId?: string;
  currentTeeTime?: TeeTime;
  showCurrentGroup?: boolean;
  totalParticipants?: number;
  /** When true, hides team terminology (team name, position) for tour competitions */
  isTourCompetition?: boolean;
  /** When true, hides scheduled tee times (for open start competitions) */
  isOpenStart?: boolean;
  /** Callback when group is updated (for refetching data) */
  onGroupUpdated?: () => void;
}

export function ParticipantsListComponent({
  teeTimes,
  teeTimesLoading,
  competitionId,
  venueType = "outdoor",
  currentTeeTimeId,
  currentTeeTime,
  showCurrentGroup = false,
  totalParticipants = 0,
  isTourCompetition = false,
  isOpenStart = false,
  onGroupUpdated,
}: ParticipantsListComponentProps) {
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);

  // QR Code dialog state
  const [qrDialogState, setQrDialogState] = useState<{
    open: boolean;
    url: string;
    title: string;
  }>({
    open: false,
    url: "",
    title: "",
  });

  // Get registration data for tour competitions to access player IDs
  const { data: registrationData } = useMyRegistration(
    isTourCompetition ? parseInt(competitionId) : 0
  );

  // Helper function to format participant display name
  const formatParticipantDisplay = (participant: TeeTimeParticipant) => {
    if (isTourCompetition) {
      // For tour competitions, just show player name
      return participant.player_name || "Player";
    }
    // For series competitions, show player name with team/position info
    return participant.player_name
      ? `${participant.player_name}, ${participant.team_name} ${formatParticipantTypeDisplay(participant.position_name)}`
      : `${participant.team_name} ${formatParticipantTypeDisplay(participant.position_name)}`;
  };

  // Check if any scores have been entered in current group
  const hasScoresEntered = (teeTime: TeeTime | undefined): boolean => {
    if (!teeTime) return false;
    return teeTime.participants.some((p) =>
      Array.isArray(p.score) && p.score.some((s) => s !== 0)
    );
  };

  // Can edit group if: tour competition, open start, and no scores entered
  const canEditGroup = isTourCompetition && isOpenStart && !hasScoresEntered(currentTeeTime);
  // For CompetitionDetail.tsx - simple start list view
  if (!showCurrentGroup) {
    return (
      <div className="space-y-3 md:space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-semibold text-fairway font-display">
            Tee Times
          </h2>
          <div className="text-xs md:text-sm text-turf font-primary">
            {teeTimes?.length || 0} tee times
          </div>
        </div>

        {teeTimesLoading ? (
          <div className="p-4 text-charcoal font-primary">
            Loading tee times...
          </div>
        ) : !teeTimes || teeTimes.length === 0 ? (
          <div className="text-center py-6 md:py-8 text-soft-grey text-sm font-primary">
            No tee times scheduled for this competition yet.
          </div>
        ) : (
          <div className="space-y-6">
            {teeTimes.map((teeTime) => (
              <div
                key={teeTime.id}
                className="border-l-4 border-turf"
              >
                <div className="bg-rough/20 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base md:text-lg font-semibold text-fairway font-display flex items-center gap-2">
                      <Clock className="h-4 w-4 md:h-5 md:w-5 text-turf" />
                      {teeTime.teetime}
                      <span className="text-xs md:text-sm text-turf font-primary font-medium">
                        {venueType === "indoor" && teeTime.hitting_bay
                          ? `· Bay ${teeTime.hitting_bay}`
                          : `· Hole ${teeTime.start_hole}`}
                      </span>
                    </h4>
                    <div className="flex items-center gap-3">
                      {/* QR Code Button */}
                      <button
                        onClick={() =>
                          setQrDialogState({
                            open: true,
                            url: getTeeTimeUrl(parseInt(competitionId), teeTime.id),
                            title: `Tee Time ${teeTime.teetime}`,
                          })
                        }
                        className="p-1.5 text-turf hover:text-fairway hover:bg-turf/10 rounded-lg transition-colors"
                        title="Share tee time"
                      >
                        <QrCode className="h-4 w-4" />
                      </button>
                      <div className="text-xs md:text-sm text-turf font-primary">
                        {teeTime.participants.length} players
                      </div>
                    </div>
                  </div>
                </div>

                {teeTime.participants.length === 0 ? (
                  <div className="text-center py-4 text-soft-grey text-sm font-primary">
                    No participants assigned to this tee time yet.
                  </div>
                ) : (
                  <div className="divide-y divide-soft-grey">
                    {teeTime.participants.map((participant) => (
                      <Link
                        key={participant.id}
                        to={`/player/competitions/${competitionId}/tee-times/${teeTime.id}`}
                        className="px-4 py-3 flex items-center justify-between hover:bg-rough hover:bg-opacity-20 transition-colors"
                      >
                        <div className="flex-1">
                          <h5 className="text-sm md:text-base font-medium text-fairway font-primary">
                            {formatParticipantDisplay(participant)}
                          </h5>
                        </div>
                        <div className="text-xs text-turf">
                          {isMultiPlayerFormat(participant.position_name) && (
                            <Users className="w-4 h-4 inline-block" />
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* QR Code Dialog */}
        <QRCodeDialog
          open={qrDialogState.open}
          onOpenChange={(open) => setQrDialogState((prev) => ({ ...prev, open }))}
          url={qrDialogState.url}
          title={qrDialogState.title}
          description="Scan to view this tee time group"
        />
      </div>
    );
  }

  // For CompetitionRound.tsx - participants view with current group context
  return (
    <div className="h-full overflow-y-auto bg-scorecard">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-semibold text-fairway font-display">
            Round Participants
          </h2>
          <div className="text-xs md:text-sm text-turf font-primary">
            {currentTeeTimeId ? "Current group" : `${totalParticipants} total`}
          </div>
        </div>

        {/* Current Tee Time Group (if in score entry context) */}
        {currentTeeTimeId && currentTeeTime && (
          <div className="border-l-4 border-turf mb-4">
            <div className="bg-rough/20 px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm md:text-lg font-semibold text-fairway font-display flex items-center gap-2">
                {isOpenStart ? "Your Group" : `Your Group - ${currentTeeTime.teetime}`}
                <span className="text-xs text-turf font-primary font-medium">
                  {venueType === "indoor" && currentTeeTime.hitting_bay
                    ? `· Bay ${currentTeeTime.hitting_bay}`
                    : `· Hole ${currentTeeTime.start_hole}`}
                </span>
              </h3>
              <div className="flex items-center gap-2">
                {/* Share button - always visible */}
                <Button
                  onClick={() =>
                    setQrDialogState({
                      open: true,
                      url: getTeeTimeUrl(parseInt(competitionId), currentTeeTime.id),
                      title: "Share Group",
                    })
                  }
                  variant="ghost"
                  size="sm"
                  className="text-turf hover:text-fairway hover:bg-turf/10"
                >
                  <QrCode className="h-4 w-4" />
                </Button>
                {/* Edit button - only for editable groups */}
                {canEditGroup ? (
                  <Button
                    onClick={() => setShowEditGroupModal(true)}
                    variant="ghost"
                    size="sm"
                    className="text-turf hover:text-fairway hover:bg-turf/10"
                  >
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                ) : (
                  <span className="text-xs md:text-sm text-coral font-semibold font-primary">
                    Active
                  </span>
                )}
              </div>
            </div>
            <div className="divide-y divide-soft-grey">
              {currentTeeTime.participants.map(
                (participant: TeeTimeParticipant, index: number) => {
                  // Find matching player in group data (for tour competitions)
                  const groupPlayer = registrationData?.group?.players[index];

                  // For tour competitions, use the name from group data (more reliable)
                  // Otherwise fall back to formatParticipantDisplay
                  const displayName = isTourCompetition && groupPlayer
                    ? groupPlayer.name
                    : formatParticipantDisplay(participant);

                  return (
                    <div
                      key={participant.id}
                      className="px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex-1">
                        <h4 className="text-sm md:text-base font-medium text-fairway font-primary">
                          {displayName}
                          {groupPlayer?.is_you && (
                            <span className="text-xs text-turf ml-2">(you)</span>
                          )}
                        </h4>
                        {isTourCompetition && groupPlayer?.handicap !== undefined && (
                          <div className="text-sm text-charcoal/70">
                            HCP {groupPlayer.handicap.toFixed(1)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isMultiPlayerFormat(participant.position_name) && (
                          <Users className="w-4 h-4 inline-block text-turf" />
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        )}

        {/* Categorized Other Groups */}
        {(() => {
          if (!teeTimes || teeTimes.length === 0) {
            return (
              <div className="text-center py-6 md:py-8 text-soft-grey font-primary">
                No tee times scheduled for this competition.
              </div>
            );
          }

          // Filter out current group and categorize
          const otherGroups = teeTimes.filter(
            (t) => !currentTeeTimeId || t.id !== parseInt(currentTeeTimeId)
          );

          const playingGroups = otherGroups.filter((g) => getGroupStatus(g) === "playing");
          const notStartedGroups = otherGroups.filter((g) => getGroupStatus(g) === "not_started");
          const finishedGroups = otherGroups.filter((g) => getGroupStatus(g) === "finished");

          const renderGroupCard = (
            group: TeeTime,
            statusIndicator?: ReactNode
          ) => (
            <div
              key={group.id}
              className="border-l-4 border-soft-grey hover:border-turf transition-colors"
            >
              <div className="bg-rough/20 px-4 py-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-fairway font-display flex items-center gap-2">
                  {isOpenStart ? "Group" : group.teetime}
                  <span className="text-xs text-charcoal/50 font-primary font-normal">
                    {venueType === "indoor" && group.hitting_bay
                      ? `· Bay ${group.hitting_bay}`
                      : `· Start ${group.start_hole}`}
                  </span>
                </h4>
                {statusIndicator}
              </div>
              <div className="divide-y divide-soft-grey/50">
                {group.participants.map((participant: TeeTimeParticipant) => (
                  <div
                    key={participant.id}
                    className="px-4 py-2 flex items-center justify-between"
                  >
                    <h5 className="text-xs md:text-sm font-medium text-fairway font-primary">
                      {formatParticipantDisplay(participant)}
                    </h5>
                    {isMultiPlayerFormat(participant.position_name) && (
                      <Users className="w-3 h-3 text-turf" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );

          return (
            <div className="space-y-6">
              {/* On Course - Playing */}
              {playingGroups.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-fairway mb-3 font-primary flex items-center gap-2">
                    <Play className="w-4 h-4 text-coral" />
                    On Course
                    <span className="text-charcoal/50 font-normal">({playingGroups.length})</span>
                  </h3>
                  <div className="space-y-3">
                    {playingGroups.map((group) => {
                      const currentHole = getGroupCurrentHole(group);
                      return renderGroupCard(
                        group,
                        <span className="text-xs text-coral font-semibold font-primary">
                          Hole {currentHole}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Not Started - Waiting */}
              {notStartedGroups.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-fairway mb-3 font-primary flex items-center gap-2">
                    <Circle className="w-4 h-4 text-charcoal/40" />
                    Waiting to Start
                    <span className="text-charcoal/50 font-normal">({notStartedGroups.length})</span>
                  </h3>
                  <div className="space-y-3">
                    {notStartedGroups.map((group) => renderGroupCard(group))}
                  </div>
                </div>
              )}

              {/* Finished */}
              {finishedGroups.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-fairway mb-3 font-primary flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-turf" />
                    Finished
                    <span className="text-charcoal/50 font-normal">({finishedGroups.length})</span>
                  </h3>
                  <div className="space-y-3">
                    {finishedGroups.map((group) =>
                      renderGroupCard(
                        group,
                        <span className="text-xs text-turf font-medium font-primary">
                          Done
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Empty state if no other groups */}
              {otherGroups.length === 0 && (
                <div className="text-center py-6 text-charcoal/50 text-sm font-primary">
                  No other groups in this competition.
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Edit Group Modal */}
      {canEditGroup && (
        <AddPlayersToGroup
          isOpen={showEditGroupModal}
          onClose={() => setShowEditGroupModal(false)}
          competitionId={parseInt(competitionId)}
          currentGroupSize={currentTeeTime?.participants.length || 0}
          maxGroupSize={4}
          mode="add_to_existing"
          currentGroupMembers={registrationData?.group?.players || []}
          onSuccess={() => {
            onGroupUpdated?.();
          }}
        />
      )}

      {/* QR Code Dialog */}
      <QRCodeDialog
        open={qrDialogState.open}
        onOpenChange={(open) => setQrDialogState((prev) => ({ ...prev, open }))}
        url={qrDialogState.url}
        title={qrDialogState.title}
        description="Share this QR code or link with your group members to get them to the scorecard"
      />
    </div>
  );
}

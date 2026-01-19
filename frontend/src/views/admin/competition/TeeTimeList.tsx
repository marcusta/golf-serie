import {
  Clock,
  Users,
  Trash2,
  Lock,
  Unlock,
  Pencil,
  Ban,
  FileEdit,
  QrCode,
} from "lucide-react";
import type { TeeTime, TeeTimeParticipant } from "../../../api/tee-times";
import type { TourEnrollment } from "../../../api/tours";
import { useNotification } from "@/hooks/useNotification";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import {
  useDeleteTeeTime,
  useUpdateTeeTime,
} from "../../../api/tee-times";
import {
  useLockParticipant,
  useUnlockParticipant,
} from "../../../api/participants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TeeTimeListProps {
  teeTimes: TeeTime[];
  competition: {
    venue_type?: "outdoor" | "indoor";
    tour_id?: number;
  };
  competitionId: string;
  tourEnrollments?: TourEnrollment[];
  onRefetch: () => void;
  onEditHandicap: (participant: { id: number; name: string; handicap_index?: number }) => void;
  onEditScore: (participant: { id: number; name: string; score: number[] }) => void;
  onDQ: (participant: { id: number; name: string; isDQ: boolean }) => void;
  onShowQRCode: (url: string, title: string, description: string) => void;
  getTeeTimeUrl: (competitionId: number, teeTimeId: number) => string;
}

export function TeeTimeList({
  teeTimes,
  competition,
  competitionId,
  tourEnrollments,
  onRefetch,
  onEditHandicap,
  onEditScore,
  onDQ,
  onShowQRCode,
  getTeeTimeUrl,
}: TeeTimeListProps) {
  const { showError } = useNotification();
  const deleteTeeTimeMutation = useDeleteTeeTime();
  const updateTeeTimeMutation = useUpdateTeeTime();
  const lockParticipantMutation = useLockParticipant();
  const unlockParticipantMutation = useUnlockParticipant();
  const { confirm, dialog } = useConfirmDialog();

  const handleDeleteTeeTime = async (teeTimeId: number) => {
    const shouldDelete = await confirm({
      title: "Delete tee time?",
      description: "This will permanently remove the tee time.",
      confirmLabel: "Delete tee time",
      variant: "destructive",
    });
    if (!shouldDelete) return;

    try {
      await deleteTeeTimeMutation.mutateAsync(teeTimeId);
    } catch (error) {
      console.error("Error deleting tee time:", error);
      showError("Failed to delete tee time. Please try again.");
    }
  };

  const handleUpdateStartHole = async (teeTimeId: number, startHole: number) => {
    try {
      await updateTeeTimeMutation.mutateAsync({
        id: teeTimeId,
        data: { start_hole: startHole },
      });
      await onRefetch();
    } catch (err) {
      showError("Failed to update start hole. Please try again.");
    }
  };

  if (!teeTimes || teeTimes.length === 0) {
    return null;
  }

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Existing Tee Times
      </h3>

      <div className="space-y-4">
        {teeTimes.map((teeTime) => (
          <TeeTimeCard
            key={teeTime.id}
            teeTime={teeTime}
            competition={competition}
            competitionId={competitionId}
            tourEnrollments={tourEnrollments}
            onDelete={handleDeleteTeeTime}
            onUpdateStartHole={handleUpdateStartHole}
            onEditHandicap={onEditHandicap}
            onEditScore={onEditScore}
            onDQ={onDQ}
            onShowQRCode={onShowQRCode}
            getTeeTimeUrl={getTeeTimeUrl}
            deletePending={deleteTeeTimeMutation.isPending}
            updatePending={updateTeeTimeMutation.isPending}
            lockParticipantMutation={lockParticipantMutation}
            unlockParticipantMutation={unlockParticipantMutation}
          />
        ))}
      </div>
      </div>
      {dialog}
    </>
  );
}

interface TeeTimeCardProps {
  teeTime: TeeTime;
  competition: {
    venue_type?: "outdoor" | "indoor";
    tour_id?: number;
  };
  competitionId: string;
  tourEnrollments?: TourEnrollment[];
  onDelete: (id: number) => void;
  onUpdateStartHole: (id: number, startHole: number) => void;
  onEditHandicap: (participant: { id: number; name: string; handicap_index?: number }) => void;
  onEditScore: (participant: { id: number; name: string; score: number[] }) => void;
  onDQ: (participant: { id: number; name: string; isDQ: boolean }) => void;
  onShowQRCode: (url: string, title: string, description: string) => void;
  getTeeTimeUrl: (competitionId: number, teeTimeId: number) => string;
  deletePending: boolean;
  updatePending: boolean;
  lockParticipantMutation: ReturnType<typeof useLockParticipant>;
  unlockParticipantMutation: ReturnType<typeof useUnlockParticipant>;
}

function TeeTimeCard({
  teeTime,
  competition,
  competitionId,
  tourEnrollments,
  onDelete,
  onUpdateStartHole,
  onEditHandicap,
  onEditScore,
  onDQ,
  onShowQRCode,
  getTeeTimeUrl,
  deletePending,
  lockParticipantMutation,
  unlockParticipantMutation,
}: TeeTimeCardProps) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          <span className="font-medium text-gray-900">
            {teeTime.teetime}
          </span>
          {competition?.venue_type === "indoor" && teeTime.hitting_bay && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-semibold">
              Bay {teeTime.hitting_bay}
            </span>
          )}
          <button
            onClick={() =>
              onShowQRCode(
                getTeeTimeUrl(parseInt(competitionId), teeTime.id),
                `Tee Time ${teeTime.teetime}`,
                `Share this tee time group with ${teeTime.participants.length} participant(s)`
              )
            }
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Share tee time QR code"
          >
            <QrCode className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {competition?.venue_type === "outdoor" && (
            <>
              <label className="text-sm text-gray-600">Start hole:</label>
              <Select
                value={(teeTime.start_hole ?? 1).toString()}
                onValueChange={(value) =>
                  onUpdateStartHole(teeTime.id, parseInt(value))
                }
              >
                <SelectTrigger className="h-8 w-[72px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
          <Users className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-500">
            {teeTime.participants.length} participants
          </span>
          <button
            onClick={() => onDelete(teeTime.id)}
            disabled={deletePending}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
            title="Delete tee time"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {teeTime.participants.map((participant) => (
          <ParticipantCard
            key={participant.id}
            participant={participant}
            competition={competition}
            tourEnrollments={tourEnrollments}
            onEditHandicap={onEditHandicap}
            onEditScore={onEditScore}
            onDQ={onDQ}
            lockParticipantMutation={lockParticipantMutation}
            unlockParticipantMutation={unlockParticipantMutation}
          />
        ))}
      </div>
    </div>
  );
}

interface ParticipantCardProps {
  participant: TeeTimeParticipant;
  competition: {
    tour_id?: number;
  };
  tourEnrollments?: TourEnrollment[];
  onEditHandicap: (participant: { id: number; name: string; handicap_index?: number }) => void;
  onEditScore: (participant: { id: number; name: string; score: number[] }) => void;
  onDQ: (participant: { id: number; name: string; isDQ: boolean }) => void;
  lockParticipantMutation: ReturnType<typeof useLockParticipant>;
  unlockParticipantMutation: ReturnType<typeof useUnlockParticipant>;
}

function ParticipantCard({
  participant,
  competition,
  tourEnrollments,
  onEditHandicap,
  onEditScore,
  onDQ,
  lockParticipantMutation,
  unlockParticipantMutation,
}: ParticipantCardProps) {
  // Look up handicap from enrollments for tour competitions
  const enrollment = competition?.tour_id && participant.player_id
    ? tourEnrollments?.find((e) => e.player_id === participant.player_id)
    : null;

  // Check if the round has been played (has any scores)
  const hasPlayed = participant.score?.some((s: number) => s > 0 || s === -1);

  // Display the snapshot handicap if available, otherwise fall back to enrollment handicap
  const displayHandicap = participant.handicap_index ?? enrollment?.handicap;

  const participantName = competition?.tour_id
    ? participant.player_name || participant.position_name
    : `${participant.team_name} ${participant.position_name}`;

  const isDQ = Boolean(participant.is_dq);

  return (
    <div
      className={`p-3 rounded-lg border ${
        isDQ
          ? "bg-red-50 border-red-200"
          : "bg-white border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">
            {participantName}
          </span>
          {isDQ && (
            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
              DQ
            </span>
          )}
          {!isDQ && displayHandicap !== undefined && (
            <span className="text-xs text-gray-500 font-mono">
              HCP {displayHandicap.toFixed(1)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Edit handicap button - only visible when round has been played */}
          {hasPlayed && (
            <button
              onClick={() => {
                onEditHandicap({
                  id: participant.id,
                  name: participantName,
                  handicap_index: participant.handicap_index,
                });
              }}
              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Edit handicap for this round"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {participant.is_locked ? (
            <Lock className="h-4 w-4 text-red-600" />
          ) : (
            <Unlock className="h-4 w-4 text-green-600" />
          )}
          <button
            onClick={() => {
              if (participant.is_locked) {
                unlockParticipantMutation.mutate(participant.id);
              } else {
                lockParticipantMutation.mutate(participant.id);
              }
            }}
            disabled={
              lockParticipantMutation.isPending ||
              unlockParticipantMutation.isPending
            }
            className={`px-2 py-1 text-xs rounded transition-colors disabled:opacity-50 ${
              participant.is_locked
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-red-100 text-red-700 hover:bg-red-200"
            }`}
            title={
              participant.is_locked
                ? "Unlock scorecard"
                : "Lock scorecard"
            }
          >
            {participant.is_locked ? "Unlock" : "Lock"}
          </button>
        </div>
      </div>
      {!competition?.tour_id && participant.player_name && (
        <div className="text-sm text-gray-500">
          {participant.player_name}
        </div>
      )}
      {participant.locked_at && (
        <div className="text-xs text-gray-400 mt-1">
          Locked:{" "}
          {new Date(participant.locked_at).toLocaleString()}
        </div>
      )}
      {/* Admin action buttons - show when player has played */}
      {hasPlayed && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
          <button
            onClick={() => {
              onEditScore({
                id: participant.id,
                name: participantName,
                score: participant.score || [],
              });
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Edit scores"
          >
            <FileEdit className="h-3 w-3" />
            Edit Score
          </button>
          <button
            onClick={() => {
              onDQ({
                id: participant.id,
                name: participantName,
                isDQ: isDQ,
              });
            }}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
              isDQ
                ? "text-green-600 hover:bg-green-50"
                : "text-red-600 hover:bg-red-50"
            }`}
            title={isDQ ? "Remove DQ" : "Disqualify"}
          >
            <Ban className="h-3 w-3" />
            {isDQ ? "Remove DQ" : "DQ"}
          </button>
        </div>
      )}
    </div>
  );
}

export default TeeTimeList;

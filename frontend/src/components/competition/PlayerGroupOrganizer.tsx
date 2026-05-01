import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Edit3, Loader2, Plus, X, Users, Play } from "lucide-react";
import {
  useUpdateCompetitionPlayedHoles,
  type CompetitionRoundType,
} from "../../api/competitions";
import {
  useCreateParticipant,
  useDeleteParticipant,
  type TeeTime,
  type TeeTimeParticipant,
} from "../../api/tee-times";
import { useTourEnrollments, type TourEnrollment } from "../../api/tours";
import { useTeams } from "../../api/teams";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Button } from "../ui/button";
import { getSessionStorageKey } from "../../utils/holeNavigation";

interface PlayerGroupOrganizerProps {
  competitionId: number;
  tourId: number;
  roundType: CompetitionRoundType;
  teeTimes: TeeTime[] | undefined;
  onUpdate?: () => void;
}

type EnrollmentLabel = string;
type EditableRoundType = Extract<CompetitionRoundType, "front_9" | "back_9">;

function enrollmentDisplayName(e: TourEnrollment): EnrollmentLabel {
  return e.player_name || e.name || e.email || "Unnamed";
}

function isEnrollmentAssigned(
  enrollment: TourEnrollment,
  teeTimes: TeeTime[]
): boolean {
  const label = enrollmentDisplayName(enrollment);
  return teeTimes.some((tt) =>
    tt.participants.some((p) => {
      if (enrollment.player_id && p.player_id) {
        return p.player_id === enrollment.player_id;
      }
      if (!enrollment.player_id && !p.player_id) {
        return p.player_name === label || p.position_name === label;
      }
      return false;
    })
  );
}

function getEditableRoundType(roundType: CompetitionRoundType): EditableRoundType {
  return roundType === "front_9" ? "front_9" : "back_9";
}

function getRoundLabel(roundType: CompetitionRoundType): string {
  if (roundType === "front_9") return "Holes 1-9";
  if (roundType === "back_9") return "Holes 10-18";
  return "18 holes";
}

function hasRecordedScores(teeTimes: TeeTime[]): boolean {
  return teeTimes.some((teeTime) =>
    teeTime.participants.some((participant) =>
      participant.score.some((shots) => shots !== 0)
    )
  );
}

export function PlayerGroupOrganizer({
  competitionId: competitionId,
  tourId,
  roundType,
  teeTimes,
  onUpdate,
}: PlayerGroupOrganizerProps) {
  const { data: enrollments } = useTourEnrollments(tourId, "active");
  const { data: teams } = useTeams();
  const createParticipant = useCreateParticipant();
  const deleteParticipant = useDeleteParticipant();
  const updatePlayedHoles = useUpdateCompetitionPlayedHoles();

  const [openTeeTimeId, setOpenTeeTimeId] = useState<number | null>(null);
  const [isEditRoundOpen, setIsEditRoundOpen] = useState(false);
  const [selectedRoundType, setSelectedRoundType] =
    useState<EditableRoundType>(getEditableRoundType(roundType));
  const [busyParticipantId, setBusyParticipantId] = useState<number | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const safeTeeTimes = teeTimes || [];
  const safeEnrollments = enrollments || [];
  const currentRoundLabel = getRoundLabel(roundType);
  const scoresRecorded = hasRecordedScores(safeTeeTimes);

  const unassigned = useMemo(
    () =>
      safeEnrollments.filter((e) => !isEnrollmentAssigned(e, safeTeeTimes)),
    [safeEnrollments, safeTeeTimes]
  );

  const defaultTeamId = teams && teams.length > 0 ? teams[0].id : null;
  const openTeeTime =
    openTeeTimeId != null
      ? safeTeeTimes.find((tt) => tt.id === openTeeTimeId) || null
      : null;

  async function handleAdd(enrollment: TourEnrollment, teeTime: TeeTime) {
    if (!defaultTeamId) {
      setError(
        "No team available. Ask an admin to create at least one team first."
      );
      return;
    }
    if (teeTime.participants.length >= 4) {
      setError("This group is full.");
      return;
    }
    setError(null);
    const label = enrollmentDisplayName(enrollment);
    try {
      await createParticipant.mutateAsync({
        tee_time_id: teeTime.id,
        team_id: defaultTeamId,
        position_name: label,
        player_names: label,
        player_id: enrollment.player_id ?? undefined,
        tee_order: teeTime.participants.length + 1,
      });
      onUpdate?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add player to group"
      );
    }
  }

  async function handleRemove(participant: TeeTimeParticipant) {
    setBusyParticipantId(participant.id);
    setError(null);
    try {
      await deleteParticipant.mutateAsync(participant.id);
      onUpdate?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove player"
      );
    } finally {
      setBusyParticipantId(null);
    }
  }

  function handleOpenEditRound() {
    setSelectedRoundType(getEditableRoundType(roundType));
    setIsEditRoundOpen(true);
    setError(null);
  }

  async function handleSaveRound() {
    if (scoresRecorded) {
      setError("Round holes cannot be changed after scores have been recorded.");
      return;
    }

    setError(null);
    try {
      await updatePlayedHoles.mutateAsync({
        id: competitionId,
        roundType: selectedRoundType,
      });
      safeTeeTimes.forEach((teeTime) => {
        sessionStorage.removeItem(getSessionStorageKey(teeTime.id.toString()));
      });
      setIsEditRoundOpen(false);
      onUpdate?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update played holes"
      );
    }
  }

  if (!teeTimes) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-fairway" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-coral/30 bg-coral/10 p-3 text-sm text-coral">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-soft-grey bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-label-sm font-semibold uppercase tracking-wide text-turf">
              Round
            </p>
            <p className="text-body-lg font-semibold text-charcoal">
              {currentRoundLabel}
            </p>
            {scoresRecorded && (
              <p className="mt-1 text-body-xs text-charcoal/60">
                Locked after scoring started
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenEditRound}
            disabled={scoresRecorded}
            className="min-h-[44px] rounded border-turf text-turf hover:bg-turf/10"
          >
            <Edit3 className="mr-2 h-4 w-4" />
            Edit round
          </Button>
        </div>
      </div>

      {/* Tee time cards */}
      <div className="space-y-3">
        {safeTeeTimes.map((tt) => (
          <div
            key={tt.id}
            className="rounded-xl border border-soft-grey bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-charcoal">
                  {tt.teetime}
                </div>
                <div className="text-xs text-charcoal/60">
                  Hole {tt.start_hole} · {tt.participants.length}/4
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpenTeeTimeId(tt.id)}
                  disabled={
                    tt.participants.length >= 4 || unassigned.length === 0
                  }
                  className="flex items-center gap-1 rounded-lg bg-turf px-3 py-1.5 text-sm text-white hover:bg-fairway disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
                {tt.participants.length > 0 && (
                  <Link
                    to={`/player/competitions/${competitionId}/tee-times/${tt.id}`}
                    className="flex items-center gap-1 rounded-lg bg-coral px-3 py-1.5 text-sm font-semibold text-white hover:bg-coral/90"
                  >
                    <Play className="h-4 w-4" />
                    Play
                  </Link>
                )}
              </div>
            </div>

            {tt.participants.length === 0 ? (
              <div className="rounded-lg border border-dashed border-soft-grey py-6 text-center text-sm text-charcoal/50">
                No players assigned
              </div>
            ) : (
              <ul className="divide-y divide-soft-grey">
                {tt.participants.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between py-2"
                  >
                    <span className="text-sm text-charcoal">
                      {p.player_name || p.position_name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemove(p)}
                      disabled={busyParticipantId === p.id}
                      className="p-1 text-charcoal/50 hover:text-coral disabled:opacity-50"
                      aria-label={`Remove ${p.player_name || p.position_name}`}
                    >
                      {busyParticipantId === p.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {/* Unassigned roster */}
      <div className="rounded-xl border border-soft-grey bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-charcoal/60" />
          <h3 className="text-sm font-semibold text-charcoal">
            Unassigned ({unassigned.length})
          </h3>
        </div>
        {unassigned.length === 0 ? (
          <p className="py-4 text-center text-sm text-charcoal/50">
            All enrolled players are assigned to a group.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {unassigned.map((e) => (
              <li
                key={e.id}
                className="rounded-full border border-soft-grey bg-rough/30 px-3 py-1 text-sm text-charcoal"
              >
                {enrollmentDisplayName(e)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add-to-group sheet */}
      <Dialog
        open={openTeeTime !== null}
        onOpenChange={(o) => !o && setOpenTeeTimeId(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add to {openTeeTime?.teetime} (Hole {openTeeTime?.start_hole})
            </DialogTitle>
          </DialogHeader>
          {unassigned.length === 0 ? (
            <p className="py-6 text-center text-sm text-charcoal/60">
              No unassigned players.
            </p>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              <ul className="divide-y divide-soft-grey">
                {unassigned.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={async () => {
                        if (openTeeTime) {
                          await handleAdd(e, openTeeTime);
                          // close once group is full or roster empty
                          if (
                            openTeeTime.participants.length + 1 >= 4 ||
                            unassigned.length === 1
                          ) {
                            setOpenTeeTimeId(null);
                          }
                        }
                      }}
                      disabled={createParticipant.isPending}
                      className="flex w-full items-center justify-between py-3 text-left text-sm text-charcoal hover:bg-rough/20 disabled:opacity-50"
                    >
                      <span>{enrollmentDisplayName(e)}</span>
                      <Plus className="h-4 w-4 text-turf" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => setOpenTeeTimeId(null)}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditRoundOpen} onOpenChange={setIsEditRoundOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit round</DialogTitle>
            <DialogDescription>
              Choose which nine holes this round should use for scoring and the
              start-list hole labels.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <label className="text-label-md font-medium text-charcoal">
              Played holes
            </label>
            <Select
              value={selectedRoundType}
              onValueChange={(value) =>
                setSelectedRoundType(value as EditableRoundType)
              }
              disabled={updatePlayedHoles.isPending}
            >
              <SelectTrigger className="min-h-[44px] w-full rounded border-soft-grey bg-scorecard text-charcoal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="front_9">Holes 1-9</SelectItem>
                <SelectItem value="back_9">Holes 10-18</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-body-xs text-charcoal/60">
              This updates all groups in the start list.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditRoundOpen(false)}
              disabled={updatePlayedHoles.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveRound}
              disabled={updatePlayedHoles.isPending}
              className="bg-turf text-scorecard hover:bg-fairway"
            >
              {updatePlayedHoles.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save round
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PlayerGroupOrganizer;

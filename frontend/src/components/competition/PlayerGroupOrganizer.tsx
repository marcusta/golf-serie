import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Plus, X, Users, Play } from "lucide-react";
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
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";

interface PlayerGroupOrganizerProps {
  competitionId: number;
  tourId: number;
  teeTimes: TeeTime[] | undefined;
  onUpdate?: () => void;
}

type EnrollmentLabel = string;

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

export function PlayerGroupOrganizer({
  competitionId: competitionId,
  tourId,
  teeTimes,
  onUpdate,
}: PlayerGroupOrganizerProps) {
  const { data: enrollments } = useTourEnrollments(tourId, "active");
  const { data: teams } = useTeams();
  const createParticipant = useCreateParticipant();
  const deleteParticipant = useDeleteParticipant();

  const [openTeeTimeId, setOpenTeeTimeId] = useState<number | null>(null);
  const [busyParticipantId, setBusyParticipantId] = useState<number | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const safeTeeTimes = teeTimes || [];
  const safeEnrollments = enrollments || [];

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
    </div>
  );
}

export default PlayerGroupOrganizer;

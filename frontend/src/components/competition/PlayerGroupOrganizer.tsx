import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Edit3, Loader2, Plus, X, Users, Play } from "lucide-react";
import {
  useUpdateCompetitionPlayedHoles,
  type CompetitionRoundType,
} from "../../api/competitions";
import {
  useCreateParticipant,
  useCreateTeeTime,
  useDeleteParticipant,
  type TeeTime,
  type TeeTimeParticipant,
} from "../../api/tee-times";
import { useTourEnrollments, type TourEnrollment } from "../../api/tours";
import {
  useCompetitionGuests,
  useCreateGuest,
  useDeleteGuest,
  type CompetitionGuest,
} from "../../api/guests";
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
import { Input } from "../ui/input";
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

type PoolItem =
  | {
      kind: "enrollment";
      key: string;
      name: string;
      enrollment: TourEnrollment;
    }
  | { kind: "guest"; key: string; name: string; guest: CompetitionGuest };

function enrollmentDisplayName(e: TourEnrollment): EnrollmentLabel {
  return e.player_name || e.name || e.email || "Unnamed";
}

function isGuestAssigned(guest: CompetitionGuest, teeTimes: TeeTime[]): boolean {
  return teeTimes.some((tt) =>
    tt.participants.some(
      (p) =>
        p.is_guest &&
        (p.player_name === guest.name || p.position_name === guest.name)
    )
  );
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

function getNextTeeTime(teeTimes: TeeTime[]): string {
  if (teeTimes.length === 0) return "08:00";
  const last = teeTimes[teeTimes.length - 1].teetime;
  const next = new Date(`2000-01-01T${last}`);
  if (Number.isNaN(next.getTime())) return "08:00";
  next.setMinutes(next.getMinutes() + 10);
  return next.toTimeString().slice(0, 5);
}

function getDefaultStartHole(
  teeTimes: TeeTime[],
  roundType: CompetitionRoundType
): number {
  if (teeTimes.length > 0) return teeTimes[teeTimes.length - 1].start_hole;
  return roundType === "back_9" ? 10 : 1;
}

export function PlayerGroupOrganizer({
  competitionId: competitionId,
  tourId,
  roundType,
  teeTimes,
  onUpdate,
}: PlayerGroupOrganizerProps) {
  const { data: enrollments } = useTourEnrollments(tourId, "active");
  const { data: guests } = useCompetitionGuests(competitionId);
  const { data: teams } = useTeams();
  const createParticipant = useCreateParticipant();
  const createTeeTime = useCreateTeeTime();
  const deleteParticipant = useDeleteParticipant();
  const createGuest = useCreateGuest();
  const deleteGuest = useDeleteGuest();
  const updatePlayedHoles = useUpdateCompetitionPlayedHoles();

  const [openTeeTimeId, setOpenTeeTimeId] = useState<number | null>(null);
  const [isGuestOpen, setIsGuestOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestHandicap, setGuestHandicap] = useState("");
  const [busyGuestId, setBusyGuestId] = useState<number | null>(null);
  const [isEditRoundOpen, setIsEditRoundOpen] = useState(false);
  const [selectedRoundType, setSelectedRoundType] =
    useState<EditableRoundType>(getEditableRoundType(roundType));
  const [newGroupTime, setNewGroupTime] = useState("08:00");
  const [newGroupStartHole, setNewGroupStartHole] = useState(1);
  const [busyParticipantId, setBusyParticipantId] = useState<number | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const safeTeeTimes = teeTimes || [];
  const safeEnrollments = enrollments || [];
  const safeGuests = guests || [];
  const currentRoundLabel = getRoundLabel(roundType);
  const scoresRecorded = hasRecordedScores(safeTeeTimes);

  const pool = useMemo<PoolItem[]>(() => {
    const items: PoolItem[] = [];
    for (const e of safeEnrollments) {
      if (!isEnrollmentAssigned(e, safeTeeTimes)) {
        items.push({
          kind: "enrollment",
          key: `e-${e.id}`,
          name: enrollmentDisplayName(e),
          enrollment: e,
        });
      }
    }
    for (const g of safeGuests) {
      if (!isGuestAssigned(g, safeTeeTimes)) {
        items.push({ kind: "guest", key: `g-${g.id}`, name: g.name, guest: g });
      }
    }
    return items;
  }, [safeEnrollments, safeGuests, safeTeeTimes]);

  const defaultTeamId = teams && teams.length > 0 ? teams[0].id : null;
  const openTeeTime =
    openTeeTimeId != null
      ? safeTeeTimes.find((tt) => tt.id === openTeeTimeId) || null
      : null;

  async function handleAddItem(item: PoolItem, teeTime: TeeTime) {
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
    try {
      await createParticipant.mutateAsync({
        tee_time_id: teeTime.id,
        team_id: defaultTeamId,
        position_name: item.name,
        player_names: item.name,
        tee_order: teeTime.participants.length + 1,
        ...(item.kind === "enrollment"
          ? { player_id: item.enrollment.player_id ?? undefined }
          : { is_guest: true, handicap_index: item.guest.handicap_index }),
      });
      onUpdate?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add player to group"
      );
    }
  }

  function handleOpenGuest() {
    setGuestName("");
    setGuestHandicap("");
    setError(null);
    setIsGuestOpen(true);
  }

  async function handleCreateGuest() {
    const name = guestName.trim();
    if (!name) {
      setError("Enter a name for the guest.");
      return;
    }
    const raw = guestHandicap.trim();
    const handicap = raw === "" ? null : Number(raw);
    if (handicap !== null && !Number.isFinite(handicap)) {
      setError("Handicap must be a number.");
      return;
    }
    setError(null);
    try {
      await createGuest.mutateAsync({
        competitionId,
        name,
        handicap_index: handicap,
      });
      setIsGuestOpen(false);
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add guest");
    }
  }

  async function handleDeleteGuest(guest: CompetitionGuest) {
    setBusyGuestId(guest.id);
    setError(null);
    try {
      await deleteGuest.mutateAsync({ competitionId, guestId: guest.id });
      onUpdate?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove guest");
    } finally {
      setBusyGuestId(null);
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
    setNewGroupTime(getNextTeeTime(safeTeeTimes));
    setNewGroupStartHole(getDefaultStartHole(safeTeeTimes, roundType));
    setIsEditRoundOpen(true);
    setError(null);
  }

  async function handleCreateGroup() {
    if (!newGroupTime) {
      setError("Enter a start time for the new group.");
      return;
    }
    setError(null);
    try {
      await createTeeTime.mutateAsync({
        competitionId,
        teetime: newGroupTime,
        start_hole: newGroupStartHole,
      });
      const bumped = new Date(`2000-01-01T${newGroupTime}`);
      if (!Number.isNaN(bumped.getTime())) {
        bumped.setMinutes(bumped.getMinutes() + 10);
        setNewGroupTime(bumped.toTimeString().slice(0, 5));
      }
      onUpdate?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add group"
      );
    }
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
                  disabled={tt.participants.length >= 4 || pool.length === 0}
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
                    <span className="flex items-center gap-1.5 text-sm text-charcoal">
                      {p.player_name || p.position_name}
                      {p.is_guest && (
                        <span className="rounded-full bg-soft-grey px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-charcoal/60">
                          Guest
                        </span>
                      )}
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
            Unassigned ({pool.length})
          </h3>
        </div>
        {pool.length === 0 ? (
          <p className="py-4 text-center text-sm text-charcoal/50">
            Everyone is assigned to a group.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {pool.map((item) => (
              <li
                key={item.key}
                className="flex items-center gap-1.5 rounded-full border border-soft-grey bg-rough/30 px-3 py-1 text-sm text-charcoal"
              >
                <span>{item.name}</span>
                {item.kind === "guest" && (
                  <>
                    <span className="rounded-full bg-soft-grey px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-charcoal/60">
                      Guest
                    </span>
                    {item.guest.handicap_index != null && (
                      <span className="text-xs text-turf">
                        HCP {item.guest.handicap_index.toFixed(1)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteGuest(item.guest)}
                      disabled={busyGuestId === item.guest.id}
                      className="ml-0.5 text-charcoal/50 hover:text-coral disabled:opacity-50"
                      aria-label={`Remove guest ${item.name}`}
                    >
                      {busyGuestId === item.guest.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 border-t border-soft-grey pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenGuest}
            className="w-full border-turf text-turf hover:bg-turf/10"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add guest
          </Button>
          <p className="mt-2 text-center text-body-xs text-charcoal/60">
            Guests join the pool here, then get organised into a group like
            anyone else. They appear on the leaderboard but never earn tour
            points.
          </p>
        </div>
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
          {pool.length === 0 ? (
            <p className="py-6 text-center text-sm text-charcoal/60">
              No unassigned players.
            </p>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              <ul className="divide-y divide-soft-grey">
                {pool.map((item) => (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={async () => {
                        if (openTeeTime) {
                          await handleAddItem(item, openTeeTime);
                          // close once group is full or roster empty
                          if (
                            openTeeTime.participants.length + 1 >= 4 ||
                            pool.length === 1
                          ) {
                            setOpenTeeTimeId(null);
                          }
                        }
                      }}
                      disabled={createParticipant.isPending}
                      className="flex w-full items-center justify-between py-3 text-left text-sm text-charcoal hover:bg-rough/20 disabled:opacity-50"
                    >
                      <span className="flex items-center gap-1.5">
                        {item.name}
                        {item.kind === "guest" && (
                          <span className="rounded-full bg-soft-grey px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-charcoal/60">
                            Guest
                          </span>
                        )}
                      </span>
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

      {/* Add-guest sheet */}
      <Dialog open={isGuestOpen} onOpenChange={setIsGuestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add guest</DialogTitle>
            <DialogDescription>
              Adds the guest to the unassigned pool. Organise them into a group
              afterwards like any other player. Guests appear on the leaderboard
              but are never assigned tour points.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <label className="text-label-md font-medium text-charcoal">
              Guest name
            </label>
            <Input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="e.g. Jane Doe"
              disabled={createGuest.isPending}
              className="min-h-[44px]"
              aria-label="Guest name"
            />

            <label className="text-label-md font-medium text-charcoal">
              Handicap index (optional)
            </label>
            <Input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={guestHandicap}
              onChange={(e) => setGuestHandicap(e.target.value)}
              placeholder="e.g. 12.4"
              disabled={createGuest.isPending}
              className="min-h-[44px]"
              aria-label="Guest handicap index"
            />
            <p className="text-body-xs text-charcoal/60">
              Used for net scoring. Leave blank if unknown.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsGuestOpen(false)}
                disabled={createGuest.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCreateGuest}
                disabled={createGuest.isPending || !guestName.trim()}
                className="bg-turf text-scorecard hover:bg-fairway"
              >
                {createGuest.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Add guest
              </Button>
            </div>
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
              disabled={updatePlayedHoles.isPending || scoresRecorded}
            >
              <SelectTrigger className="min-h-[44px] w-full rounded border-soft-grey bg-scorecard text-charcoal">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="front_9">Holes 1-9</SelectItem>
                <SelectItem value="back_9">Holes 10-18</SelectItem>
              </SelectContent>
            </Select>
            {scoresRecorded ? (
              <p className="text-body-xs text-charcoal/60">
                Locked after scoring started.
              </p>
            ) : (
              <p className="text-body-xs text-charcoal/60">
                This updates all groups in the start list.
              </p>
            )}
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSaveRound}
                disabled={updatePlayedHoles.isPending || scoresRecorded}
                className="bg-turf text-scorecard hover:bg-fairway"
              >
                {updatePlayedHoles.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save round
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-3 border-t border-soft-grey pt-4">
            <label className="text-label-md font-medium text-charcoal">
              Add group
            </label>
            <div className="flex gap-2">
              <Input
                type="time"
                value={newGroupTime}
                onChange={(e) => setNewGroupTime(e.target.value)}
                disabled={createTeeTime.isPending}
                className="min-h-[44px] flex-1"
                aria-label="New group start time"
              />
              <Select
                value={newGroupStartHole.toString()}
                onValueChange={(value) => setNewGroupStartHole(parseInt(value))}
                disabled={createTeeTime.isPending}
              >
                <SelectTrigger className="min-h-[44px] w-28 rounded border-soft-grey bg-scorecard text-charcoal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Hole 1</SelectItem>
                  <SelectItem value="10">Hole 10</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleCreateGroup}
              disabled={createTeeTime.isPending || !newGroupTime}
              className="w-full border-turf text-turf hover:bg-turf/10"
            >
              {createTeeTime.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Add group
            </Button>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditRoundOpen(false)}
              disabled={updatePlayedHoles.isPending || createTeeTime.isPending}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PlayerGroupOrganizer;

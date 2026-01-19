import { Link } from "@tanstack/react-router";
import { useCourses, useCourseTees } from "../../../api/courses";
import { useFinalizeCompetitionResults } from "../../../api/competitions";
import {
  Calendar,
  MapPin,
  Loader2,
  Flag,
  Edit,
  Trash2,
  Clock,
  Users,
  ClipboardEdit,
  CheckCircle,
  ListOrdered,
} from "lucide-react";

/**
 * Base competition type - minimal fields needed by the list
 */
export interface CompetitionListItem {
  id: number;
  name: string;
  date: string;
  course_id?: number;
  course_name?: string;
  tee_id?: number;
  start_mode?: "scheduled" | "open";
  is_results_final?: boolean;
  results_finalized_at?: string;
}

export interface CompetitionListProps<T extends CompetitionListItem> {
  /** The list of competitions to display */
  competitions: T[] | undefined;
  /** Whether data is loading */
  isLoading: boolean;
  /** Parent context type - affects styling and icons */
  parentType: "series" | "tour";
  /** Callback when edit button is clicked */
  onEdit: (competition: T) => void;
  /** Callback when delete button is clicked */
  onDelete: (competition: T) => void;
  /** Whether to show manual score entry link (default: true for series, false for tour) */
  showManualScoreEntry?: boolean;
}

function TeeDisplay({
  courseId,
  teeId,
}: {
  courseId?: number;
  teeId?: number;
}) {
  const { data: tees } = useCourseTees(courseId || 0);
  if (!courseId || !teeId) return null;
  const tee = tees?.find((t) => t.id === teeId);
  if (!tee) return null;

  return (
    <span className="flex items-center gap-1 text-sm text-charcoal/60">
      <Flag className="h-3 w-3" />
      {tee.name}
    </span>
  );
}

/**
 * Shared competition list component for both series and tour contexts.
 * Handles displaying competitions with actions for edit, delete, manage tee times, etc.
 */
export function CompetitionList<T extends CompetitionListItem>({
  competitions,
  isLoading,
  parentType,
  onEdit,
  onDelete,
  showManualScoreEntry = parentType === "series",
}: CompetitionListProps<T>) {
  const { data: courses } = useCourses();
  const finalizeResults = useFinalizeCompetitionResults();

  const getCourseName = (competition: T) => {
    // Use course_name if available (tour competitions have this)
    if (competition.course_name) return competition.course_name;
    if (!competition.course_id) return "No course";
    return courses?.find((c) => c.id === competition.course_id)?.name || "Unknown course";
  };

  const ScheduledIcon = parentType === "series" ? Clock : ListOrdered;

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-turf" />
      </div>
    );
  }

  if (!competitions || competitions.length === 0) {
    return (
      <div className="text-center py-10 text-charcoal/60">
        <p>No competitions yet.</p>
        <p className="text-sm mt-2">Click "Add Competition" to create one.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-soft-grey rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[minmax(220px,2fr)_120px_minmax(180px,1.5fr)_120px_110px_160px] gap-4 px-4 py-2 text-xs font-semibold text-charcoal/70 uppercase tracking-wide border-b border-soft-grey bg-soft-grey/30">
            <div>Competition</div>
            <div>Date</div>
            <div>Course</div>
            <div>Tee</div>
            <div>Mode</div>
            <div className="text-right">Actions</div>
          </div>
          <div className="divide-y divide-soft-grey">
            {competitions.map((competition) => (
              <div
                key={competition.id}
                className="grid grid-cols-[minmax(220px,2fr)_120px_minmax(180px,1.5fr)_120px_110px_160px] gap-4 px-4 py-2 text-sm items-center hover:bg-rough/20"
              >
                <div>
                  <div className="font-medium text-charcoal">{competition.name}</div>
                  <div className="text-xs text-charcoal/60">
                    {competition.is_results_final ? "Results final" : "Draft"}
                  </div>
                </div>
                <div className="text-charcoal/70 tabular-nums">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {competition.date}
                  </span>
                </div>
                <div className="text-charcoal/70">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {getCourseName(competition)}
                  </span>
                </div>
                <div className="text-charcoal/60">
                  {competition.tee_id ? (
                    <TeeDisplay
                      courseId={competition.course_id}
                      teeId={competition.tee_id}
                    />
                  ) : (
                    "-"
                  )}
                </div>
                <div className="text-xs font-semibold uppercase tracking-wide text-charcoal/60">
                  {competition.start_mode === "open" ? "Open" : "Scheduled"}
                </div>
                <div className="flex items-center justify-end gap-1">
                  {competition.start_mode === "scheduled" && (
                    <Link
                      to="/admin/competitions/$competitionId/tee-times"
                      params={{ competitionId: competition.id.toString() }}
                      className="h-8 w-8 flex items-center justify-center rounded-md text-charcoal/60 hover:text-turf hover:bg-rough/30 transition-colors"
                      title={parentType === "series" ? "Manage tee times" : "Manage start list"}
                    >
                      <ScheduledIcon className="w-4 h-4" />
                    </Link>
                  )}
                  {competition.start_mode === "open" && (
                    <Link
                      to="/admin/competitions/$competitionId/groups"
                      params={{ competitionId: competition.id.toString() }}
                      className="h-8 w-8 flex items-center justify-center rounded-md text-charcoal/60 hover:text-turf hover:bg-rough/30 transition-colors"
                      title="View playing groups"
                    >
                      <Users className="w-4 h-4" />
                    </Link>
                  )}
                  {showManualScoreEntry && (
                    <Link
                      to={`/admin/competitions/${competition.id}/manual-scores`}
                      className="h-8 w-8 flex items-center justify-center rounded-md text-charcoal/60 hover:text-turf hover:bg-rough/30 transition-colors"
                      title="Manual score entry"
                    >
                      <ClipboardEdit className="w-4 h-4" />
                    </Link>
                  )}
                  {competition.is_results_final ? (
                    <div
                      className="h-8 w-8 flex items-center justify-center rounded-md text-turf"
                      title={`Results finalized${competition.results_finalized_at ? ` on ${new Date(competition.results_finalized_at).toLocaleDateString()}` : ""}`}
                    >
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          !confirm(
                            "Finalize results for this competition? This will calculate and store the final standings and points."
                          )
                        ) {
                          return;
                        }
                        finalizeResults.mutate(competition.id);
                      }}
                      disabled={finalizeResults.isPending}
                      className="h-8 w-8 flex items-center justify-center rounded-md text-coral hover:bg-coral/10 transition-colors disabled:opacity-50"
                      title="Finalize results"
                    >
                      {finalizeResults.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(competition);
                    }}
                    className="h-8 w-8 flex items-center justify-center rounded-md text-charcoal/60 hover:text-turf hover:bg-rough/30 transition-colors"
                    title="Edit competition"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(competition);
                    }}
                    className="h-8 w-8 flex items-center justify-center rounded-md text-flag hover:bg-flag/10 transition-colors"
                    title="Delete competition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

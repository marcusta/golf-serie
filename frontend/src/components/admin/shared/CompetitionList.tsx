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
  variant,
}: {
  courseId?: number;
  teeId?: number;
  variant: "series" | "tour";
}) {
  const { data: tees } = useCourseTees(courseId || 0);
  if (!courseId || !teeId) return null;
  const tee = tees?.find((t) => t.id === teeId);
  if (!tee) return null;

  const colorClass = variant === "series" ? "text-blue-600" : "text-green-600";

  return (
    <span className={`flex items-center gap-1 ${colorClass} text-sm`}>
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

  // Styling based on parent type
  const styles = {
    series: {
      loader: "text-blue-600",
      empty: "text-gray-500",
      card: "border border-gray-200 rounded-lg p-4 hover:bg-gray-50",
      title: "text-gray-900",
      meta: "text-gray-600",
      scheduledIcon: Clock,
      scheduledIconClass: "text-blue-600 hover:bg-blue-50",
      groupsIconClass: "text-purple-600 hover:bg-purple-50",
      manualScoreClass: "text-green-600 hover:bg-green-50",
      finalizedClass: "text-green-600",
      finalizeClass: "text-gray-400 hover:text-green-600 hover:bg-green-50",
      editClass: "text-blue-600 hover:bg-blue-50",
      deleteClass: "text-red-600 hover:bg-red-50",
    },
    tour: {
      loader: "text-fairway",
      empty: "text-charcoal/60",
      card: "border border-soft-grey rounded-lg p-4 hover:bg-light-rough/30",
      title: "text-charcoal",
      meta: "text-charcoal/60",
      scheduledIcon: ListOrdered,
      scheduledIconClass: "text-charcoal/60 hover:text-fairway",
      groupsIconClass: "text-charcoal/60 hover:text-purple-600",
      manualScoreClass: "text-charcoal/60 hover:text-green-600",
      finalizedClass: "text-fairway",
      finalizeClass: "text-orange-500 hover:text-orange-600",
      editClass: "text-charcoal/60 hover:text-turf",
      deleteClass: "text-charcoal/60 hover:text-coral",
    },
  };

  const s = styles[parentType];
  const ScheduledIcon = s.scheduledIcon;

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className={`w-6 h-6 animate-spin ${s.loader}`} />
      </div>
    );
  }

  if (!competitions || competitions.length === 0) {
    return (
      <div className={`text-center py-12 ${s.empty}`}>
        <p>No competitions yet.</p>
        <p className="text-sm mt-2">Click "Add Competition" to create one.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {competitions.map((competition) => (
        <div key={competition.id} className={`${s.card} transition-colors`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className={`font-semibold ${s.title}`}>{competition.name}</h3>
              <div className={`flex flex-wrap items-center gap-3 text-sm ${s.meta} mt-1`}>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {competition.date}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {getCourseName(competition)}
                </span>
                {competition.tee_id && (
                  <TeeDisplay
                    courseId={competition.course_id}
                    teeId={competition.tee_id}
                    variant={parentType}
                  />
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Tee times / Start list - for scheduled competitions */}
              {competition.start_mode === "scheduled" && (
                <Link
                  to="/admin/competitions/$competitionId/tee-times"
                  params={{ competitionId: competition.id.toString() }}
                  className={`p-2 ${s.scheduledIconClass} rounded-lg transition-colors`}
                  title={parentType === "series" ? "Manage tee times" : "Manage start list"}
                >
                  <ScheduledIcon className="w-4 h-4" />
                </Link>
              )}
              {/* Playing groups - for open start competitions */}
              {competition.start_mode === "open" && (
                <Link
                  to="/admin/competitions/$competitionId/groups"
                  params={{ competitionId: competition.id.toString() }}
                  className={`p-2 ${s.groupsIconClass} rounded-lg transition-colors`}
                  title="View playing groups"
                >
                  <Users className="w-4 h-4" />
                </Link>
              )}
              {/* Manual score entry - typically for series */}
              {showManualScoreEntry && (
                <Link
                  to={`/admin/competitions/${competition.id}/manual-scores`}
                  className={`p-2 ${s.manualScoreClass} rounded-lg transition-colors`}
                  title="Manual score entry"
                >
                  <ClipboardEdit className="w-4 h-4" />
                </Link>
              )}
              {/* Finalize results */}
              {competition.is_results_final ? (
                <div
                  className={`p-2 ${s.finalizedClass}`}
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
                  className={`p-2 ${s.finalizeClass} rounded-lg transition-colors disabled:opacity-50`}
                  title="Finalize results"
                >
                  {finalizeResults.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                </button>
              )}
              {/* Edit competition */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(competition);
                }}
                className={`p-2 ${s.editClass} rounded-lg transition-colors`}
                title="Edit competition"
              >
                <Edit className="w-4 h-4" />
              </button>
              {/* Delete competition */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(competition);
                }}
                className={`p-2 ${s.deleteClass} rounded-lg transition-colors`}
                title="Delete competition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

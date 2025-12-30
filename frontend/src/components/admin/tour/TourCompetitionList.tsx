import { Link } from "@tanstack/react-router";
import { useTourCompetitions, type TourCompetition } from "../../../api/tours";
import { useCourses, useCourseTees } from "../../../api/courses";
import { Calendar, MapPin, Loader2, Flag, Edit, Trash2, ListOrdered, Users } from "lucide-react";

export interface TourCompetitionListProps {
  tourId: number;
  onEdit: (competition: TourCompetition) => void;
  onDelete: (competition: TourCompetition) => void;
}

function TeeDisplay({ courseId, teeId }: { courseId?: number; teeId?: number }) {
  const { data: tees } = useCourseTees(courseId || 0);
  if (!courseId || !teeId) return null;
  const tee = tees?.find((t) => t.id === teeId);
  if (!tee) return null;
  return (
    <span className="flex items-center gap-1 text-green-600 text-sm">
      <Flag className="h-3 w-3" />
      {tee.name}
    </span>
  );
}

export function TourCompetitionList({
  tourId,
  onEdit,
  onDelete,
}: TourCompetitionListProps) {
  const { data: competitions, isLoading } = useTourCompetitions(tourId);
  const { data: courses } = useCourses();

  const getCourseName = (courseId?: number) => {
    if (!courseId) return "No course";
    return courses?.find((c) => c.id === courseId)?.name || "Unknown course";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-fairway" />
      </div>
    );
  }

  if (!competitions || competitions.length === 0) {
    return (
      <div className="text-center py-12 text-charcoal/60">
        <p>No competitions yet.</p>
        <p className="text-sm mt-2">Click "Add Competition" to create one.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {competitions.map((competition) => (
        <div
          key={competition.id}
          className="border border-soft-grey rounded-lg p-4 hover:bg-light-rough/30 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-charcoal">{competition.name}</h3>
              <div className="flex flex-wrap items-center gap-3 text-sm text-charcoal/60 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {competition.date}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {competition.course_name || getCourseName(competition.course_id)}
                </span>
                {(competition as any).tee_id && (
                  <TeeDisplay
                    courseId={competition.course_id}
                    teeId={(competition as any).tee_id}
                  />
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {competition.start_mode === "scheduled" && (
                <Link
                  to="/admin/competitions/$competitionId/tee-times"
                  params={{ competitionId: competition.id.toString() }}
                  className="p-2 text-charcoal/60 hover:text-fairway transition-colors"
                  title="Manage start list"
                >
                  <ListOrdered className="w-4 h-4" />
                </Link>
              )}
              {competition.start_mode === "open" && (
                <Link
                  to="/admin/competitions/$competitionId/groups"
                  params={{ competitionId: competition.id.toString() }}
                  className="p-2 text-charcoal/60 hover:text-purple-600 transition-colors"
                  title="View playing groups"
                >
                  <Users className="w-4 h-4" />
                </Link>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(competition);
                }}
                className="p-2 text-charcoal/60 hover:text-turf transition-colors"
                title="Edit competition"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(competition);
                }}
                className="p-2 text-charcoal/60 hover:text-coral transition-colors"
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

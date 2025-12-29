import { Link } from "@tanstack/react-router";
import { useSeriesCompetitions } from "../../../api/series";
import { useCourses, useCourseTees } from "../../../api/courses";
import { Calendar, MapPin, Loader2, Flag, Edit, Trash2, ListOrdered } from "lucide-react";
import type { Competition } from "../../../api/competitions";

export interface SeriesCompetitionListProps {
  seriesId: number;
  onEdit: (competition: Competition) => void;
  onDelete: (competition: Competition) => void;
}

function TeeDisplay({ courseId, teeId }: { courseId?: number; teeId?: number }) {
  const { data: tees } = useCourseTees(courseId || 0);
  if (!courseId || !teeId) return null;
  const tee = tees?.find((t) => t.id === teeId);
  if (!tee) return null;
  return (
    <span className="flex items-center gap-1 text-blue-600 text-sm">
      <Flag className="h-3 w-3" />
      {tee.name}
    </span>
  );
}

export function SeriesCompetitionList({
  seriesId,
  onEdit,
  onDelete,
}: SeriesCompetitionListProps) {
  const { data: competitions, isLoading } = useSeriesCompetitions(seriesId);
  const { data: courses } = useCourses();

  const getCourseName = (courseId?: number) => {
    if (!courseId) return "No course";
    return courses?.find((c) => c.id === courseId)?.name || "Unknown course";
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!competitions || competitions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
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
          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{competition.name}</h3>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {competition.date}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {getCourseName(competition.course_id)}
                </span>
                {competition.tee_id && (
                  <TeeDisplay
                    courseId={competition.course_id}
                    teeId={competition.tee_id}
                  />
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {competition.start_mode === "scheduled" && (
                <Link
                  to="/admin/competitions/$competitionId/tee-times"
                  params={{ competitionId: competition.id.toString() }}
                  className="p-2 text-gray-500 hover:text-green-600 transition-colors"
                  title="Manage start list"
                >
                  <ListOrdered className="w-4 h-4" />
                </Link>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(competition);
                }}
                className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                title="Edit competition"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(competition);
                }}
                className="p-2 text-gray-500 hover:text-red-600 transition-colors"
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

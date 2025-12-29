import { Calendar, MapPin, Edit, Trash2, Star, Flag, Users } from "lucide-react";
import type { Competition } from "../../../api/competitions";

export type CompetitionStatus = "upcoming" | "in_progress" | "completed";

export interface CompetitionCardProps {
  competition: Competition;
  courseName?: string;
  teeName?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  showTeeInfo?: boolean;
  categoryCount?: number;
  children?: React.ReactNode;
}

function getCompetitionStatus(date: string): CompetitionStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const competitionDate = new Date(date);
  competitionDate.setHours(0, 0, 0, 0);

  if (competitionDate > today) return "upcoming";
  if (competitionDate.getTime() === today.getTime()) return "in_progress";
  return "completed";
}

function getStatusBadge(status: CompetitionStatus) {
  switch (status) {
    case "upcoming":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
          <Calendar className="h-3 w-3" />
          Upcoming
        </span>
      );
    case "in_progress":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
          <Flag className="h-3 w-3" />
          In Progress
        </span>
      );
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
          Completed
        </span>
      );
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CompetitionCard({
  competition,
  courseName,
  teeName,
  onEdit,
  onDelete,
  showTeeInfo = false,
  categoryCount,
  children,
}: CompetitionCardProps) {
  const status = getCompetitionStatus(competition.date);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-4">
        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-base font-semibold text-gray-900 truncate">
              {competition.name}
            </h4>
            {getStatusBadge(status)}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4 text-gray-400" />
              {formatDate(competition.date)}
            </span>

            {courseName && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-gray-400" />
                {courseName}
              </span>
            )}

            {showTeeInfo && teeName && (
              <span className="flex items-center gap-1 text-blue-600">
                <Flag className="h-4 w-4" />
                {teeName}
              </span>
            )}

            {competition.points_multiplier !== 1 && (
              <span className="flex items-center gap-1 text-orange-600">
                <Star className="h-4 w-4" />
                {competition.points_multiplier}x Points
              </span>
            )}

            {categoryCount !== undefined && categoryCount > 0 && (
              <span className="flex items-center gap-1 text-purple-600">
                <Users className="h-4 w-4" />
                {categoryCount} {categoryCount === 1 ? "category" : "categories"}
              </span>
            )}

            {competition.participant_count > 0 && (
              <span className="text-gray-500">
                {competition.participant_count} participant
                {competition.participant_count !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {children}
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit competition"
            >
              <Edit className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete competition"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

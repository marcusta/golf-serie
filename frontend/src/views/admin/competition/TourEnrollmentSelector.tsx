import type { TourEnrollment } from "../../../api/tours";
import type { TeeTime } from "../../../api/tee-times";

interface TourEnrollmentSelectorProps {
  tourEnrollments: TourEnrollment[] | undefined;
  teeTimes: TeeTime[] | undefined;
  selectedEnrollments: number[];
  onEnrollmentSelection: (enrollmentId: number) => void;
  onSelectAll: () => void;
}

export function TourEnrollmentSelector({
  tourEnrollments,
  teeTimes,
  selectedEnrollments,
  onEnrollmentSelection,
  onSelectAll,
}: TourEnrollmentSelectorProps) {
  if (!tourEnrollments) return null;

  const unassignedCount = tourEnrollments.filter(
    (e) => !teeTimes?.some((tt) => tt.participants.some((p) => p.player_id === e.player_id))
  ).length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Select Players for Start List
            <span className="ml-2 text-sm font-normal text-blue-600">
              ({tourEnrollments.length} enrolled)
            </span>
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Select which enrolled players should participate in this competition.
          </p>
        </div>
        {tourEnrollments.length > 0 && (
          <button
            onClick={onSelectAll}
            className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
          >
            {selectedEnrollments.length === unassignedCount
              ? "Deselect All"
              : "Select All"}
          </button>
        )}
      </div>

      {tourEnrollments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {tourEnrollments.map((enrollment) => {
            // Check if this player is already assigned to a tee time
            const isAssigned = teeTimes?.some((tt) =>
              tt.participants.some((p) => p.player_id === enrollment.player_id)
            );
            const isSelected = selectedEnrollments.includes(enrollment.id);

            return (
              <EnrollmentCard
                key={enrollment.id}
                enrollment={enrollment}
                isAssigned={isAssigned || false}
                isSelected={isSelected}
                onSelect={() => !isAssigned && onEnrollmentSelection(enrollment.id)}
              />
            );
          })}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          No active enrollments found. Players need to be enrolled in the tour first.
        </div>
      )}

      {selectedEnrollments.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>{selectedEnrollments.length}</strong> player(s) selected for start list.
            Create tee times below, then assign players using the assignment panel.
          </p>
        </div>
      )}
    </div>
  );
}

interface EnrollmentCardProps {
  enrollment: TourEnrollment;
  isAssigned: boolean;
  isSelected: boolean;
  onSelect: () => void;
}

function EnrollmentCard({
  enrollment,
  isAssigned,
  isSelected,
  onSelect,
}: EnrollmentCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`p-3 rounded-lg border-2 transition-colors ${
        isAssigned
          ? "border-green-300 bg-green-50 cursor-not-allowed"
          : isSelected
          ? "border-blue-500 bg-blue-50 cursor-pointer"
          : "border-gray-200 hover:border-blue-300 cursor-pointer"
      }`}
    >
      <div className="flex items-center gap-3">
        {!isAssigned && (
          <div
            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
              isSelected
                ? "border-blue-500 bg-blue-500"
                : "border-gray-300"
            }`}
          >
            {isSelected && (
              <svg
                className="w-3 h-3 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate">
              {enrollment.player_name || enrollment.email}
            </span>
            {enrollment.handicap !== undefined && (
              <span className="text-xs text-gray-500 font-mono flex-shrink-0">
                HCP {enrollment.handicap.toFixed(1)}
              </span>
            )}
          </div>
          {enrollment.category_name && (
            <div className="text-sm text-gray-500">
              {enrollment.category_name}
            </div>
          )}
          {isAssigned && (
            <div className="text-xs text-green-600 mt-1">
              Already assigned
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TourEnrollmentSelector;

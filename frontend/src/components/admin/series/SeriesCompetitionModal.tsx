import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateCompetition,
  useUpdateCompetition,
  type Competition,
} from "../../../api/competitions";
import { useCourses } from "../../../api/courses";
import { TeeSelector } from "../competition";
import { Loader2, Check, X, Star } from "lucide-react";

export interface SeriesCompetitionModalProps {
  seriesId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competition?: Competition | null;
  onSuccess?: () => void;
}

interface FormData {
  name: string;
  date: string;
  course_id: string;
  tee_id: string;
  points_multiplier: string;
  venue_type: "outdoor" | "indoor";
  start_mode: "scheduled" | "open";
  open_start: string;
  open_end: string;
}

const initialFormData: FormData = {
  name: "",
  date: "",
  course_id: "",
  tee_id: "",
  points_multiplier: "1",
  venue_type: "outdoor",
  start_mode: "scheduled",
  open_start: "",
  open_end: "",
};

export function SeriesCompetitionModal({
  seriesId,
  open,
  onOpenChange,
  competition,
  onSuccess,
}: SeriesCompetitionModalProps) {
  const queryClient = useQueryClient();
  const { data: courses } = useCourses();
  const createMutation = useCreateCompetition();
  const updateMutation = useUpdateCompetition();

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!competition;

  // Helper to convert date or datetime to datetime-local format
  const toDatetimeLocal = (value?: string | null): string => {
    if (!value) return "";
    if (value.includes("T")) {
      return value.slice(0, 16);
    }
    return `${value}T00:00`;
  };

  // Reset form when modal opens or competition changes
  useEffect(() => {
    if (open) {
      if (competition) {
        setFormData({
          name: competition.name,
          date: competition.date,
          course_id: competition.course_id?.toString() || "",
          tee_id: competition.tee_id?.toString() || "",
          points_multiplier: competition.points_multiplier?.toString() || "1",
          venue_type: competition.venue_type || "outdoor",
          start_mode: competition.start_mode || "scheduled",
          open_start: toDatetimeLocal(competition.open_start),
          open_end: toDatetimeLocal(competition.open_end),
        });
      } else {
        setFormData(initialFormData);
      }
      setError(null);
    }
  }, [open, competition]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Competition name is required");
      return;
    }
    if (!formData.date) {
      setError("Date is required");
      return;
    }
    if (!formData.course_id) {
      setError("Course is required");
      return;
    }

    const data = {
      name: formData.name.trim(),
      date: formData.date,
      course_id: parseInt(formData.course_id),
      tee_id: formData.tee_id ? parseInt(formData.tee_id) : undefined,
      series_id: seriesId,
      points_multiplier: parseFloat(formData.points_multiplier) || 1,
      venue_type: formData.venue_type,
      start_mode: formData.start_mode,
      open_start:
        formData.start_mode === "open" && formData.open_start
          ? formData.open_start
          : undefined,
      open_end:
        formData.start_mode === "open" && formData.open_end
          ? formData.open_end
          : undefined,
    };

    try {
      if (isEditing && competition) {
        await updateMutation.mutateAsync({ id: competition.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }

      // Invalidate series competitions query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["series", seriesId, "competitions"] });

      onSuccess?.();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save competition");
    }
  };

  const handleCourseChange = (courseId: string) => {
    setFormData((prev) => ({
      ...prev,
      course_id: courseId,
      tee_id: "", // Reset tee when course changes
    }));
  };

  if (!open) return null;

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? "Edit Competition" : "Add Competition"}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Competition Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Round 1"
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                disabled={isPending}
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, date: e.target.value }))
                }
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                disabled={isPending}
              />
            </div>

            {/* Course */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.course_id}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-white"
                disabled={isPending}
              >
                <option value="">Select a course</option>
                {courses?.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tee */}
            <TeeSelector
              courseId={formData.course_id ? parseInt(formData.course_id) : null}
              value={formData.tee_id ? parseInt(formData.tee_id) : null}
              onChange={(teeId) =>
                setFormData((prev) => ({
                  ...prev,
                  tee_id: teeId?.toString() || "",
                }))
              }
              label="Tee Box (Optional)"
              disabled={isPending}
            />

            {/* Points Multiplier */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Points Multiplier
                </span>
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={formData.points_multiplier}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    points_multiplier: e.target.value,
                  }))
                }
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                disabled={isPending}
              />
              <p className="text-sm text-gray-500 mt-1">
                Multiplier for team points (e.g., 2 = double points)
              </p>
            </div>

            {/* Venue Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Venue Type
              </label>
              <select
                value={formData.venue_type}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    venue_type: e.target.value as "outdoor" | "indoor",
                  }))
                }
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-white"
                disabled={isPending}
              >
                <option value="outdoor">Outdoor</option>
                <option value="indoor">Indoor (Simulator)</option>
              </select>
            </div>

            {/* Start Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Mode
              </label>
              <select
                value={formData.start_mode}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    start_mode: e.target.value as "scheduled" | "open",
                  }))
                }
                className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors bg-white"
                disabled={isPending}
              >
                <option value="scheduled">Scheduled (Prepared Start List)</option>
                <option value="open">Open (Ad-hoc Play)</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                Scheduled: Assigned tee times. Open: Ad-hoc play.
              </p>
            </div>

            {/* Open Period (only when start_mode is open) */}
            {formData.start_mode === "open" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Open Period Start
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.open_start}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        open_start: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                    disabled={isPending}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Open Period End
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.open_end}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        open_end: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                    disabled={isPending}
                  />
                </div>
              </div>
            )}

            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {isEditing ? "Save Changes" : "Create Competition"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

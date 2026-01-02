import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateCompetition,
  useUpdateCompetition,
  useCompetitionCategoryTees,
  useSetCompetitionCategoryTees,
  type Competition,
  type CategoryTeeMapping,
} from "../../../api/competitions";
import { useCourses } from "../../../api/courses";
import { useTourPointTemplates } from "../../../api/point-templates";
import { TeeSelector, CategoryTeeAssignment } from "../competition";
import { Loader2, Check, X, Trophy } from "lucide-react";

export interface TourCompetitionModalProps {
  tourId: number;
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
  point_template_id: string;
  venue_type: "outdoor" | "indoor";
  manual_entry_format: "out_in_total" | "total_only";
  start_mode: "scheduled" | "open";
  open_start: string;
  open_end: string;
}

const initialFormData: FormData = {
  name: "",
  date: "",
  course_id: "",
  tee_id: "",
  point_template_id: "",
  venue_type: "outdoor",
  manual_entry_format: "out_in_total",
  start_mode: "scheduled",
  open_start: "",
  open_end: "",
};

export function TourCompetitionModal({
  tourId,
  open,
  onOpenChange,
  competition,
  onSuccess,
}: TourCompetitionModalProps) {
  const queryClient = useQueryClient();
  const { data: courses } = useCourses();
  const { data: pointTemplates } = useTourPointTemplates(tourId);
  const createMutation = useCreateCompetition();
  const updateMutation = useUpdateCompetition();
  const setCategoryTeesMutation = useSetCompetitionCategoryTees();

  // Load existing category-tee mappings when editing
  const { data: existingCategoryTees } = useCompetitionCategoryTees(
    competition?.id || 0
  );

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [categoryTeeMappings, setCategoryTeeMappings] = useState<
    CategoryTeeMapping[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!competition;

  // Helper to convert date or datetime to datetime-local format
  const toDatetimeLocal = (value?: string | null): string => {
    if (!value) return "";
    // If already has time component (contains 'T'), use as-is but ensure proper format
    if (value.includes("T")) {
      return value.slice(0, 16); // "YYYY-MM-DDTHH:mm"
    }
    // If date only, append default time (start of day)
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
          point_template_id: competition.point_template_id?.toString() || "",
          venue_type: competition.venue_type || "outdoor",
          manual_entry_format: competition.manual_entry_format || "out_in_total",
          start_mode: competition.start_mode || "scheduled",
          open_start: toDatetimeLocal(competition.open_start),
          open_end: toDatetimeLocal(competition.open_end),
        });
      } else {
        setFormData(initialFormData);
        setCategoryTeeMappings([]);
      }
      setError(null);
    }
  }, [open, competition]);

  // Load existing category-tee mappings when data is fetched
  useEffect(() => {
    if (existingCategoryTees && isEditing) {
      setCategoryTeeMappings(
        existingCategoryTees.map((ct) => ({
          categoryId: ct.category_id,
          teeId: ct.tee_id,
        }))
      );
    }
  }, [existingCategoryTees, isEditing]);

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
      point_template_id: formData.point_template_id
        ? parseInt(formData.point_template_id)
        : undefined,
      tour_id: tourId,
      points_multiplier: 1, // Default - use point templates for different scoring
      venue_type: formData.venue_type,
      manual_entry_format: formData.manual_entry_format,
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
      let competitionId: number;

      if (isEditing && competition) {
        await updateMutation.mutateAsync({ id: competition.id, data });
        competitionId = competition.id;
      } else {
        const newCompetition = await createMutation.mutateAsync(data);
        competitionId = newCompetition.id;
      }

      // Save category-tee mappings if any exist
      if (categoryTeeMappings.length > 0 || (isEditing && existingCategoryTees && existingCategoryTees.length > 0)) {
        await setCategoryTeesMutation.mutateAsync({
          competitionId,
          mappings: categoryTeeMappings,
        });
      }

      // Invalidate tour competitions query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["tour-competitions", tourId] });

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
    setCategoryTeeMappings([]); // Reset category-tee mappings when course changes
  };

  if (!open) return null;

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    setCategoryTeesMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-soft-grey flex items-center justify-between">
          <h2 className="text-xl font-semibold text-charcoal">
            {isEditing ? "Edit Competition" : "Add Competition"}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 text-charcoal/60 hover:text-charcoal transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
                Competition Name <span className="text-coral">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Round 1"
                className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors"
                disabled={isPending}
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
                Date <span className="text-coral">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, date: e.target.value }))
                }
                className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors"
                disabled={isPending}
              />
            </div>

            {/* Course */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
                Course <span className="text-coral">*</span>
              </label>
              <select
                value={formData.course_id}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors bg-white"
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
              label="Default Tee (Optional)"
              disabled={isPending}
            />

            {/* Category Tee Assignments */}
            <CategoryTeeAssignment
              tourId={tourId}
              courseId={formData.course_id ? parseInt(formData.course_id) : null}
              mappings={categoryTeeMappings}
              onChange={setCategoryTeeMappings}
              disabled={isPending}
            />

            {/* Point Template */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
                <span className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Point Template
                </span>
              </label>
              <select
                value={formData.point_template_id}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    point_template_id: e.target.value,
                  }))
                }
                className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors bg-white"
                disabled={isPending}
              >
                <option value="">Use tour default</option>
                {pointTemplates?.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <p className="text-sm text-charcoal/50 mt-1">
                Override the tour's point template for this competition
              </p>
            </div>

            {/* Venue Type */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
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
                className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors bg-white"
                disabled={isPending}
              >
                <option value="outdoor">Outdoor</option>
                <option value="indoor">Indoor (Simulator)</option>
              </select>
            </div>

            {/* Start Mode */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
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
                className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors bg-white"
                disabled={isPending}
              >
                <option value="scheduled">Scheduled (Prepared Start List)</option>
                <option value="open">Open (Ad-hoc Play)</option>
              </select>
              <p className="text-sm text-charcoal/50 mt-1">
                Scheduled: Assigned tee times. Open: Ad-hoc play.
              </p>
            </div>

            {/* Open Period (only when start_mode is open) */}
            {formData.start_mode === "open" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2">
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
                    className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors"
                    disabled={isPending}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-2">
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
                    className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors"
                    disabled={isPending}
                  />
                </div>
              </div>
            )}

            {error && <p className="text-coral text-sm">{error}</p>}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-soft-grey flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-charcoal/70 hover:text-charcoal transition-colors"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-6 py-2 bg-turf text-white rounded-lg hover:bg-fairway transition-colors disabled:opacity-50"
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

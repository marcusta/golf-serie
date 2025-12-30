import { useState } from "react";
import {
  useCompetitions,
  useCreateCompetition,
  useUpdateCompetition,
  useDeleteCompetition,
  useFinalizeCompetitionResults,
  type Competition,
} from "../../api/competitions";
import { useCourses, useCourseTees } from "../../api/courses";
import { useSeries, useSeriesCompetitions } from "../../api/series";
import { useTours, useTourCompetitions } from "../../api/tours";
import { usePointTemplates } from "../../api/point-templates";
import { TeeSelector } from "../../components/admin/competition";
import {
  Plus,
  Edit,
  Trash2,
  MapPin,
  Clock,
  Award,
  ArrowLeft,
  ClipboardEdit,
  Star,
  Users,
  Flag,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Link, useSearch } from "@tanstack/react-router";

export default function AdminCompetitions() {
  // Get series and tour filter from URL search params
  const search = useSearch({ from: "/admin/competitions" }) as {
    series?: string;
    tour?: string;
  };
  const seriesFilter = search.series ? parseInt(search.series) : null;
  const tourFilter = search.tour ? parseInt(search.tour) : null;

  const { data: allCompetitions, isLoading, error } = useCompetitions();
  const { data: seriesCompetitions } = useSeriesCompetitions(seriesFilter || 0);
  const { data: tourCompetitions } = useTourCompetitions(tourFilter || 0);
  const { data: courses } = useCourses();
  const { data: series } = useSeries();
  const { data: tours } = useTours();
  const { data: pointTemplates } = usePointTemplates();
  const createCompetition = useCreateCompetition();
  const updateCompetition = useUpdateCompetition();
  const deleteCompetition = useDeleteCompetition();
  const finalizeResults = useFinalizeCompetitionResults();

  // Use series-specific or tour-specific competitions if filtering, otherwise all
  const competitions = seriesFilter ? seriesCompetitions : tourFilter ? tourCompetitions : allCompetitions;
  const filteredSeries = series?.find((s) => s.id === seriesFilter);
  const filteredTour = tours?.find((t) => t.id === tourFilter);

  const [showForm, setShowForm] = useState(false);
  const [editingCompetition, setEditingCompetition] =
    useState<Competition | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    date: string;
    course_id: string;
    tee_id: string;
    series_id: string;
    tour_id: string;
    point_template_id: string;
    manual_entry_format: "out_in_total" | "total_only";
    points_multiplier: string;
    venue_type: "outdoor" | "indoor";
    start_mode: "scheduled" | "open";
    open_start: string;
    open_end: string;
  }>({
    name: "",
    date: "",
    course_id: "",
    tee_id: "",
    series_id: seriesFilter?.toString() || "",
    tour_id: tourFilter?.toString() || "",
    point_template_id: "",
    manual_entry_format: "out_in_total",
    points_multiplier: "1",
    venue_type: "outdoor",
    start_mode: "scheduled",
    open_start: "",
    open_end: "",
  });


  if (isLoading) return <div>Loading competitions...</div>;
  if (error) return <div>Error loading competitions</div>;

  const handleEdit = (competition: Competition) => {
    setEditingCompetition(competition);
    setFormData({
      name: competition.name,
      date: competition.date,
      course_id: competition.course_id.toString(),
      tee_id: competition.tee_id?.toString() || "",
      series_id: competition.series_id?.toString() || "",
      tour_id: (competition as any).tour_id?.toString() || "",
      point_template_id: (competition as any).point_template_id?.toString() || "",
      manual_entry_format: competition.manual_entry_format || "out_in_total",
      points_multiplier: competition.points_multiplier?.toString() || "1",
      venue_type: competition.venue_type || "outdoor",
      start_mode: competition.start_mode || "scheduled",
      open_start: competition.open_start || "",
      open_end: competition.open_end || "",
    });
    setShowForm(true);
  };

  const handleDelete = (competitionId: number) => {
    if (confirm("Are you sure you want to delete this competition?")) {
      deleteCompetition.mutate(competitionId, {
        onError: (error) => {
          console.error("Error deleting competition:", error);
          alert("Failed to delete competition. Please try again.");
        },
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const competitionData = {
      name: formData.name,
      date: formData.date,
      course_id: parseInt(formData.course_id),
      tee_id: formData.tee_id ? parseInt(formData.tee_id) : undefined,
      series_id: formData.series_id ? parseInt(formData.series_id) : undefined,
      tour_id: formData.tour_id ? parseInt(formData.tour_id) : undefined,
      point_template_id: formData.point_template_id ? parseInt(formData.point_template_id) : undefined,
      manual_entry_format: formData.manual_entry_format,
      points_multiplier: parseFloat(formData.points_multiplier),
      venue_type: formData.venue_type,
      start_mode: formData.start_mode,
      open_start: formData.start_mode === "open" && formData.open_start ? formData.open_start : undefined,
      open_end: formData.start_mode === "open" && formData.open_end ? formData.open_end : undefined,
    };

    const onSuccess = () => {
      // Reset form and close
      setFormData({
        name: "",
        date: "",
        course_id: "",
        tee_id: "",
        series_id: seriesFilter?.toString() || "",
        tour_id: tourFilter?.toString() || "",
        point_template_id: "",
        manual_entry_format: "out_in_total",
        points_multiplier: "1",
        venue_type: "outdoor",
        start_mode: "scheduled",
        open_start: "",
        open_end: "",
      });
      setShowForm(false);
      setEditingCompetition(null);
    };

    const onError = (error: Error) => {
      console.error("Error saving competition:", error);
      alert("Failed to save competition. Please try again.");
    };

    if (editingCompetition) {
      updateCompetition.mutate(
        { id: editingCompetition.id, data: competitionData },
        { onSuccess, onError }
      );
    } else {
      createCompetition.mutate(competitionData, { onSuccess, onError });
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getCourse = (courseId: number) => {
    return courses?.find((course) => course.id === courseId);
  };

  // Helper component to display tee info
  const TeeDisplay = ({ courseId, teeId }: { courseId: number; teeId?: number }) => {
    const { data: tees } = useCourseTees(courseId);
    if (!teeId) return null;
    const tee = tees?.find((t) => t.id === teeId);
    if (!tee) return null;
    return (
      <div className="flex items-center gap-1 text-green-600">
        <Flag className="h-4 w-4" />
        {tee.name}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          {seriesFilter && filteredSeries ? (
            <div className="flex items-center gap-3 mb-2">
              <Link
                to="/admin/series"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Series
              </Link>
            </div>
          ) : tourFilter && filteredTour ? (
            <div className="flex items-center gap-3 mb-2">
              <Link
                to={`/admin/tours/${tourFilter}`}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to {filteredTour.name}
              </Link>
            </div>
          ) : null}
          <h2 className="text-2xl font-bold text-gray-900">
            {seriesFilter && filteredSeries
              ? `${filteredSeries.name} - Competitions`
              : tourFilter && filteredTour
              ? `${filteredTour.name} - Competitions`
              : "Competitions"}
          </h2>
          <p className="text-gray-600">
            {seriesFilter && filteredSeries
              ? `Competitions in the ${filteredSeries.name} series`
              : tourFilter && filteredTour
              ? `Competitions in the ${filteredTour.name} tour`
              : "Manage golf competitions and tournaments"}
          </p>
        </div>
        <button
          onClick={() => {
            setEditingCompetition(null);
            setFormData({
              name: "",
              date: "",
              course_id: "",
              tee_id: "",
              series_id: seriesFilter?.toString() || "",
              tour_id: tourFilter?.toString() || "",
              point_template_id: "",
              manual_entry_format: "out_in_total",
              points_multiplier: "1",
              venue_type: "outdoor",
              start_mode: "scheduled",
              open_start: "",
              open_end: "",
            });
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Competition
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-50 p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">
            {editingCompetition ? "Edit Competition" : "Add New Competition"}
          </h3>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Competition Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter competition name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course
              </label>
              <select
                name="course_id"
                value={formData.course_id}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    course_id: value,
                    tee_id: "", // Reset tee when course changes
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a course</option>
                {courses?.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.name}
                  </option>
                ))}
            </select>
            </div>
            <div>
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
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Series {formData.tour_id ? "(Disabled - Tour selected)" : "(Optional)"}
              </label>
              <select
                name="series_id"
                value={formData.series_id}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    series_id: value,
                    tour_id: value ? "" : prev.tour_id, // Clear tour if series selected
                  }));
                }}
                disabled={!!formData.tour_id}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">No series (standalone competition)</option>
                {series?.map((seriesItem) => (
                  <option key={seriesItem.id} value={seriesItem.id}>
                    {seriesItem.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tour {formData.series_id ? "(Disabled - Series selected)" : "(Optional)"}
              </label>
              <select
                name="tour_id"
                value={formData.tour_id}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData((prev) => ({
                    ...prev,
                    tour_id: value,
                    series_id: value ? "" : prev.series_id, // Clear series if tour selected
                  }));
                }}
                disabled={!!formData.series_id}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">No tour (standalone competition)</option>
                {tours?.map((tour) => (
                  <option key={tour.id} value={tour.id}>
                    {tour.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Point Template (Optional)
              </label>
              <select
                name="point_template_id"
                value={formData.point_template_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No point template</option>
                {pointTemplates?.map((template: any) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Manual Entry Format
              </label>
              <select
                name="manual_entry_format"
                value={formData.manual_entry_format}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="out_in_total">Out, In, and Total</option>
                <option value="total_only">Total Score Only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Venue Type
              </label>
              <select
                name="venue_type"
                value={formData.venue_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="outdoor">Outdoor</option>
                <option value="indoor">Indoor (Simulator)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Points Multiplier
              </label>
              <input
                type="number"
                name="points_multiplier"
                value={formData.points_multiplier}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1"
                min="0.1"
                max="10"
                step="0.1"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Multiplier for series points (1 = normal, 2 = double points, etc.)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Mode
              </label>
              <select
                name="start_mode"
                value={formData.start_mode}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="scheduled">Scheduled (Prepared Start List)</option>
                <option value="open">Open (Ad-hoc Play)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Scheduled: Players have assigned tee times. Open: Players play ad-hoc.
              </p>
            </div>
            {formData.start_mode === "open" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Open Period Start
                  </label>
                  <input
                    type="datetime-local"
                    name="open_start"
                    value={formData.open_start}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Open Period End
                  </label>
                  <input
                    type="datetime-local"
                    name="open_end"
                    value={formData.open_end}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={
                  createCompetition.isPending || updateCompetition.isPending
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createCompetition.isPending || updateCompetition.isPending
                  ? "Saving..."
                  : editingCompetition
                  ? "Update"
                  : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingCompetition(null);
                  setFormData({
                    name: "",
                    date: "",
                    course_id: "",
                    tee_id: "",
                    series_id: seriesFilter?.toString() || "",
                    tour_id: tourFilter?.toString() || "",
                    point_template_id: "",
                    manual_entry_format: "out_in_total",
                    points_multiplier: "1",
                    venue_type: "outdoor",
                    start_mode: "scheduled",
                    open_start: "",
                    open_end: "",
                  });
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {seriesFilter && filteredSeries
              ? `${filteredSeries.name} Competitions`
              : "All Competitions"}
          </h3>
          {competitions && (
            <p className="text-sm text-gray-500 mt-1">
              {competitions.length} competition
              {competitions.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <div className="divide-y divide-gray-200">
          {competitions && competitions.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              {seriesFilter && filteredSeries ? (
                <p>
                  No competitions found in the {filteredSeries.name} series.
                </p>
              ) : (
                <p>No competitions found.</p>
              )}
            </div>
          ) : (
            competitions?.map((competition) => {
              const course = getCourse(competition.course_id ?? 0);
              // Check if this is a full Competition (not a TourCompetition)
              const isFullCompetition = "series_id" in competition;
              return (
                <div
                  key={competition.id}
                  className="px-6 py-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900">
                        {competition.name}
                      </h4>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {course?.name || "Unknown Course"}
                        </div>
                        {isFullCompetition && (competition as Competition).series_id && (
                          <div className="flex items-center gap-1 text-blue-600">
                            <Award className="h-4 w-4" />
                            {series?.find((s) => s.id === (competition as Competition).series_id)
                              ?.name || `Series #${(competition as Competition).series_id}`}
                          </div>
                        )}
                        {isFullCompetition && (competition as Competition).points_multiplier !== 1 && (
                          <div className="flex items-center gap-1 text-orange-600">
                            <Star className="h-4 w-4" />
                            {(competition as Competition).points_multiplier}x Points
                          </div>
                        )}
                        {isFullCompetition && (competition as Competition).tee_id && (
                          <TeeDisplay
                            courseId={(competition as Competition).course_id}
                            teeId={(competition as Competition).tee_id}
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(!isFullCompetition || (competition as Competition).start_mode !== "open") && (
                        <Link
                          to={`/admin/competitions/${competition.id}/tee-times`}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Manage tee times"
                        >
                          <Clock className="h-4 w-4" />
                        </Link>
                      )}
                      {isFullCompetition && (competition as Competition).start_mode === "open" && (
                        <Link
                          to={`/admin/competitions/${competition.id}/groups`}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="View playing groups"
                        >
                          <Users className="h-4 w-4" />
                        </Link>
                      )}
                      <Link
                        to={`/admin/competitions/${competition.id}/manual-scores`}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Manual score entry"
                      >
                        <ClipboardEdit className="h-4 w-4" />
                      </Link>
                      {isFullCompetition && (
                        (competition as Competition).is_results_final ? (
                          <div
                            className="p-2 text-green-600"
                            title={`Results finalized${(competition as Competition).results_finalized_at ? ` on ${new Date((competition as Competition).results_finalized_at!).toLocaleDateString()}` : ''}`}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              if (!confirm("Finalize results for this competition? This will calculate and store the final standings and points.")) {
                                return;
                              }
                              finalizeResults.mutate(competition.id);
                            }}
                            disabled={finalizeResults.isPending}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Finalize results"
                          >
                            {finalizeResults.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </button>
                        )
                      )}
                      {isFullCompetition && (
                        <button
                          onClick={() => handleEdit(competition as Competition)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit competition"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(competition.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete competition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

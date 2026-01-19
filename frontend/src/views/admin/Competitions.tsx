import { useState, useEffect, useRef } from "react";
import {
  useStandAloneCompetitions,
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
import { useAuth } from "../../hooks/useAuth";
import { TeeSelector } from "../../components/admin/competition";
import { useNotification } from "@/hooks/useNotification";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Shield,
} from "lucide-react";
import { Link, useSearch } from "@tanstack/react-router";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";

export default function AdminCompetitions() {
  // Get series and tour filter from URL search params
  const search = useSearch({ from: "/admin/competitions" }) as {
    series?: string;
    tour?: string;
  };
  const seriesFilter = search.series ? parseInt(search.series) : null;
  const tourFilter = search.tour ? parseInt(search.tour) : null;

  const { canCreate } = useAuth();
  const { showError } = useNotification();
  const { data: standAloneCompetitions, isLoading, error } = useStandAloneCompetitions();
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
  const { confirm, dialog } = useConfirmDialog();

  // Use series-specific or tour-specific competitions if filtering, otherwise stand-alone only
  const competitions = seriesFilter ? seriesCompetitions : tourFilter ? tourCompetitions : standAloneCompetitions;
  const filteredSeries = series?.find((s) => s.id === seriesFilter);
  const filteredTour = tours?.find((t) => t.id === tourFilter);

  // Paginate competitions - use base type for compatibility
  type BaseCompetition = { id: number; name: string; date: string; course_id?: number };
  const pagination = usePagination(competitions as BaseCompetition[] | undefined, { pageSize: 100 });

  // Reset pagination when filter changes
  const previousSeriesFilter = useRef(seriesFilter);
  const previousTourFilter = useRef(tourFilter);
  useEffect(() => {
    if (previousSeriesFilter.current !== seriesFilter || previousTourFilter.current !== tourFilter) {
      pagination.resetPage();
      previousSeriesFilter.current = seriesFilter;
      previousTourFilter.current = tourFilter;
    }
  }, [seriesFilter, tourFilter, pagination]);

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

  const handleDelete = async (competitionId: number) => {
    const shouldDelete = await confirm({
      title: "Delete competition?",
      description: "This will permanently remove the competition and its data.",
      confirmLabel: "Delete competition",
      variant: "destructive",
    });
    if (!shouldDelete) return;
    deleteCompetition.mutate(competitionId, {
      onError: (error) => {
        console.error("Error deleting competition:", error);
        showError("Failed to delete competition. Please try again.");
      },
    });
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
      showError("Failed to save competition. Please try again.");
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
    <>
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
              : "Stand-alone competitions not linked to a Series or Tour"}
          </p>
        </div>
        {canCreate && (
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
        )}
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
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full"
                placeholder="Enter competition name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <Input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                className="w-full"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Course
              </label>
              <Select
                value={formData.course_id || "none"}
                onValueChange={(value) => {
                  setFormData((prev) => ({
                    ...prev,
                    course_id: value === "none" ? "" : value,
                    tee_id: "",
                  }));
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select a course</SelectItem>
                  {courses?.map((course) => (
                    <SelectItem key={course.id} value={course.id.toString()}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            {/* Only show Series selector when viewing series competitions */}
            {seriesFilter && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Series
                </label>
                <Select value={formData.series_id || "none"} disabled>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a series" />
                  </SelectTrigger>
                  <SelectContent>
                    {series?.map((seriesItem) => (
                      <SelectItem key={seriesItem.id} value={seriesItem.id.toString()}>
                        {seriesItem.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Only show Tour selector when viewing tour competitions */}
            {tourFilter && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tour
                </label>
                <Select value={formData.tour_id || "none"} disabled>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a tour" />
                  </SelectTrigger>
                  <SelectContent>
                    {tours?.map((tour) => (
                      <SelectItem key={tour.id} value={tour.id.toString()}>
                        {tour.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Point Template (Optional)
              </label>
              <Select
                value={formData.point_template_id || "none"}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    point_template_id: value === "none" ? "" : value,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No point template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No point template</SelectItem>
                  {pointTemplates?.map((template: any) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Manual Entry Format
              </label>
              <Select
                value={formData.manual_entry_format}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    manual_entry_format: value as "out_in_total" | "total_only",
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="out_in_total">Out, In, and Total</SelectItem>
                  <SelectItem value="total_only">Total Score Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Venue Type
              </label>
              <Select
                value={formData.venue_type}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    venue_type: value as "outdoor" | "indoor",
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select venue type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outdoor">Outdoor</SelectItem>
                  <SelectItem value="indoor">Indoor (Simulator)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Points Multiplier
              </label>
              <Input
                type="number"
                name="points_multiplier"
                value={formData.points_multiplier}
                onChange={handleInputChange}
                className="w-full"
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
              <Select
                value={formData.start_mode}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    start_mode: value as "scheduled" | "open",
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select start mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled (Prepared Start List)</SelectItem>
                  <SelectItem value="open">Open (Ad-hoc Play)</SelectItem>
                </SelectContent>
              </Select>
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
                  <Input
                    type="datetime-local"
                    name="open_start"
                    value={formData.open_start}
                    onChange={handleInputChange}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Open Period End
                  </label>
                  <Input
                    type="datetime-local"
                    name="open_end"
                    value={formData.open_end}
                    onChange={handleInputChange}
                    className="w-full"
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
              : tourFilter && filteredTour
              ? `${filteredTour.name} Competitions`
              : "Stand-Alone Competitions"}
          </h3>
          {competitions && (
            <p className="text-sm text-gray-500 mt-1">
              {pagination.pageInfo}
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
              ) : tourFilter && filteredTour ? (
                <p>
                  No competitions found in the {filteredTour.name} tour.
                </p>
              ) : (
                <p>No stand-alone competitions found.</p>
              )}
            </div>
          ) : (
            pagination.paginatedItems.map((competition) => {
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
                            onClick={async () => {
                              const shouldFinalize = await confirm({
                                title: "Finalize results?",
                                description: "This will calculate and store the final standings and points.",
                                confirmLabel: "Finalize results",
                              });
                              if (!shouldFinalize) return;
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
                        <>
                          <Link
                            to={`/admin/competitions/${competition.id}`}
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Manage admins"
                          >
                            <Shield className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleEdit(competition as Competition)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit competition"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </>
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

        {/* Pagination Controls */}
        {competitions && competitions.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <PaginationControls
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={pagination.setCurrentPage}
            />
          </div>
        )}
      </div>
      </div>
      {dialog}
    </>
  );
}

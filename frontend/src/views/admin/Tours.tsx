import { useState } from "react";
import { Plus, Pencil, Trash2, Trophy, Eye, Lock, Globe, Users, Calculator } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import {
  useTours,
  useCreateTour,
  useUpdateTour,
  useDeleteTour,
  type Tour,
  type TourEnrollmentMode,
  type TourVisibility,
  type TourScoringMode,
} from "../../api/tours";
import { useAuth } from "../../hooks/useAuth";
import { useNotification, formatErrorMessage } from "@/hooks/useNotification";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";

export default function Tours() {
  const navigate = useNavigate();
  const { canCreate } = useAuth();
  const { showError } = useNotification();
  const { data: tours, isLoading } = useTours();
  const createMutation = useCreateTour();
  const updateMutation = useUpdateTour();
  const deleteMutation = useDeleteTour();

  const [showModal, setShowModal] = useState(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [enrollmentMode, setEnrollmentMode] = useState<TourEnrollmentMode>("closed");
  const [visibility, setVisibility] = useState<TourVisibility>("private");
  const [scoringMode, setScoringMode] = useState<TourScoringMode>("gross");
  const [error, setError] = useState<string | null>(null);

  // Paginate tours
  const pagination = usePagination(tours, { pageSize: 100 });

  const openCreate = () => {
    setEditingTour(null);
    setName("");
    setDescription("");
    setEnrollmentMode("closed");
    setVisibility("private");
    setScoringMode("gross");
    setError(null);
    setShowModal(true);
  };

  const openEdit = (tour: Tour) => {
    setEditingTour(tour);
    setName(tour.name);
    setDescription(tour.description || "");
    setEnrollmentMode(tour.enrollment_mode);
    setVisibility(tour.visibility);
    setScoringMode(tour.scoring_mode);
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (editingTour) {
        await updateMutation.mutateAsync({
          id: editingTour.id,
          data: {
            name,
            description: description || undefined,
            enrollment_mode: enrollmentMode,
            visibility,
            scoring_mode: scoringMode,
          },
        });
      } else {
        await createMutation.mutateAsync({
          name,
          description: description || undefined,
          enrollment_mode: enrollmentMode,
          visibility,
          scoring_mode: scoringMode,
        });
      }
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this tour?")) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (err) {
        showError(formatErrorMessage(err, "Delete failed"));
      }
    }
  };

  if (isLoading) {
    return <div className="text-charcoal">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-charcoal font-['Inter']">Tours</h2>
          {tours && tours.length > 0 && (
            <p className="text-sm text-charcoal/60 mt-1">{pagination.pageInfo}</p>
          )}
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-turf text-scorecard rounded-xl hover:bg-fairway transition-colors font-['Inter'] font-semibold"
          >
            <Plus className="h-4 w-4" />
            Create Tour
          </button>
        )}
      </div>

      {tours && tours.length === 0 && (
        <div className="text-center py-12 text-charcoal/60">
          <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No tours yet. Create one to get started.</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="grid gap-4">
          {pagination.paginatedItems.map((tour) => (
            <div
              key={tour.id}
              className="bg-rough/30 rounded-xl p-4 border-2 border-rough"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-charcoal font-['Inter']">
                      {tour.name}
                    </h3>
                    <div className="flex gap-1">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          tour.visibility === "public"
                            ? "bg-fairway/20 text-fairway"
                            : "bg-charcoal/10 text-charcoal/70"
                        }`}
                        title={tour.visibility === "public" ? "Public tour" : "Private tour"}
                      >
                        {tour.visibility === "public" ? (
                          <Globe className="h-3 w-3" />
                        ) : (
                          <Lock className="h-3 w-3" />
                        )}
                        {tour.visibility}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          tour.enrollment_mode === "request"
                            ? "bg-turf/20 text-turf"
                            : "bg-charcoal/10 text-charcoal/70"
                        }`}
                        title={
                          tour.enrollment_mode === "request"
                            ? "Players can request to join"
                            : "Admin-only enrollment"
                        }
                      >
                        <Users className="h-3 w-3" />
                        {tour.enrollment_mode === "request" ? "requests" : "closed"}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          tour.scoring_mode === "net"
                            ? "bg-amber-100 text-amber-700"
                            : tour.scoring_mode === "both"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-charcoal/10 text-charcoal/70"
                        }`}
                        title={`Scoring mode: ${tour.scoring_mode}`}
                      >
                        <Calculator className="h-3 w-3" />
                        {tour.scoring_mode}
                      </span>
                    </div>
                  </div>
                  {tour.description && (
                    <p className="text-sm text-charcoal/70 mt-1 font-['Inter']">
                      {tour.description}
                    </p>
                  )}
                  <p className="text-xs text-charcoal/50 mt-2 font-['Inter']">
                    Created: {new Date(tour.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate({ to: `/admin/tours/${tour.id}` })}
                    className="p-2 text-charcoal hover:text-fairway transition-colors"
                    title="View Details"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openEdit(tour)}
                    className="p-2 text-charcoal hover:text-turf transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(tour.id)}
                    className="p-2 text-charcoal hover:text-coral transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Controls */}
        {tours && tours.length > 0 && (
          <PaginationControls
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            onPageChange={pagination.setCurrentPage}
          />
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-scorecard rounded-2xl p-6 max-w-lg w-full">
            <h3 className="text-xl font-bold text-charcoal mb-4 font-['Inter']">
              {editingTour ? "Edit Tour" : "Create Tour"}
            </h3>

            {error && (
              <div className="bg-coral/10 border border-coral text-coral rounded-lg p-3 mb-4 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1 font-['Inter']">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors font-['Inter']"
                  placeholder="PGA Tour 2024"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1 font-['Inter']">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors font-['Inter']"
                  placeholder="A description of this tour..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1 font-['Inter']">
                    Visibility
                  </label>
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value as TourVisibility)}
                    className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors font-['Inter'] bg-white"
                  >
                    <option value="private">Private</option>
                    <option value="public">Public</option>
                  </select>
                  <p className="text-xs text-charcoal/50 mt-1">
                    {visibility === "public"
                      ? "Anyone can view"
                      : "Enrolled only"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1 font-['Inter']">
                    Enrollment
                  </label>
                  <select
                    value={enrollmentMode}
                    onChange={(e) => setEnrollmentMode(e.target.value as TourEnrollmentMode)}
                    className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors font-['Inter'] bg-white"
                  >
                    <option value="closed">Admin only</option>
                    <option value="request">Requests</option>
                  </select>
                  <p className="text-xs text-charcoal/50 mt-1">
                    {enrollmentMode === "request"
                      ? "Players can request"
                      : "Admin adds players"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1 font-['Inter']">
                    Scoring
                  </label>
                  <select
                    value={scoringMode}
                    onChange={(e) => setScoringMode(e.target.value as TourScoringMode)}
                    className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors font-['Inter'] bg-white"
                  >
                    <option value="gross">Gross</option>
                    <option value="net">Net</option>
                    <option value="both">Both</option>
                  </select>
                  <p className="text-xs text-charcoal/50 mt-1">
                    {scoringMode === "net"
                      ? "Handicap-adjusted"
                      : scoringMode === "both"
                      ? "Show gross & net"
                      : "Raw scores only"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-charcoal hover:text-charcoal/70 font-['Inter']"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-turf text-scorecard rounded-xl hover:bg-fairway transition-colors font-['Inter'] font-semibold disabled:opacity-50"
                >
                  {editingTour ? "Save Changes" : "Create Tour"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { Plus, Pencil, Trash2, Trophy, Eye } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import {
  useTours,
  useCreateTour,
  useUpdateTour,
  useDeleteTour,
  type Tour,
} from "../../api/tours";

export default function Tours() {
  const navigate = useNavigate();
  const { data: tours, isLoading } = useTours();
  const createMutation = useCreateTour();
  const updateMutation = useUpdateTour();
  const deleteMutation = useDeleteTour();

  const [showModal, setShowModal] = useState(false);
  const [editingTour, setEditingTour] = useState<Tour | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const openCreate = () => {
    setEditingTour(null);
    setName("");
    setDescription("");
    setError(null);
    setShowModal(true);
  };

  const openEdit = (tour: Tour) => {
    setEditingTour(tour);
    setName(tour.name);
    setDescription(tour.description || "");
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
          data: { name, description: description || undefined },
        });
      } else {
        await createMutation.mutateAsync({
          name,
          description: description || undefined,
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
        alert(err instanceof Error ? err.message : "Delete failed");
      }
    }
  };

  if (isLoading) {
    return <div className="text-charcoal">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-charcoal font-['Inter']">Tours</h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-turf text-scorecard rounded-xl hover:bg-fairway transition-colors font-['Inter'] font-semibold"
        >
          <Plus className="h-4 w-4" />
          Create Tour
        </button>
      </div>

      {tours && tours.length === 0 && (
        <div className="text-center py-12 text-charcoal/60">
          <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No tours yet. Create one to get started.</p>
        </div>
      )}

      <div className="grid gap-4">
        {tours?.map((tour) => (
          <div
            key={tour.id}
            className="bg-rough/30 rounded-xl p-4 border-2 border-rough"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-charcoal font-['Inter']">
                  {tour.name}
                </h3>
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

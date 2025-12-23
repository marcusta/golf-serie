import { useState } from "react";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import {
  usePointTemplates,
  useCreatePointTemplate,
  useUpdatePointTemplate,
  useDeletePointTemplate,
  type PointTemplate,
  type PointsStructure,
} from "../../api/point-templates";

export default function PointTemplates() {
  const { data: templates, isLoading } = usePointTemplates();
  const createMutation = useCreatePointTemplate();
  const updateMutation = useUpdatePointTemplate();
  const deleteMutation = useDeletePointTemplate();

  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PointTemplate | null>(null);
  const [name, setName] = useState("");
  const [pointsJson, setPointsJson] = useState("");
  const [error, setError] = useState<string | null>(null);

  const openCreate = () => {
    setEditingTemplate(null);
    setName("");
    setPointsJson('{\n  "1": 100,\n  "2": 80,\n  "3": 65,\n  "default": 10\n}');
    setError(null);
    setShowModal(true);
  };

  const openEdit = (template: PointTemplate) => {
    setEditingTemplate(template);
    setName(template.name);
    try {
      const parsed = JSON.parse(template.points_structure);
      setPointsJson(JSON.stringify(parsed, null, 2));
    } catch {
      setPointsJson(template.points_structure);
    }
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let pointsStructure: PointsStructure;
    try {
      pointsStructure = JSON.parse(pointsJson);
    } catch {
      setError("Invalid JSON in points structure");
      return;
    }

    try {
      if (editingTemplate) {
        await updateMutation.mutateAsync({
          id: editingTemplate.id,
          data: { name, points_structure: pointsStructure },
        });
      } else {
        await createMutation.mutateAsync({ name, points_structure: pointsStructure });
      }
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this template?")) {
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
        <h2 className="text-xl font-bold text-charcoal font-['Inter']">
          Point Templates
        </h2>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-turf text-scorecard rounded-xl hover:bg-fairway transition-colors font-['Inter'] font-semibold"
        >
          <Plus className="h-4 w-4" />
          Create Template
        </button>
      </div>

      {templates && templates.length === 0 && (
        <div className="text-center py-12 text-charcoal/60">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No point templates yet. Create one to get started.</p>
        </div>
      )}

      <div className="grid gap-4">
        {templates?.map((template) => {
          let points: PointsStructure = {};
          try {
            points = JSON.parse(template.points_structure);
          } catch {}

          return (
            <div
              key={template.id}
              className="bg-rough/30 rounded-xl p-4 border-2 border-rough"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-charcoal font-['Inter']">
                    {template.name}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(points).map(([pos, pts]) => (
                      <span
                        key={pos}
                        className="px-2 py-1 bg-scorecard rounded text-sm font-['Inter']"
                      >
                        {pos === "default" ? "Default" : `#${pos}`}: {pts}pts
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(template)}
                    className="p-2 text-charcoal hover:text-turf transition-colors"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-2 text-charcoal hover:text-coral transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-scorecard rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-charcoal mb-4 font-['Inter']">
              {editingTemplate ? "Edit Template" : "Create Template"}
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
                  placeholder="Standard Points"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1 font-['Inter']">
                  Points Structure (JSON)
                </label>
                <textarea
                  value={pointsJson}
                  onChange={(e) => setPointsJson(e.target.value)}
                  required
                  rows={8}
                  className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors font-['Inter'] font-mono text-sm"
                />
                <p className="text-xs text-charcoal/60 mt-1">
                  Use position numbers as keys. Use "default" for positions not
                  specified.
                </p>
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
                  {editingTemplate ? "Save Changes" : "Create Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

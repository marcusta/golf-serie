import { useState } from "react";
import { Plus, Pencil, Trash2, FileText, X } from "lucide-react";
import {
  usePointTemplates,
  useCreatePointTemplate,
  useUpdatePointTemplate,
  useDeletePointTemplate,
  type PointTemplate,
  type PointsStructure,
} from "../../api/point-templates";

// Type for a single position entry in the editor
interface PositionEntry {
  id: string; // unique key for React
  position: string;
  points: string;
}

// Convert PointsStructure to array of entries for the editor
function structureToEntries(structure: PointsStructure): { entries: PositionEntry[]; defaultPoints: string } {
  const entries: PositionEntry[] = [];
  let defaultPoints = "10";

  Object.entries(structure).forEach(([pos, pts]) => {
    if (pos === "default") {
      defaultPoints = String(pts);
    } else {
      entries.push({
        id: crypto.randomUUID(),
        position: pos,
        points: String(pts),
      });
    }
  });

  // Sort entries by position number
  entries.sort((a, b) => {
    const aNum = parseInt(a.position) || 0;
    const bNum = parseInt(b.position) || 0;
    return aNum - bNum;
  });

  return { entries, defaultPoints };
}

// Convert editor entries back to PointsStructure
function entriesToStructure(entries: PositionEntry[], defaultPoints: string): PointsStructure {
  const structure: PointsStructure = {};

  entries.forEach((entry) => {
    const pos = entry.position.trim();
    const pts = parseInt(entry.points);
    if (pos && !isNaN(pts)) {
      structure[pos] = pts;
    }
  });

  const defaultPts = parseInt(defaultPoints);
  if (!isNaN(defaultPts)) {
    structure["default"] = defaultPts;
  }

  return structure;
}

// Default entries for a new template
function getDefaultEntries(): PositionEntry[] {
  return [
    { id: crypto.randomUUID(), position: "1", points: "100" },
    { id: crypto.randomUUID(), position: "2", points: "80" },
    { id: crypto.randomUUID(), position: "3", points: "65" },
  ];
}

export default function PointTemplates() {
  const { data: templates, isLoading } = usePointTemplates();
  const createMutation = useCreatePointTemplate();
  const updateMutation = useUpdatePointTemplate();
  const deleteMutation = useDeletePointTemplate();

  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PointTemplate | null>(null);
  const [name, setName] = useState("");
  const [entries, setEntries] = useState<PositionEntry[]>([]);
  const [defaultPoints, setDefaultPoints] = useState("10");
  const [error, setError] = useState<string | null>(null);

  const openCreate = () => {
    setEditingTemplate(null);
    setName("");
    setEntries(getDefaultEntries());
    setDefaultPoints("10");
    setError(null);
    setShowModal(true);
  };

  const openEdit = (template: PointTemplate) => {
    setEditingTemplate(template);
    setName(template.name);
    try {
      const parsed = JSON.parse(template.points_structure);
      const { entries: parsedEntries, defaultPoints: parsedDefault } = structureToEntries(parsed);
      setEntries(parsedEntries);
      setDefaultPoints(parsedDefault);
    } catch {
      setEntries(getDefaultEntries());
      setDefaultPoints("10");
    }
    setError(null);
    setShowModal(true);
  };

  const addEntry = () => {
    // Find the next position number
    const usedPositions = entries.map((e) => parseInt(e.position)).filter((n) => !isNaN(n));
    const nextPosition = usedPositions.length > 0 ? Math.max(...usedPositions) + 1 : 1;
    
    // Calculate suggested points (decrease from previous)
    const lastEntry = entries[entries.length - 1];
    const lastPoints = lastEntry ? parseInt(lastEntry.points) : 100;
    const suggestedPoints = Math.max(1, lastPoints - 10);

    setEntries([
      ...entries,
      {
        id: crypto.randomUUID(),
        position: String(nextPosition),
        points: String(suggestedPoints),
      },
    ]);
  };

  const removeEntry = (id: string) => {
    setEntries(entries.filter((e) => e.id !== id));
  };

  const updateEntry = (id: string, field: "position" | "points", value: string) => {
    setEntries(
      entries.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate entries
    const validEntries = entries.filter(
      (e) => e.position.trim() && !isNaN(parseInt(e.points))
    );

    if (validEntries.length === 0) {
      setError("Please add at least one position with points");
      return;
    }

    // Check for duplicate positions
    const positions = validEntries.map((e) => e.position.trim());
    const uniquePositions = new Set(positions);
    if (uniquePositions.size !== positions.length) {
      setError("Duplicate positions found. Each position must be unique.");
      return;
    }

    const pointsStructure = entriesToStructure(entries, defaultPoints);

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

          // Separate positions and default
          const positionEntries = Object.entries(points)
            .filter(([pos]) => pos !== "default")
            .map(([pos, pts]) => ({ position: parseInt(pos), points: pts }))
            .sort((a, b) => a.position - b.position);
          const defaultPts = points["default"];

          return (
            <div
              key={template.id}
              className="bg-scorecard rounded-xl border-2 border-rough overflow-hidden"
            >
              {/* Header */}
              <div className="flex justify-between items-center px-4 py-3 bg-rough/30 border-b border-rough">
                <h3 className="font-semibold text-charcoal font-['Inter'] text-lg">
                  {template.name}
                </h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(template)}
                    className="p-2 text-charcoal hover:text-turf transition-colors rounded-lg hover:bg-rough/50"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-2 text-charcoal hover:text-coral transition-colors rounded-lg hover:bg-rough/50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Points Table */}
              <div className="p-4">
                {positionEntries.length > 0 && (
                  <table className="text-sm font-['Inter']">
                    <thead>
                      <tr className="text-charcoal/60 border-b border-rough">
                        <th className="px-3 py-2 font-medium text-left">Position</th>
                        <th className="px-3 py-2 font-medium text-right">Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {positionEntries.map(({ position, points: pts }) => (
                        <tr key={position} className="border-b border-rough/50 last:border-0">
                          <td className="px-3 py-1.5 text-charcoal/70">{position}</td>
                          <td className="px-3 py-1.5 text-charcoal font-semibold text-right">{pts}</td>
                        </tr>
                      ))}
                      {defaultPts !== undefined && (
                        <tr className="border-t border-rough">
                          <td className="px-3 py-1.5 text-charcoal/70 italic">Other</td>
                          <td className="px-3 py-1.5 text-charcoal font-semibold text-right">{defaultPts}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
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
                  placeholder="e.g., Standard Event, Major, Elevated"
                />
              </div>

              {/* Position Entries */}
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2 font-['Inter']">
                  Points by Position
                </label>
                <div className="space-y-2">
                  {entries.map((entry) => (
                    <div key={entry.id} className="flex items-center gap-2">
                      <div className="flex-1 flex items-center gap-2">
                        <span className="text-sm text-charcoal/60 w-6">#</span>
                        <input
                          type="number"
                          min="1"
                          value={entry.position}
                          onChange={(e) => updateEntry(entry.id, "position", e.target.value)}
                          className="w-16 px-3 py-2 border-2 border-soft-grey rounded-lg focus:border-turf focus:outline-none transition-colors font-['Inter'] text-center"
                          placeholder="Pos"
                        />
                        <span className="text-sm text-charcoal/60">=</span>
                        <input
                          type="number"
                          min="0"
                          value={entry.points}
                          onChange={(e) => updateEntry(entry.id, "points", e.target.value)}
                          className="w-24 px-3 py-2 border-2 border-soft-grey rounded-lg focus:border-turf focus:outline-none transition-colors font-['Inter'] text-center"
                          placeholder="Points"
                        />
                        <span className="text-sm text-charcoal/60">pts</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeEntry(entry.id)}
                        className="p-2 text-charcoal/40 hover:text-coral transition-colors"
                        title="Remove position"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addEntry}
                  className="mt-3 flex items-center gap-2 text-sm text-turf hover:text-fairway transition-colors font-['Inter']"
                >
                  <Plus className="h-4 w-4" />
                  Add Position
                </button>
              </div>

              {/* Default Points */}
              <div className="pt-2 border-t border-soft-grey">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-charcoal font-['Inter']">
                    Default points
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={defaultPoints}
                    onChange={(e) => setDefaultPoints(e.target.value)}
                    className="w-24 px-3 py-2 border-2 border-soft-grey rounded-lg focus:border-turf focus:outline-none transition-colors font-['Inter'] text-center"
                  />
                  <span className="text-sm text-charcoal/60">pts</span>
                </div>
                <p className="text-xs text-charcoal/60 mt-1">
                  Points awarded to positions not listed above
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

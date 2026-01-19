import { useState } from "react";
import {
  Loader2,
  Plus,
  Star,
  Edit2,
  Trash2,
  Check,
  X,
  Library,
  FilePlus,
  Copy,
} from "lucide-react";
import {
  useTourPointTemplates,
  useCreateTourPointTemplate,
  useUpdateTourPointTemplate,
  useDeleteTourPointTemplate,
  usePointTemplates,
  type PointTemplate,
  type PointsStructure,
} from "../../../api/point-templates";
import { useNotification, formatErrorMessage } from "@/hooks/useNotification";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { Input } from "@/components/ui/input";

interface TourPointsTabProps {
  tourId: number;
}

// Type for a single position entry in the point template editor
interface PositionEntry {
  id: string;
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

export function TourPointsTab({ tourId }: TourPointsTabProps) {
  const { showError } = useNotification();
  const { confirm, dialog } = useConfirmDialog();
  const [showSourceDialog, setShowSourceDialog] = useState(false);
  const [showPointTemplateDialog, setShowPointTemplateDialog] = useState(false);
  const [editingPointTemplate, setEditingPointTemplate] = useState<PointTemplate | null>(null);
  const [pointTemplateName, setPointTemplateName] = useState("");
  const [pointTemplateEntries, setPointTemplateEntries] = useState<PositionEntry[]>([]);
  const [pointTemplateDefaultPoints, setPointTemplateDefaultPoints] = useState("10");
  const [pointTemplateError, setPointTemplateError] = useState<string | null>(null);

  const { data: tourPointTemplates, isLoading: tourPointTemplatesLoading } = useTourPointTemplates(tourId);
  const { data: libraryTemplates, isLoading: libraryTemplatesLoading } = usePointTemplates();

  const createPointTemplateMutation = useCreateTourPointTemplate(tourId);
  const updatePointTemplateMutation = useUpdateTourPointTemplate(tourId);
  const deletePointTemplateMutation = useDeleteTourPointTemplate(tourId);

  const openSourceDialog = () => {
    setShowSourceDialog(true);
  };

  const handleStartFresh = () => {
    setShowSourceDialog(false);
    setEditingPointTemplate(null);
    setPointTemplateName("");
    setPointTemplateEntries(getDefaultEntries());
    setPointTemplateDefaultPoints("10");
    setPointTemplateError(null);
    setShowPointTemplateDialog(true);
  };

  const handleCopyFromLibrary = (template: PointTemplate) => {
    setShowSourceDialog(false);
    setEditingPointTemplate(null);
    // Pre-populate with library template data (but without the name to encourage customization)
    setPointTemplateName(template.name + " (Copy)");
    try {
      const parsed = JSON.parse(template.points_structure);
      const { entries, defaultPoints } = structureToEntries(parsed);
      setPointTemplateEntries(entries);
      setPointTemplateDefaultPoints(defaultPoints);
    } catch {
      setPointTemplateEntries(getDefaultEntries());
      setPointTemplateDefaultPoints("10");
    }
    setPointTemplateError(null);
    setShowPointTemplateDialog(true);
  };

  const openPointTemplateDialog = (template?: PointTemplate) => {
    if (template) {
      // Editing existing template
      setEditingPointTemplate(template);
      setPointTemplateName(template.name);
      try {
        const parsed = JSON.parse(template.points_structure);
        const { entries, defaultPoints } = structureToEntries(parsed);
        setPointTemplateEntries(entries);
        setPointTemplateDefaultPoints(defaultPoints);
      } catch {
        setPointTemplateEntries(getDefaultEntries());
        setPointTemplateDefaultPoints("10");
      }
      setPointTemplateError(null);
      setShowPointTemplateDialog(true);
    } else {
      // Creating new template - show source selection
      openSourceDialog();
    }
  };

  const closePointTemplateDialog = () => {
    setShowPointTemplateDialog(false);
    setEditingPointTemplate(null);
    setPointTemplateName("");
    setPointTemplateEntries([]);
    setPointTemplateDefaultPoints("10");
    setPointTemplateError(null);
  };

  const addPointTemplateEntry = () => {
    const usedPositions = pointTemplateEntries.map((e) => parseInt(e.position)).filter((n) => !isNaN(n));
    const nextPosition = usedPositions.length > 0 ? Math.max(...usedPositions) + 1 : 1;
    const lastEntry = pointTemplateEntries[pointTemplateEntries.length - 1];
    const lastPoints = lastEntry ? parseInt(lastEntry.points) : 100;
    const suggestedPoints = Math.max(1, lastPoints - 10);

    setPointTemplateEntries([
      ...pointTemplateEntries,
      {
        id: crypto.randomUUID(),
        position: String(nextPosition),
        points: String(suggestedPoints),
      },
    ]);
  };

  const removePointTemplateEntry = (id: string) => {
    setPointTemplateEntries(pointTemplateEntries.filter((e) => e.id !== id));
  };

  const updatePointTemplateEntry = (id: string, field: "position" | "points", value: string) => {
    setPointTemplateEntries(
      pointTemplateEntries.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const handleSavePointTemplate = async () => {
    setPointTemplateError(null);

    if (!pointTemplateName.trim()) {
      setPointTemplateError("Template name is required");
      return;
    }

    const validEntries = pointTemplateEntries.filter(
      (e) => e.position.trim() && !isNaN(parseInt(e.points))
    );

    if (validEntries.length === 0) {
      setPointTemplateError("Please add at least one position with points");
      return;
    }

    const positions = validEntries.map((e) => e.position.trim());
    const uniquePositions = new Set(positions);
    if (uniquePositions.size !== positions.length) {
      setPointTemplateError("Duplicate positions found. Each position must be unique.");
      return;
    }

    const pointsStructure = entriesToStructure(pointTemplateEntries, pointTemplateDefaultPoints);

    try {
      if (editingPointTemplate) {
        await updatePointTemplateMutation.mutateAsync({
          templateId: editingPointTemplate.id,
          data: { name: pointTemplateName, points_structure: pointsStructure },
        });
      } else {
        await createPointTemplateMutation.mutateAsync({
          name: pointTemplateName,
          points_structure: pointsStructure,
        });
      }
      closePointTemplateDialog();
    } catch (err) {
      setPointTemplateError(err instanceof Error ? err.message : "Failed to save template");
    }
  };

  const handleDeletePointTemplate = async (templateId: number) => {
    const shouldDelete = await confirm({
      title: "Delete point template?",
      description: "This will permanently remove the point template.",
      confirmLabel: "Delete template",
      variant: "destructive",
    });
    if (!shouldDelete) return;
    try {
      await deletePointTemplateMutation.mutateAsync(templateId);
    } catch (err) {
      showError(formatErrorMessage(err, "Failed to delete template"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Points Templates Info */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-charcoal">Point Templates</h3>
            <p className="text-sm text-charcoal/60 mt-1">
              Create point templates to define how positions translate to tour points.
            </p>
          </div>
          <button
            onClick={() => openPointTemplateDialog()}
            className="flex items-center gap-2 px-4 py-2 bg-fairway text-white rounded-lg hover:bg-turf transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Template
          </button>
        </div>
      </div>

      {/* Point Templates List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-charcoal mb-4">Templates</h3>

        {tourPointTemplatesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-fairway" />
          </div>
        ) : tourPointTemplates && tourPointTemplates.length > 0 ? (
          <div className="space-y-4">
            {tourPointTemplates.map((template) => {
              let points: PointsStructure = {};
              try {
                points = JSON.parse(template.points_structure);
              } catch {
                // ignore parse errors
              }

              const positionEntries = Object.entries(points)
                .filter(([pos]) => pos !== "default")
                .map(([pos, pts]) => ({ position: parseInt(pos), points: pts }))
                .sort((a, b) => a.position - b.position);
              const defaultPts = points["default"];

              return (
                <div
                  key={template.id}
                  className="border border-soft-grey rounded-lg p-4 hover:bg-light-rough/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-charcoal">{template.name}</h4>
                      {positionEntries.length > 0 && (
                        <div className="mt-2">
                          <table className="text-sm">
                            <thead>
                              <tr className="text-charcoal/60 border-b border-rough">
                                <th className="px-2 py-1 font-medium text-left">Pos</th>
                                <th className="px-2 py-1 font-medium text-right">Pts</th>
                              </tr>
                            </thead>
                            <tbody>
                              {positionEntries.slice(0, 5).map(({ position, points: pts }) => (
                                <tr key={position} className="border-b border-rough/50 last:border-0">
                                  <td className="px-2 py-1 text-charcoal/70">{position}</td>
                                  <td className="px-2 py-1 text-charcoal font-semibold text-right">{pts}</td>
                                </tr>
                              ))}
                              {positionEntries.length > 5 && (
                                <tr className="text-charcoal/50 text-xs">
                                  <td colSpan={2} className="px-2 py-1">
                                    +{positionEntries.length - 5} more...
                                  </td>
                                </tr>
                              )}
                              {defaultPts !== undefined && (
                                <tr className="border-t border-rough">
                                  <td className="px-2 py-1 text-charcoal/70 italic">Other</td>
                                  <td className="px-2 py-1 text-charcoal font-semibold text-right">{defaultPts}</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openPointTemplateDialog(template)}
                        className="p-2 text-charcoal/60 hover:text-turf transition-colors"
                        title="Edit template"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePointTemplate(template.id)}
                        disabled={deletePointTemplateMutation.isPending}
                        className="p-2 text-charcoal/60 hover:text-coral transition-colors"
                        title="Delete template"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-charcoal/50">
            <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No point templates yet</p>
            <p className="text-sm mt-1">Create a template to define how standings translate to tour points</p>
          </div>
        )}
      </div>

      {/* Point Template Dialog */}
      <Dialog
        open={showPointTemplateDialog}
        onOpenChange={(open) => {
          if (!open) {
            closePointTemplateDialog();
          } else {
            setShowPointTemplateDialog(true);
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPointTemplate ? "Edit Point Template" : "Create Point Template"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
                Name <span className="text-coral">*</span>
              </label>
              <Input
                type="text"
                value={pointTemplateName}
                onChange={(e) => setPointTemplateName(e.target.value)}
                placeholder="e.g., Standard Points, Major Points"
                className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors"
              />
            </div>

            {/* Position Entries */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-2">
                Points by Position
              </label>
              <div className="space-y-2">
                {pointTemplateEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-sm text-charcoal/60 w-6">#</span>
                      <Input
                        type="number"
                        min="1"
                        value={entry.position}
                        onChange={(e) =>
                          updatePointTemplateEntry(entry.id, "position", e.target.value)
                        }
                        className="w-16 px-3 py-2 border-2 border-soft-grey rounded-lg focus:border-turf focus:outline-none transition-colors text-center"
                        placeholder="Pos"
                      />
                      <span className="text-sm text-charcoal/60">=</span>
                      <Input
                        type="number"
                        min="0"
                        value={entry.points}
                        onChange={(e) =>
                          updatePointTemplateEntry(entry.id, "points", e.target.value)
                        }
                        className="w-24 px-3 py-2 border-2 border-soft-grey rounded-lg focus:border-turf focus:outline-none transition-colors text-center"
                        placeholder="Points"
                      />
                      <span className="text-sm text-charcoal/60">pts</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePointTemplateEntry(entry.id)}
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
                onClick={addPointTemplateEntry}
                className="mt-3 flex items-center gap-2 text-sm text-turf hover:text-fairway transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Position
              </button>
            </div>

            {/* Default Points */}
            <div className="pt-2 border-t border-soft-grey">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-charcoal">
                  Default points
                </label>
                <Input
                  type="number"
                  min="0"
                  value={pointTemplateDefaultPoints}
                  onChange={(e) => setPointTemplateDefaultPoints(e.target.value)}
                  className="w-24 px-3 py-2 border-2 border-soft-grey rounded-lg focus:border-turf focus:outline-none transition-colors text-center"
                />
                <span className="text-sm text-charcoal/60">pts</span>
              </div>
              <p className="text-xs text-charcoal/60 mt-1">
                Points awarded to positions not listed above
              </p>
            </div>

            {pointTemplateError && (
              <p className="text-coral text-sm">{pointTemplateError}</p>
            )}
          </div>

          <DialogFooter>
            <button
              onClick={closePointTemplateDialog}
              className="px-4 py-2 text-charcoal/70 hover:text-charcoal transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePointTemplate}
              disabled={createPointTemplateMutation.isPending || updatePointTemplateMutation.isPending}
              className="flex items-center gap-2 px-6 py-2 bg-turf text-white rounded-lg hover:bg-fairway transition-colors disabled:opacity-50"
            >
              {(createPointTemplateMutation.isPending || updatePointTemplateMutation.isPending) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              {editingPointTemplate ? "Save Changes" : "Create Template"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Source Selection Dialog */}
      <Dialog open={showSourceDialog} onOpenChange={setShowSourceDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Point Template</DialogTitle>
            <p className="text-sm text-charcoal/60">
              Choose how to create your new template
            </p>
          </DialogHeader>

          <div className="space-y-4">
            {/* Start Fresh Option */}
            <button
              onClick={handleStartFresh}
              className="w-full p-4 border-2 border-soft-grey rounded-xl hover:border-turf hover:bg-rough/20 transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 bg-turf/10 rounded-lg group-hover:bg-turf/20 transition-colors">
                  <FilePlus className="w-6 h-6 text-turf" />
                </div>
                <div>
                  <h3 className="font-semibold text-charcoal">Start Fresh</h3>
                  <p className="text-sm text-charcoal/60 mt-1">
                    Create a new template from scratch with default values
                  </p>
                </div>
              </div>
            </button>

            {/* Copy from Library Section */}
            <div className="border-2 border-soft-grey rounded-xl overflow-hidden">
              <div className="p-4 bg-rough/30 border-b border-soft-grey">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-fairway/10 rounded-lg">
                    <Library className="w-5 h-5 text-fairway" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-charcoal">Copy from Library</h3>
                    <p className="text-sm text-charcoal/60">
                      Start with a pre-configured template
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 max-h-64 overflow-y-auto">
                {libraryTemplatesLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-fairway" />
                  </div>
                ) : libraryTemplates && libraryTemplates.length > 0 ? (
                  <div className="space-y-2">
                    {libraryTemplates.map((template) => {
                      let points: PointsStructure = {};
                      try {
                        points = JSON.parse(template.points_structure);
                      } catch {
                        // ignore parse errors
                      }
                      const positionCount = Object.keys(points).filter(
                        (k) => k !== "default"
                      ).length;

                      return (
                        <button
                          key={template.id}
                          onClick={() => handleCopyFromLibrary(template)}
                          className="w-full p-3 border border-soft-grey rounded-lg hover:border-fairway hover:bg-fairway/5 transition-all text-left flex items-center justify-between gap-3"
                        >
                          <div>
                            <span className="font-medium text-charcoal">{template.name}</span>
                            <span className="text-xs text-charcoal/50 ml-2">
                              {positionCount} positions
                            </span>
                          </div>
                          <Copy className="w-4 h-4 text-charcoal/40" />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-charcoal/50 text-sm">
                    <p>No library templates available</p>
                    <p className="text-xs mt-1">
                      Contact an admin to create template library entries
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={() => setShowSourceDialog(false)}
              className="px-4 py-2 text-charcoal/70 hover:text-charcoal transition-colors"
            >
              Cancel
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {dialog}
    </div>
  );
}

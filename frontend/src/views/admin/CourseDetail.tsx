import { useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  useCourse,
  useUpdateCourse,
  useUpdateCourseHoles,
  useCourseTees,
  useCreateCourseTee,
  useUpdateCourseTee,
  useDeleteCourseTee,
  useUpsertCourseTeeRating,
  type CourseTee,
  type CreateCourseTeeData,
  type UpdateCourseTeeData,
} from "@/api/courses";
import { useClubs } from "@/api/clubs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNotification } from "@/hooks/useNotification";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import {
  ArrowLeft,
  Loader2,
  Save,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Info,
} from "lucide-react";

// Tee color options for the color picker
const TEE_COLORS = [
  { name: "Yellow", value: "yellow", class: "bg-yellow-400" },
  { name: "White", value: "white", class: "bg-white border border-gray-300" },
  { name: "Red", value: "red", class: "bg-red-500" },
  { name: "Blue", value: "blue", class: "bg-blue-500" },
  { name: "Black", value: "black", class: "bg-black" },
  { name: "Gold", value: "gold", class: "bg-yellow-500" },
  { name: "Green", value: "green", class: "bg-green-500" },
  { name: "Orange", value: "orange", class: "bg-orange-500" },
];

function getTeeColorClass(color?: string): string {
  if (!color) return "bg-gray-300";
  const found = TEE_COLORS.find(
    (c) => c.value.toLowerCase() === color.toLowerCase()
  );
  return found?.class || "bg-gray-300";
}

type TabType = "info" | "holes" | "tees";

export default function CourseDetail() {
  const { courseId } = useParams({ from: "/admin/courses/$courseId" });
  const navigate = useNavigate();
  const id = parseInt(courseId);

  const [activeTab, setActiveTab] = useState<TabType>("info");

  const { data: course, isLoading, error } = useCourse(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-fairway" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate({ to: "/admin/courses" })}
          className="flex items-center gap-2 text-fairway hover:text-turf mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Courses
        </button>
        <h1 className="text-2xl font-bold text-red-600">Course not found</h1>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate({ to: "/admin/courses" })}
          className="flex items-center gap-2 text-fairway hover:text-turf mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Courses
        </button>

        <h1 className="text-3xl font-bold text-charcoal">{course.name}</h1>
        {course.club_name && (
          <p className="text-charcoal/70 mt-1">{course.club_name}</p>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TabType)}
      >
        <TabsList className="mb-6">
          <TabsTrigger value="info">Course Info</TabsTrigger>
          <TabsTrigger value="holes">Holes & Pars</TabsTrigger>
          <TabsTrigger value="tees">Tees</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <CourseInfoTab courseId={id} courseName={course.name} clubId={course.club_id} />
        </TabsContent>

        <TabsContent value="holes">
          <HolesAndParsTab
            courseId={id}
            initialPars={course.pars.holes}
            initialStrokeIndex={course.stroke_index}
          />
        </TabsContent>

        <TabsContent value="tees">
          <TeesTab courseId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Tab 1: Course Info
// ============================================================================

function CourseInfoTab({
  courseId,
  courseName,
  clubId,
}: {
  courseId: number;
  courseName: string;
  clubId?: number;
}) {
  const [name, setName] = useState(courseName);
  const [selectedClubId, setSelectedClubId] = useState<number | null>(clubId ?? null);
  const updateCourse = useUpdateCourse();
  const { data: clubs, isLoading: clubsLoading } = useClubs();
  const { showSuccess, showError } = useNotification();

  const hasChanges = name !== courseName || selectedClubId !== (clubId ?? null);

  const handleSave = async () => {
    try {
      await updateCourse.mutateAsync({
        id: courseId,
        name,
        club_id: selectedClubId,
      });
      showSuccess("Course updated successfully");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to update course");
    }
  };

  return (
    <div className="bg-soft-grey/30 rounded-2xl shadow-lg p-6 space-y-6">
      <div>
        <h3 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
          Course Name
        </h3>
        <div className="bg-white rounded p-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter course name"
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
          Club
        </h3>
        <div className="bg-white rounded p-4">
          <Select
            value={selectedClubId?.toString() ?? "none"}
            onValueChange={(value) =>
              setSelectedClubId(value === "none" ? null : parseInt(value))
            }
            disabled={clubsLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a club" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No club</SelectItem>
              {clubs?.map((club) => (
                <SelectItem key={club.id} value={club.id.toString()}>
                  {club.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={updateCourse.isPending || !hasChanges}
        className="rounded"
      >
        {updateCourse.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            Save
          </>
        )}
      </Button>
    </div>
  );
}

// ============================================================================
// Tab 2: Holes & Pars
// ============================================================================

function HolesAndParsTab({
  courseId,
  initialPars,
  initialStrokeIndex,
}: {
  courseId: number;
  initialPars: number[];
  initialStrokeIndex?: number[];
}) {
  // Initialize with 18 holes
  const defaultPars = Array(18).fill(4);
  const defaultSI = Array.from({ length: 18 }, (_, i) => i + 1);

  const [pars, setPars] = useState<number[]>(
    initialPars.length === 18 ? initialPars : defaultPars
  );
  const [strokeIndex, setStrokeIndex] = useState<number[]>(
    initialStrokeIndex && initialStrokeIndex.length === 18
      ? initialStrokeIndex
      : defaultSI
  );
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const updateCourseHoles = useUpdateCourseHoles();
  const { showSuccess, showError } = useNotification();

  // Calculate totals
  const outPar = pars.slice(0, 9).reduce((sum, p) => sum + (p || 0), 0);
  const inPar = pars.slice(9, 18).reduce((sum, p) => sum + (p || 0), 0);
  const totalPar = outPar + inPar;

  // Validate
  const validate = (): boolean => {
    const errors: string[] = [];

    // Check pars are 3-6
    pars.forEach((par, i) => {
      if (par < 3 || par > 6) {
        errors.push(`Hole ${i + 1}: Par must be between 3 and 6`);
      }
    });

    // Check SI are unique 1-18
    const siSet = new Set(strokeIndex);
    if (siSet.size !== 18) {
      errors.push("Stroke Index values must be unique (1-18)");
    }
    strokeIndex.forEach((si) => {
      if (si < 1 || si > 18) {
        errors.push("Stroke Index values must be between 1 and 18");
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    try {
      await updateCourseHoles.mutateAsync({
        id: courseId,
        holes: pars,
        stroke_index: strokeIndex,
      });
      showSuccess("Holes and pars updated successfully");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to update holes");
    }
  };

  const handleParChange = (index: number, value: string) => {
    const newPars = [...pars];
    newPars[index] = parseInt(value) || 0;
    setPars(newPars);
  };

  const handleSIChange = (index: number, value: string) => {
    const newSI = [...strokeIndex];
    newSI[index] = parseInt(value) || 0;
    setStrokeIndex(newSI);
  };

  return (
    <div className="bg-soft-grey/30 rounded-2xl shadow-lg p-6">
      {validationErrors.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            <ul className="list-disc list-inside">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Front 9 */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
          Front 9
        </h3>
        <div className="bg-white rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-soft-grey">
                  <th className="px-2 py-2 text-left text-charcoal/70 font-medium w-12"></th>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((hole) => (
                    <th
                      key={hole}
                      className="px-1 py-2 text-center text-charcoal font-medium w-12"
                    >
                      {hole}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center text-charcoal font-bold w-14 bg-soft-grey/30">
                    Out
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-soft-grey">
                  <td className="px-2 py-2 text-charcoal/70 font-medium">Par</td>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <td key={i} className="px-1 py-2">
                      <Input
                        type="number"
                        min="3"
                        max="6"
                        value={pars[i]}
                        onChange={(e) => handleParChange(i, e.target.value)}
                        className="w-10 h-8 text-center p-0 text-sm"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center font-bold bg-soft-grey/30">
                    {outPar}
                  </td>
                </tr>
                <tr>
                  <td className="px-2 py-2 text-charcoal/70 font-medium">SI</td>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <td key={i} className="px-1 py-2">
                      <Input
                        type="number"
                        min="1"
                        max="18"
                        value={strokeIndex[i]}
                        onChange={(e) => handleSIChange(i, e.target.value)}
                        className="w-10 h-8 text-center p-0 text-sm"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-2 bg-soft-grey/30"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Back 9 */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
          Back 9
        </h3>
        <div className="bg-white rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-soft-grey">
                  <th className="px-2 py-2 text-left text-charcoal/70 font-medium w-12"></th>
                  {[10, 11, 12, 13, 14, 15, 16, 17, 18].map((hole) => (
                    <th
                      key={hole}
                      className="px-1 py-2 text-center text-charcoal font-medium w-12"
                    >
                      {hole}
                    </th>
                  ))}
                  <th className="px-2 py-2 text-center text-charcoal font-bold w-14 bg-soft-grey/30">
                    In
                  </th>
                  <th className="px-2 py-2 text-center text-charcoal font-bold w-14 bg-turf/10">
                    Tot
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-soft-grey">
                  <td className="px-2 py-2 text-charcoal/70 font-medium">Par</td>
                  {[9, 10, 11, 12, 13, 14, 15, 16, 17].map((i) => (
                    <td key={i} className="px-1 py-2">
                      <Input
                        type="number"
                        min="3"
                        max="6"
                        value={pars[i]}
                        onChange={(e) => handleParChange(i, e.target.value)}
                        className="w-10 h-8 text-center p-0 text-sm"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center font-bold bg-soft-grey/30">
                    {inPar}
                  </td>
                  <td className="px-2 py-2 text-center font-bold bg-turf/10">
                    {totalPar}
                  </td>
                </tr>
                <tr>
                  <td className="px-2 py-2 text-charcoal/70 font-medium">SI</td>
                  {[9, 10, 11, 12, 13, 14, 15, 16, 17].map((i) => (
                    <td key={i} className="px-1 py-2">
                      <Input
                        type="number"
                        min="1"
                        max="18"
                        value={strokeIndex[i]}
                        onChange={(e) => handleSIChange(i, e.target.value)}
                        className="w-10 h-8 text-center p-0 text-sm"
                      />
                    </td>
                  ))}
                  <td className="px-2 py-2 bg-soft-grey/30"></td>
                  <td className="px-2 py-2 bg-turf/10"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateCourseHoles.isPending}
          className="rounded"
        >
          {updateCourseHoles.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Tab 3: Tees
// ============================================================================

function TeesTab({ courseId }: { courseId: number }) {
  const { data: tees, isLoading } = useCourseTees(courseId);
  const [expandedTeeId, setExpandedTeeId] = useState<number | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-fairway" />
      </div>
    );
  }

  return (
    <div className="bg-soft-grey/30 rounded-2xl shadow-lg p-6">
      <h3 className="text-sm font-bold text-charcoal mb-3 uppercase tracking-wide">
        Tee Boxes
      </h3>

      {/* Tees List */}
      {tees && tees.length > 0 ? (
        <div className="bg-white rounded overflow-hidden divide-y divide-soft-grey mb-4">
          {tees.map((tee) => (
            <TeeRow
              key={tee.id}
              tee={tee}
              courseId={courseId}
              isExpanded={expandedTeeId === tee.id}
              onToggle={() =>
                setExpandedTeeId(expandedTeeId === tee.id ? null : tee.id)
              }
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded p-6 text-center text-charcoal/50 mb-4">
          <Info className="h-8 w-8 mx-auto mb-2 text-charcoal/30" />
          <p>No tees defined for this course</p>
        </div>
      )}

      {/* Add Tee Button */}
      <Button onClick={() => setShowAddDialog(true)} className="rounded">
        <Plus className="h-4 w-4 mr-2" />
        Add Tee
      </Button>

      {/* Add Tee Dialog */}
      <AddTeeDialog
        courseId={courseId}
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />
    </div>
  );
}

function TeeRow({
  tee,
  courseId,
  isExpanded,
  onToggle,
}: {
  tee: CourseTee;
  courseId: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  // Get men's and women's ratings
  const menRating = tee.ratings?.find((r) => r.gender === "men");
  const womenRating = tee.ratings?.find((r) => r.gender === "women");

  // Format rating display
  const formatRating = (
    cr: number | undefined,
    sr: number | undefined
  ): string => {
    if (!cr) return "-";
    return `${cr.toFixed(1)}/${sr || "-"}`;
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between px-4 py-3 hover:bg-turf/5 transition-colors cursor-pointer">
          <div className="flex items-center gap-3">
            <span
              className={`w-4 h-4 rounded-full shrink-0 ${getTeeColorClass(tee.color)}`}
            />
            <span className="font-medium text-charcoal">{tee.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-charcoal/70">
              <span className="mr-4">
                Men: {formatRating(menRating?.course_rating, menRating?.slope_rating)}
              </span>
              <span>
                Women: {formatRating(womenRating?.course_rating, womenRating?.slope_rating)}
              </span>
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-charcoal/50" />
            ) : (
              <ChevronRight className="h-4 w-4 text-charcoal/50" />
            )}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <TeeEditForm tee={tee} courseId={courseId} onClose={onToggle} />
      </CollapsibleContent>
    </Collapsible>
  );
}

function TeeEditForm({
  tee,
  courseId,
  onClose,
}: {
  tee: CourseTee;
  courseId: number;
  onClose: () => void;
}) {
  const [name, setName] = useState(tee.name);
  const [color, setColor] = useState(tee.color || "");

  // Get existing ratings
  const existingMenRating = tee.ratings?.find((r) => r.gender === "men");
  const existingWomenRating = tee.ratings?.find((r) => r.gender === "women");

  const [menCR, setMenCR] = useState(existingMenRating?.course_rating?.toString() || "");
  const [menSR, setMenSR] = useState(existingMenRating?.slope_rating?.toString() || "");
  const [womenCR, setWomenCR] = useState(existingWomenRating?.course_rating?.toString() || "");
  const [womenSR, setWomenSR] = useState(existingWomenRating?.slope_rating?.toString() || "");

  const updateTee = useUpdateCourseTee();
  const deleteTee = useDeleteCourseTee();
  const upsertRating = useUpsertCourseTeeRating();
  const { showSuccess, showError } = useNotification();
  const { confirm, dialog } = useConfirmDialog();

  const handleSave = async () => {
    try {
      // Update tee name and color
      const updateData: UpdateCourseTeeData = { name };
      if (color) updateData.color = color;

      await updateTee.mutateAsync({
        courseId,
        teeId: tee.id,
        data: updateData,
      });

      // Update men's rating if provided
      if (menCR) {
        await upsertRating.mutateAsync({
          courseId,
          teeId: tee.id,
          data: {
            gender: "men",
            course_rating: parseFloat(menCR),
            slope_rating: menSR ? parseInt(menSR) : undefined,
          },
        });
      }

      // Update women's rating if provided
      if (womenCR) {
        await upsertRating.mutateAsync({
          courseId,
          teeId: tee.id,
          data: {
            gender: "women",
            course_rating: parseFloat(womenCR),
            slope_rating: womenSR ? parseInt(womenSR) : undefined,
          },
        });
      }

      showSuccess("Tee updated successfully");
      onClose();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to update tee");
    }
  };

  const handleDelete = async () => {
    const shouldDelete = await confirm({
      title: "Delete tee?",
      description: `Delete tee "${tee.name}"? This cannot be undone.`,
      confirmLabel: "Delete tee",
      variant: "destructive",
    });
    if (!shouldDelete) return;

    try {
      await deleteTee.mutateAsync({ courseId, teeId: tee.id });
      showSuccess("Tee deleted successfully");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to delete tee");
    }
  };

  const isPending = updateTee.isPending || upsertRating.isPending;

  return (
    <>
      <div className="px-4 py-4 bg-soft-grey/20 border-t border-soft-grey">
        <div className="space-y-4">
        {/* Name and Color */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-charcoal/70 mb-1">
              Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tee name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal/70 mb-1">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {TEE_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-6 h-6 rounded-full ${c.class} ${
                    color === c.value
                      ? "ring-2 ring-offset-2 ring-turf"
                      : "hover:ring-2 hover:ring-offset-1 hover:ring-charcoal/20"
                  }`}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Men's Rating */}
        <div>
          <label className="block text-sm font-medium text-charcoal/70 mb-1">
            Men's Rating
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="number"
                step="0.1"
                value={menCR}
                onChange={(e) => setMenCR(e.target.value)}
                placeholder="Course Rating"
              />
            </div>
            <div className="flex-1">
              <Input
                type="number"
                value={menSR}
                onChange={(e) => setMenSR(e.target.value)}
                placeholder="Slope Rating"
              />
            </div>
          </div>
        </div>

        {/* Women's Rating */}
        <div>
          <label className="block text-sm font-medium text-charcoal/70 mb-1">
            Women's Rating
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="number"
                step="0.1"
                value={womenCR}
                onChange={(e) => setWomenCR(e.target.value)}
                placeholder="Course Rating"
              />
            </div>
            <div className="flex-1">
              <Input
                type="number"
                value={womenSR}
                onChange={(e) => setWomenSR(e.target.value)}
                placeholder="Slope Rating"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteTee.isPending}
            className="rounded"
          >
            {deleteTee.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </>
            )}
          </Button>
          <Button onClick={handleSave} disabled={isPending} className="rounded">
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>
        </div>
        </div>
      </div>
      {dialog}
    </>
  );
}

function AddTeeDialog({
  courseId,
  open,
  onOpenChange,
}: {
  courseId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("yellow");
  const [menCR, setMenCR] = useState("");
  const [menSR, setMenSR] = useState("");
  const [womenCR, setWomenCR] = useState("");
  const [womenSR, setWomenSR] = useState("");

  const createTee = useCreateCourseTee();
  const { showSuccess, showError } = useNotification();

  const resetForm = () => {
    setName("");
    setColor("yellow");
    setMenCR("");
    setMenSR("");
    setWomenCR("");
    setWomenSR("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data: CreateCourseTeeData = {
        name,
        color,
        ratings: [],
      };

      // Add men's rating if provided
      if (menCR) {
        data.ratings!.push({
          gender: "men",
          course_rating: parseFloat(menCR),
          slope_rating: menSR ? parseInt(menSR) : undefined,
        });
      }

      // Add women's rating if provided
      if (womenCR) {
        data.ratings!.push({
          gender: "women",
          course_rating: parseFloat(womenCR),
          slope_rating: womenSR ? parseInt(womenSR) : undefined,
        });
      }

      await createTee.mutateAsync({ courseId, data });
      showSuccess("Tee created successfully");
      resetForm();
      onOpenChange(false);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to create tee");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Tee</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-charcoal/70 mb-1">
              Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Yellow, White, Red"
              required
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-charcoal/70 mb-1">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {TEE_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`w-6 h-6 rounded-full ${c.class} ${
                    color === c.value
                      ? "ring-2 ring-offset-2 ring-turf"
                      : "hover:ring-2 hover:ring-offset-1 hover:ring-charcoal/20"
                  }`}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          {/* Men's Rating */}
          <div>
            <label className="block text-sm font-medium text-charcoal/70 mb-1">
              Men's Rating (optional)
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.1"
                value={menCR}
                onChange={(e) => setMenCR(e.target.value)}
                placeholder="Course Rating"
              />
              <Input
                type="number"
                value={menSR}
                onChange={(e) => setMenSR(e.target.value)}
                placeholder="Slope"
              />
            </div>
          </div>

          {/* Women's Rating */}
          <div>
            <label className="block text-sm font-medium text-charcoal/70 mb-1">
              Women's Rating (optional)
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.1"
                value={womenCR}
                onChange={(e) => setWomenCR(e.target.value)}
                placeholder="Course Rating"
              />
              <Input
                type="number"
                value={womenSR}
                onChange={(e) => setWomenSR(e.target.value)}
                placeholder="Slope"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createTee.isPending}>
              {createTee.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

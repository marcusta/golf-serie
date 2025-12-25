import { useState } from "react";
import {
  useCourses,
  useCreateCourse,
  useUpdateCourseHoles,
  useDeleteCourse,
  useCourseTees,
  useCreateCourseTee,
  useUpdateCourseTee,
  useDeleteCourseTee,
  useUpsertCourseTeeRating,
  type Course,
  type CourseTee,
} from "@/api/courses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Map, Target, TrendingUp, Plus, Edit, Trash2, Settings, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

function CourseSkeleton() {
  return (
    <Card className="mb-4">
      <CardHeader>
        <Skeleton className="h-6 w-[200px]" />
        <Skeleton className="h-4 w-[150px]" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getCourseColor(index: number) {
  const colors = [
    {
      bg: "bg-green-50",
      border: "border-l-green-500",
      text: "text-green-700",
      icon: "text-green-600",
    },
    {
      bg: "bg-blue-50",
      border: "border-l-blue-500",
      text: "text-blue-700",
      icon: "text-blue-600",
    },
    {
      bg: "bg-purple-50",
      border: "border-l-purple-500",
      text: "text-purple-700",
      icon: "text-purple-600",
    },
    {
      bg: "bg-orange-50",
      border: "border-l-orange-500",
      text: "text-orange-700",
      icon: "text-orange-600",
    },
  ];
  return colors[index % colors.length];
}

export default function Courses() {
  const { data: courses, isLoading, error } = useCourses();
  const createCourse = useCreateCourse();
  const updateCourseHoles = useUpdateCourseHoles();
  const deleteCourse = useDeleteCourse();

  const [showDialog, setShowDialog] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseName, setCourseName] = useState("");
  const [pars, setPars] = useState<number[]>(Array(18).fill(3));
  const [step, setStep] = useState<"name" | "pars">("name");

  // Tee management state
  const [showTeeDialog, setShowTeeDialog] = useState(false);
  const [selectedCourseForTees, setSelectedCourseForTees] = useState<Course | null>(null);
  const [editingTee, setEditingTee] = useState<CourseTee | null>(null);
  const [teeName, setTeeName] = useState("");
  const [teeColor, setTeeColor] = useState("");
  // Gender-specific ratings
  const [mensCourseRating, setMensCourseRating] = useState("");
  const [mensSlopeRating, setMensSlopeRating] = useState("113");
  const [womensCourseRating, setWomensCourseRating] = useState("");
  const [womensSlopeRating, setWomensSlopeRating] = useState("113");
  const [hasWomensRating, setHasWomensRating] = useState(false);
  const [teeError, setTeeError] = useState<string | null>(null);

  const { data: courseTees, isLoading: teesLoading } = useCourseTees(selectedCourseForTees?.id || 0);
  const createTee = useCreateCourseTee();
  const updateTee = useUpdateCourseTee();
  const deleteTee = useDeleteCourseTee();
  const upsertRating = useUpsertCourseTeeRating();

  const handleCreate = () => {
    setEditingCourse(null);
    setCourseName("");
    setPars(Array(18).fill(3));
    setStep("name");
    setShowDialog(true);
  };

  const handleEdit = (course: Course) => {
    setEditingCourse(course);
    setCourseName(course.name);
    setPars(course.pars.holes);
    setStep("pars");
    setShowDialog(true);
  };

  const handleDelete = async (course: Course) => {
    if (
      window.confirm(`Are you sure you want to delete course "${course.name}"?`)
    ) {
      try {
        await deleteCourse.mutateAsync(course.id);
      } catch (error) {
        console.error("Failed to delete course:", error);
        alert("Failed to delete course. Please try again.");
      }
    }
  };

  // Tee management handlers
  const openTeeDialog = (course: Course) => {
    setSelectedCourseForTees(course);
    setEditingTee(null);
    resetTeeForm();
    setShowTeeDialog(true);
  };

  const resetTeeForm = () => {
    setTeeName("");
    setTeeColor("");
    setMensCourseRating("");
    setMensSlopeRating("113");
    setWomensCourseRating("");
    setWomensSlopeRating("113");
    setHasWomensRating(false);
    setTeeError(null);
    setEditingTee(null);
  };

  const handleEditTee = (tee: CourseTee) => {
    setEditingTee(tee);
    setTeeName(tee.name);
    setTeeColor(tee.color || "");

    // Load men's rating
    const mensRating = tee.ratings?.find(r => r.gender === "men");
    if (mensRating) {
      setMensCourseRating(mensRating.course_rating.toString());
      setMensSlopeRating(mensRating.slope_rating.toString());
    } else {
      // Fall back to legacy fields
      setMensCourseRating(tee.course_rating.toString());
      setMensSlopeRating(tee.slope_rating.toString());
    }

    // Load women's rating if exists
    const womensRating = tee.ratings?.find(r => r.gender === "women");
    if (womensRating) {
      setWomensCourseRating(womensRating.course_rating.toString());
      setWomensSlopeRating(womensRating.slope_rating.toString());
      setHasWomensRating(true);
    } else {
      setWomensCourseRating("");
      setWomensSlopeRating("113");
      setHasWomensRating(false);
    }

    setTeeError(null);
  };

  const handleSaveTee = async (e: React.FormEvent) => {
    e.preventDefault();
    setTeeError(null);

    if (!selectedCourseForTees) return;

    // Validate men's rating (required)
    const mensCR = parseFloat(mensCourseRating);
    const mensSR = parseInt(mensSlopeRating);

    if (isNaN(mensCR) || mensCR < 50 || mensCR > 90) {
      setTeeError("Men's course rating must be between 50 and 90");
      return;
    }
    if (isNaN(mensSR) || mensSR < 55 || mensSR > 155) {
      setTeeError("Men's slope rating must be between 55 and 155");
      return;
    }

    // Validate women's rating if enabled
    let womensCR: number | undefined;
    let womensSR: number | undefined;
    if (hasWomensRating && womensCourseRating) {
      womensCR = parseFloat(womensCourseRating);
      womensSR = parseInt(womensSlopeRating);

      if (isNaN(womensCR) || womensCR < 50 || womensCR > 90) {
        setTeeError("Women's course rating must be between 50 and 90");
        return;
      }
      if (isNaN(womensSR) || womensSR < 55 || womensSR > 155) {
        setTeeError("Women's slope rating must be between 55 and 155");
        return;
      }
    }

    try {
      if (editingTee) {
        // Update tee name and color
        await updateTee.mutateAsync({
          courseId: selectedCourseForTees.id,
          teeId: editingTee.id,
          data: {
            name: teeName,
            color: teeColor || undefined,
          },
        });

        // Update men's rating
        await upsertRating.mutateAsync({
          courseId: selectedCourseForTees.id,
          teeId: editingTee.id,
          data: {
            gender: "men",
            course_rating: mensCR,
            slope_rating: mensSR,
          },
        });

        // Update women's rating if enabled
        if (hasWomensRating && womensCR !== undefined) {
          await upsertRating.mutateAsync({
            courseId: selectedCourseForTees.id,
            teeId: editingTee.id,
            data: {
              gender: "women",
              course_rating: womensCR,
              slope_rating: womensSR,
            },
          });
        }
      } else {
        // Create new tee with ratings
        const ratings: Array<{ gender: "men" | "women"; course_rating: number; slope_rating: number }> = [
          { gender: "men", course_rating: mensCR, slope_rating: mensSR },
        ];

        if (hasWomensRating && womensCR !== undefined && womensSR !== undefined) {
          ratings.push({ gender: "women", course_rating: womensCR, slope_rating: womensSR });
        }

        await createTee.mutateAsync({
          courseId: selectedCourseForTees.id,
          data: {
            name: teeName,
            color: teeColor || undefined,
            ratings,
          },
        });
      }
      resetTeeForm();
    } catch (err) {
      setTeeError(err instanceof Error ? err.message : "Failed to save tee");
    }
  };

  const handleDeleteTee = async (tee: CourseTee) => {
    if (!selectedCourseForTees) return;
    if (window.confirm(`Are you sure you want to delete tee "${tee.name}"?`)) {
      try {
        await deleteTee.mutateAsync({
          courseId: selectedCourseForTees.id,
          teeId: tee.id,
        });
        if (editingTee?.id === tee.id) {
          resetTeeForm();
        }
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to delete tee");
      }
    }
  };

  const handleParChange = (index: number, value: string) => {
    const newPars = [...pars];
    newPars[index] = parseInt(value) || 3;
    setPars(newPars);
  };

  const calculateTotals = (holes: number[]) => {
    const out = holes.slice(0, 9).reduce((sum, par) => sum + par, 0);
    const in_ = holes.slice(9).reduce((sum, par) => sum + par, 0);
    return {
      out,
      in: in_,
      total: out + in_,
    };
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (step === "name") {
        const response = await createCourse.mutateAsync({ name: courseName });
        setEditingCourse(response);
        setStep("pars");
      } else if (editingCourse) {
        await updateCourseHoles.mutateAsync({
          id: editingCourse.id,
          holes: pars,
        });
        setShowDialog(false);
      }
    } catch (error) {
      console.error("Failed to save course:", error);
      alert("Failed to save course. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2 mb-6">
          <Map className="h-8 w-8 text-green-600" />
          <h2 className="text-3xl font-bold text-gray-900">Courses</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <CourseSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-700">
            <Map className="h-5 w-5" />
            <p className="font-medium">Error loading courses</p>
          </div>
          <p className="text-red-600 text-sm mt-2">
            Please try refreshing the page or contact support if the problem
            persists.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Map className="h-8 w-8 text-green-600" />
          <h2 className="text-3xl font-bold text-gray-900">Courses</h2>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-sm">
            {courses?.length || 0}{" "}
            {courses?.length === 1 ? "course" : "courses"}
          </Badge>
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Course
          </Button>
        </div>
      </div>

      {!courses || courses.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="p-12 text-center">
            <Map className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No courses available
            </h3>
            <p className="text-gray-600">
              Add some golf courses to get started with your scorecard.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course, index) => (
            <CourseCard
              key={course.id}
              course={course}
              index={index}
              handleEdit={handleEdit}
              handleDelete={handleDelete}
              handleManageTees={openTeeDialog}
            />
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {step === "name"
                ? "Create New Course"
                : editingCourse
                ? "Edit Course Pars"
                : "Set Course Pars"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {step === "name" ? (
              <div className="space-y-2">
                <label htmlFor="courseName" className="text-sm font-medium">
                  Course Name
                </label>
                <Input
                  id="courseName"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="Enter course name"
                  required
                />
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Hole Pars</h3>
                  <div className="grid grid-cols-9 gap-2">
                    {pars.map((par, index) => (
                      <div key={index} className="space-y-1">
                        <label
                          htmlFor={`par-${index + 1}`}
                          className="text-xs text-gray-500"
                        >
                          Hole {index + 1}
                        </label>
                        <Input
                          id={`par-${index + 1}`}
                          type="number"
                          min="3"
                          max="6"
                          value={par}
                          onChange={(e) =>
                            handleParChange(index, e.target.value)
                          }
                          className="w-full"
                          required
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-4 border-t">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-green-600 font-medium uppercase tracking-wide">
                      Front 9
                    </p>
                    <p className="text-lg font-bold text-green-700">
                      Par {calculateTotals(pars).out}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">
                      Back 9
                    </p>
                    <p className="text-lg font-bold text-blue-700">
                      Par {calculateTotals(pars).in}
                    </p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-xs text-purple-600 font-medium uppercase tracking-wide">
                      Total
                    </p>
                    <p className="text-lg font-bold text-purple-700">
                      Par {calculateTotals(pars).total}
                    </p>
                  </div>
                </div>
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {step === "name" ? "Next" : editingCourse ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tee Management Dialog */}
      <Dialog open={showTeeDialog} onOpenChange={(open) => {
        setShowTeeDialog(open);
        if (!open) {
          setSelectedCourseForTees(null);
          resetTeeForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Manage Tees - {selectedCourseForTees?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Tee Form */}
            <form onSubmit={handleSaveTee} className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900">
                {editingTee ? "Edit Tee" : "Add New Tee"}
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="teeName" className="text-sm font-medium">
                    Tee Name *
                  </label>
                  <Input
                    id="teeName"
                    value={teeName}
                    onChange={(e) => setTeeName(e.target.value)}
                    placeholder="e.g., Yellow, White, Red"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="teeColor" className="text-sm font-medium">
                    Color (optional)
                  </label>
                  <Input
                    id="teeColor"
                    value={teeColor}
                    onChange={(e) => setTeeColor(e.target.value)}
                    placeholder="e.g., white, yellow, red"
                  />
                </div>
              </div>

              {/* Men's Rating */}
              <div className="p-3 border border-blue-200 rounded-lg bg-blue-50/50">
                <h5 className="text-sm font-medium text-blue-800 mb-3">Men's Rating</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="mensCourseRating" className="text-sm font-medium">
                      Course Rating (CR) *
                    </label>
                    <Input
                      id="mensCourseRating"
                      type="number"
                      step="0.1"
                      min="50"
                      max="90"
                      value={mensCourseRating}
                      onChange={(e) => setMensCourseRating(e.target.value)}
                      placeholder="e.g., 72.3"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="mensSlopeRating" className="text-sm font-medium">
                      Slope Rating (SR) *
                    </label>
                    <Input
                      id="mensSlopeRating"
                      type="number"
                      min="55"
                      max="155"
                      value={mensSlopeRating}
                      onChange={(e) => setMensSlopeRating(e.target.value)}
                      placeholder="e.g., 113"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Women's Rating Toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="hasWomensRating"
                  checked={hasWomensRating}
                  onChange={(e) => setHasWomensRating(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="hasWomensRating" className="text-sm font-medium text-gray-700">
                  Add Women's Rating (different CR/SR for women)
                </label>
              </div>

              {/* Women's Rating */}
              {hasWomensRating && (
                <div className="p-3 border border-pink-200 rounded-lg bg-pink-50/50">
                  <h5 className="text-sm font-medium text-pink-800 mb-3">Women's Rating</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="womensCourseRating" className="text-sm font-medium">
                        Course Rating (CR) *
                      </label>
                      <Input
                        id="womensCourseRating"
                        type="number"
                        step="0.1"
                        min="50"
                        max="90"
                        value={womensCourseRating}
                        onChange={(e) => setWomensCourseRating(e.target.value)}
                        placeholder="e.g., 74.5"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="womensSlopeRating" className="text-sm font-medium">
                        Slope Rating (SR) *
                      </label>
                      <Input
                        id="womensSlopeRating"
                        type="number"
                        min="55"
                        max="155"
                        value={womensSlopeRating}
                        onChange={(e) => setWomensSlopeRating(e.target.value)}
                        placeholder="e.g., 118"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500">
                CR: 50.0-90.0 | SR: 55-155 (standard: 113)
              </p>

              {teeError && (
                <p className="text-sm text-red-600">{teeError}</p>
              )}

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={createTee.isPending || updateTee.isPending || upsertRating.isPending}
                  className="flex items-center gap-2"
                >
                  {(createTee.isPending || updateTee.isPending || upsertRating.isPending) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {editingTee ? "Update Tee" : "Add Tee"}
                </Button>
                {editingTee && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetTeeForm}
                  >
                    Cancel Edit
                  </Button>
                )}
              </div>
            </form>

            {/* Existing Tees List */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Existing Tees</h4>

              {teesLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : !courseTees || courseTees.length === 0 ? (
                <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                  <p>No tees defined for this course yet.</p>
                  <p className="text-sm mt-1">Add your first tee above to get started.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {courseTees.map((tee) => (
                    <div
                      key={tee.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        editingTee?.id === tee.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {tee.color && (
                          <div
                            className="w-4 h-4 rounded-full border border-gray-300"
                            style={{ backgroundColor: tee.color }}
                            title={tee.color}
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{tee.name}</p>
                          <div className="text-sm text-gray-500 space-y-0.5">
                            {tee.ratings && tee.ratings.length > 0 ? (
                              tee.ratings.map((rating) => (
                                <p key={rating.id} className="flex items-center gap-1">
                                  <span className={`inline-block w-12 ${rating.gender === 'men' ? 'text-blue-600' : 'text-pink-600'}`}>
                                    {rating.gender === 'men' ? 'Men:' : 'Women:'}
                                  </span>
                                  CR {rating.course_rating} | SR {rating.slope_rating}
                                </p>
                              ))
                            ) : (
                              <p>CR: {tee.course_rating} | SR: {tee.slope_rating}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditTee(tee)}
                          className="h-8 w-8"
                          title="Edit Tee"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTee(tee)}
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete Tee"
                          disabled={deleteTee.isPending}
                        >
                          {deleteTee.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTeeDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CourseCard({
  course,
  index,
  handleEdit,
  handleDelete,
  handleManageTees,
}: {
  course: Course;
  index: number;
  handleEdit: (course: Course) => void;
  handleDelete: (course: Course) => void;
  handleManageTees: (course: Course) => void;
}) {
  const colors = getCourseColor(index);
  return (
    <Card
      key={course.id}
      className={`hover:shadow-lg transition-shadow duration-200 border-l-4 ${colors.border} ${colors.bg}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle
            className={`text-xl ${colors.text} flex items-center gap-2`}
          >
            <Target className={`h-5 w-5 ${colors.icon}`} />
            {course.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              #{course.id}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleManageTees(course)}
              className="h-8 w-8"
              title="Manage Tees"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(course)}
              className="h-8 w-8"
              title="Edit Pars"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(course)}
              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Delete Course"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-xs text-green-600 font-medium uppercase tracking-wide">
              Front 9
            </p>
            <p className="text-lg font-bold text-green-700">
              Par {course.pars.out}
            </p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-600 font-medium uppercase tracking-wide">
              Back 9
            </p>
            <p className="text-lg font-bold text-blue-700">
              Par {course.pars.in}
            </p>
          </div>
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-xs text-purple-600 font-medium uppercase tracking-wide">
              Total
            </p>
            <p className="text-lg font-bold text-purple-700">
              Par {course.pars.total}
            </p>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              <span>{course.pars.holes.length} holes</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

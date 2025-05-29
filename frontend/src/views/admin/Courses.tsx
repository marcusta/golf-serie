import { useState } from "react";
import {
  useCourses,
  useCreateCourse,
  useUpdateCourseHoles,
  useDeleteCourse,
  type Course,
} from "@/api/courses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Map, Target, TrendingUp, Plus, Edit, Trash2 } from "lucide-react";
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
    </div>
  );
}

function CourseCard({
  course,
  index,
  handleEdit,
  handleDelete,
}: {
  course: Course;
  index: number;
  handleEdit: (course: Course) => void;
  handleDelete: (course: Course) => void;
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
              onClick={() => handleEdit(course)}
              className="h-8 w-8"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(course)}
              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
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

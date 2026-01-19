import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  useInfiniteCoursesAdmin,
  useCreateCourse,
  useImportCourses,
  useCourseTees,
  type Course,
  type ImportCourseResult,
} from "@/api/courses";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Map, Plus, Search, Loader2, Upload, FileJson, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useNotification } from "@/hooks/useNotification";

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Filter types
type HoleCountFilter = "all" | "18" | "9";
type HasTeesFilter = "all" | "yes" | "no";

const HOLE_COUNT_OPTIONS: { value: HoleCountFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "18", label: "18 holes" },
  { value: "9", label: "9 holes" },
];

const HAS_TEES_OPTIONS: { value: HasTeesFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "yes", label: "Has tees" },
  { value: "no", label: "No tees" },
];

// Component to fetch and display tee info for a course
function CourseTeeInfo({ courseId }: { courseId: number }) {
  const { data: tees, isLoading } = useCourseTees(courseId);

  if (isLoading) {
    return <span className="text-charcoal/50">Loading...</span>;
  }

  if (!tees || tees.length === 0) {
    return <span className="text-charcoal/50">No tees</span>;
  }

  // Calculate CR range from all tee ratings
  const allRatings: number[] = [];
  tees.forEach((tee) => {
    if (tee.ratings && tee.ratings.length > 0) {
      tee.ratings.forEach((r) => allRatings.push(r.course_rating));
    } else if (tee.course_rating) {
      allRatings.push(tee.course_rating);
    }
  });

  const crRange =
    allRatings.length > 0
      ? `CR ${Math.min(...allRatings).toFixed(1)}-${Math.max(...allRatings).toFixed(1)}`
      : "";

  return (
    <span className="text-charcoal/70">
      {tees.length} {tees.length === 1 ? "tee" : "tees"}
      {crRange && <span className="mx-1">&middot;</span>}
      {crRange}
    </span>
  );
}

export default function Courses() {
  const navigate = useNavigate();
  const createCourse = useCreateCourse();
  const importCourses = useImportCourses();
  const { showError } = useNotification();

  // Search and filter state
  const [searchInput, setSearchInput] = useState("");
  const [holeCountFilter, setHoleCountFilter] = useState<HoleCountFilter>("all");
  const [hasTeesFilter, setHasTeesFilter] = useState<HasTeesFilter>("all");

  // Debounce search input
  const debouncedSearch = useDebounce(searchInput, 300);

  // Create course dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [courseName, setCourseName] = useState("");

  // Import dialog state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importResults, setImportResults] = useState<ImportCourseResult[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Intersection Observer ref for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Use infinite query with debounced search
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteCoursesAdmin({
    search: debouncedSearch || undefined,
    holeCount: holeCountFilter,
    hasTees: hasTeesFilter,
  });

  // Flatten all pages of courses into a single array
  const courses = data?.pages.flatMap((page) => page.courses) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  // Set up Intersection Observer for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "100px",
      threshold: 0,
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [handleObserver]);

  // Create course handler
  const handleCreateCourse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const newCourse = await createCourse.mutateAsync({ name: courseName });
      setShowCreateDialog(false);
      setCourseName("");
      // Navigate to the detail page for the new course
      navigate({ to: "/admin/courses/$courseId", params: { courseId: String(newCourse.id) } });
    } catch (err) {
      console.error("Failed to create course:", err);
      showError("Failed to create course. Please try again.");
    }
  };

  // Import handlers
  const handleOpenImport = () => {
    setImportJson("");
    setImportResults(null);
    setImportError(null);
    setShowImportDialog(true);
  };

  const handleImport = async () => {
    setImportError(null);
    setImportResults(null);

    try {
      const importData = JSON.parse(importJson);
      const results = await importCourses.mutateAsync(importData);
      setImportResults(results);

      // If all successful, close after 2 seconds
      if (results.every((r) => r.success)) {
        setTimeout(() => {
          setShowImportDialog(false);
        }, 2000);
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        setImportError("Invalid JSON format. Please check your data.");
      } else if (err instanceof Error) {
        setImportError(err.message);
      } else {
        setImportError("An unknown error occurred during import.");
      }
    }
  };

  // Navigation handler
  const handleEditCourse = (courseId: number) => {
    navigate({ to: "/admin/courses/$courseId", params: { courseId: String(courseId) } });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2 mb-6">
          <Map className="h-8 w-8 text-turf" />
          <h2 className="text-3xl font-bold text-charcoal font-['Inter']">Courses</h2>
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
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
            Please try refreshing the page or contact support if the problem persists.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Map className="h-8 w-8 text-turf" />
          <h2 className="text-3xl font-bold text-charcoal font-['Inter']">
            Courses ({total})
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleOpenImport}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Import
          </Button>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Course
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search by name or club..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-4">
        {/* Hole Count Filters */}
        <div className="flex flex-wrap gap-2">
          {HOLE_COUNT_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={holeCountFilter === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setHoleCountFilter(option.value)}
              className={
                holeCountFilter === option.value
                  ? "bg-turf hover:bg-turf/90 text-white"
                  : "hover:bg-turf/10"
              }
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Has Tees Filters */}
        <div className="flex flex-wrap gap-2">
          {HAS_TEES_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={hasTeesFilter === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setHasTeesFilter(option.value)}
              className={
                hasTeesFilter === option.value
                  ? "bg-turf hover:bg-turf/90 text-white"
                  : "hover:bg-turf/10"
              }
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Courses List */}
      {courses.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="p-8 text-center">
            <Map className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {debouncedSearch || holeCountFilter !== "all" || hasTeesFilter !== "all"
                ? "No courses found matching your filters"
                : "No courses found. Add your first course to get started."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Showing {courses.length} of {total} courses
          </p>

          {/* List container with dividers */}
          <div className="bg-white rounded overflow-hidden divide-y divide-soft-grey border border-soft-grey/50">
            {courses.map((course: Course) => (
              <CourseListItem
                key={course.id}
                course={course}
                onEdit={() => handleEditCourse(course.id)}
              />
            ))}
          </div>

          {/* Load More Trigger / Loading Indicator */}
          <div ref={loadMoreRef} className="py-4 flex justify-center">
            {isFetchingNextPage ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading more...</span>
              </div>
            ) : hasNextPage ? (
              <div className="h-4" />
            ) : courses.length > 0 ? (
              <p className="text-sm text-gray-400">All courses loaded</p>
            ) : null}
          </div>
        </div>
      )}

      {/* Create Course Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Course</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCourse} className="space-y-4">
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
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createCourse.isPending}>
                {createCourse.isPending ? (
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

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="h-5 w-5" />
              Import Course Data
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Paste your course data in JSON format. You can import a single course or
                multiple courses (as an array).
              </p>
              <details className="text-xs text-gray-500 cursor-pointer">
                <summary className="font-medium hover:text-gray-700">
                  Show expected format
                </summary>
                <pre className="mt-2 p-3 bg-gray-50 rounded border overflow-x-auto">
                  {`{
  "course_metadata": {
    "club_name": "Golf Club Name",
    "course_name": "Course Name",
    "location": "City, Country",
    "total_par": 71,
    "total_holes": 18
  },
  "scorecard": [
    { "hole": 1, "par": 4, "hcp_men": 10, "hcp_women": 10 },
    ...
  ],
  "tee_ratings": [
    {
      "tee_name": "Yellow",
      "men": { "course_rating": 69.5, "slope": 124 },
      "women": { "course_rating": 76.0, "slope": 134 }
    },
    ...
  ]
}`}
                </pre>
              </details>
            </div>

            <Textarea
              placeholder="Paste JSON data here..."
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />

            {importError && (
              <Alert variant="destructive">
                <AlertDescription>{importError}</AlertDescription>
              </Alert>
            )}

            {importResults && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Import Results:</h4>
                {importResults.map((result, index) => (
                  <Alert
                    key={index}
                    variant={result.success ? "default" : "destructive"}
                    className={result.success ? "border-green-500 bg-green-50" : ""}
                  >
                    <AlertDescription>
                      <div className="flex items-center justify-between">
                        <span>
                          <strong>{result.courseName}</strong>:{" "}
                          {result.success ? (
                            <>
                              {result.action === "created" ? "Created" : "Updated"}{" "}
                              successfully ({result.teesProcessed} tees processed)
                            </>
                          ) : (
                            <>Failed: {result.errors?.join(", ")}</>
                          )}
                        </span>
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importJson.trim() || importCourses.isPending}
            >
              {importCourses.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Course list item component
function CourseListItem({
  course,
  onEdit,
}: {
  course: Course;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-turf/5 transition-colors">
      {/* Course Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-charcoal truncate">{course.name}</span>
          {course.club_name && (
            <Badge variant="outline" className="text-xs flex-shrink-0">
              {course.club_name}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 text-sm text-charcoal/70 mt-0.5">
          <span>{course.pars.holes.length} holes</span>
          <span className="mx-1">&middot;</span>
          <CourseTeeInfo courseId={course.id} />
        </div>
      </div>

      {/* Par and Edit Button */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-sm font-medium text-charcoal">
          Par {course.pars.total}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          className="h-8 w-8"
          title="Edit course"
        >
          <Pencil className="h-4 w-4 text-charcoal/70" />
        </Button>
      </div>
    </div>
  );
}

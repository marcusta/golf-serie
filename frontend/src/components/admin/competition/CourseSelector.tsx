import { useCourses, type Course } from "../../../api/courses";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { MapPin } from "lucide-react";

export interface CourseSelectorProps {
  value: number | null;
  onChange: (courseId: number | null) => void;
  error?: string;
  disabled?: boolean;
  label?: string;
  required?: boolean;
}

export function CourseSelector({
  value,
  onChange,
  error,
  disabled = false,
  label = "Course",
  required = false,
}: CourseSelectorProps) {
  const { data: courses, isLoading } = useCourses();

  const selectedCourse = courses?.find((c) => c.id === value);

  const handleValueChange = (val: string) => {
    if (val === "none") {
      onChange(null);
    } else {
      onChange(parseInt(val, 10));
    }
  };

  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <Select
        value={value?.toString() ?? "none"}
        onValueChange={handleValueChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger
          className={`w-full ${error ? "border-red-500" : ""}`}
          aria-invalid={!!error}
        >
          <SelectValue placeholder={isLoading ? "Loading..." : "Select a course"}>
            {selectedCourse && (
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                {selectedCourse.name}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            <span className="text-gray-500">No course selected</span>
          </SelectItem>
          {courses?.map((course: Course) => (
            <SelectItem key={course.id} value={course.id.toString()}>
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                {course.name}
                <span className="text-gray-400 text-xs">
                  ({course.pars.total} par)
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}

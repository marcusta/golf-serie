import { useCourseTees, type CourseTee } from "../../../api/courses";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Flag } from "lucide-react";

export interface TeeSelectorProps {
  courseId: number | null;
  value: number | null;
  onChange: (teeId: number | null) => void;
  disabled?: boolean;
  error?: string;
  label?: string;
  required?: boolean;
}

const TEE_COLORS: Record<string, string> = {
  yellow: "bg-yellow-400",
  white: "bg-white border border-gray-300",
  red: "bg-red-500",
  blue: "bg-blue-500",
  black: "bg-black",
  gold: "bg-yellow-500",
  green: "bg-green-500",
  orange: "bg-orange-500",
};

function getTeeColorClass(color?: string): string {
  if (!color) return "bg-gray-300";
  const normalizedColor = color.toLowerCase();
  return TEE_COLORS[normalizedColor] || "bg-gray-300";
}

function formatRating(tee: CourseTee): string {
  // Check for gender-specific ratings first
  if (tee.ratings && tee.ratings.length > 0) {
    const menRating = tee.ratings.find((r) => r.gender === "men");
    if (menRating) {
      return `CR ${menRating.course_rating.toFixed(1)} / SR ${menRating.slope_rating}`;
    }
    // Fall back to first available rating
    const firstRating = tee.ratings[0];
    return `CR ${firstRating.course_rating.toFixed(1)} / SR ${firstRating.slope_rating}`;
  }
  // Fall back to legacy fields
  if (tee.course_rating && tee.slope_rating) {
    return `CR ${tee.course_rating.toFixed(1)} / SR ${tee.slope_rating}`;
  }
  return "";
}

export function TeeSelector({
  courseId,
  value,
  onChange,
  disabled = false,
  error,
  label = "Tee Box",
  required = false,
}: TeeSelectorProps) {
  const { data: tees, isLoading } = useCourseTees(courseId || 0);

  const selectedTee = tees?.find((t) => t.id === value);
  const isDisabled = disabled || !courseId || isLoading;

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
        disabled={isDisabled}
      >
        <SelectTrigger
          className={`w-full ${error ? "border-red-500" : ""}`}
          aria-invalid={!!error}
        >
          <SelectValue
            placeholder={
              !courseId
                ? "Select a course first"
                : isLoading
                  ? "Loading tees..."
                  : "Select a tee box"
            }
          >
            {selectedTee && (
              <span className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full shrink-0 ${getTeeColorClass(selectedTee.color)}`}
                />
                {selectedTee.name}
                {formatRating(selectedTee) && (
                  <span className="text-gray-400 text-xs">
                    ({formatRating(selectedTee)})
                  </span>
                )}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-white">
          <SelectItem value="none">
            <span className="flex items-center gap-2 text-gray-500">
              <Flag className="h-4 w-4" />
              No tee specified
            </span>
          </SelectItem>
          {tees?.map((tee: CourseTee) => (
            <SelectItem key={tee.id} value={tee.id.toString()}>
              <span className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full shrink-0 ${getTeeColorClass(tee.color)}`}
                />
                {tee.name}
                {formatRating(tee) && (
                  <span className="text-gray-400 text-xs ml-1">
                    ({formatRating(tee)})
                  </span>
                )}
              </span>
            </SelectItem>
          ))}
          {tees?.length === 0 && (
            <div className="px-2 py-1.5 text-sm text-gray-500">
              No tees defined for this course
            </div>
          )}
        </SelectContent>
      </Select>
      {!courseId && !disabled && (
        <p className="text-xs text-gray-500 mt-1">
          Select a course to see available tees
        </p>
      )}
      {error && <p className="text-sm text-red-500 mt-1">{error}</p>}
    </div>
  );
}

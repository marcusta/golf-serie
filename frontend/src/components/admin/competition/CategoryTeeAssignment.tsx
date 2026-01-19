import { useTourCategories } from "../../../api/tours";
import { useCourseTees } from "../../../api/courses";
import type { CategoryTeeMapping } from "../../../api/competitions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Tee color display helper
function TeeColorDot({ color }: { color?: string }) {
  if (!color) return null;
  return (
    <span
      className="inline-block w-3 h-3 rounded-full border border-charcoal/20 mr-2"
      style={{ backgroundColor: color }}
    />
  );
}

interface CategoryTeeAssignmentProps {
  tourId: number;
  courseId: number | null;
  mappings: CategoryTeeMapping[];
  onChange: (mappings: CategoryTeeMapping[]) => void;
  disabled?: boolean;
}

export function CategoryTeeAssignment({
  tourId,
  courseId,
  mappings,
  onChange,
  disabled,
}: CategoryTeeAssignmentProps) {
  const { data: categories, isLoading: categoriesLoading } =
    useTourCategories(tourId);
  const { data: tees, isLoading: teesLoading } = useCourseTees(courseId || 0);

  // Don't show if no course selected
  if (!courseId) {
    return null;
  }

  // Don't show if no categories exist for this tour
  if (!categoriesLoading && (!categories || categories.length === 0)) {
    return null;
  }

  const isLoading = categoriesLoading || teesLoading;

  // Get the tee ID for a given category from mappings
  const getTeeForCategory = (categoryId: number): string => {
    const mapping = mappings.find((m) => m.categoryId === categoryId);
    return mapping?.teeId?.toString() || "default";
  };

  // Handle tee selection for a category
  const handleTeeChange = (categoryId: number, teeIdStr: string) => {
    const teeId = teeIdStr && teeIdStr !== "default" ? parseInt(teeIdStr) : null;

    // Create new mappings array
    const newMappings = mappings.filter((m) => m.categoryId !== categoryId);

    if (teeId) {
      newMappings.push({ categoryId, teeId });
    }

    onChange(newMappings);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-charcoal">
          Category Tee Assignments
        </label>
        <div className="text-sm text-charcoal/50">Loading categories...</div>
      </div>
    );
  }

  // Check if course has tees configured
  if (!tees || tees.length === 0) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-charcoal">
          Category Tee Assignments
        </label>
        <p className="text-sm text-charcoal/50">
          No tees configured for this course. Configure tees in Course
          Management first.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-charcoal">
        Category Tee Assignments
      </label>
      <p className="text-sm text-charcoal/50">
        Assign specific tees to player categories for handicap calculations.
      </p>

      <div className="space-y-2">
        {categories?.map((category) => (
          <div
            key={category.id}
            className="flex items-center gap-3 py-2 px-3 bg-soft-grey/30 rounded-lg"
          >
            <span className="text-sm font-medium text-charcoal min-w-[120px]">
              {category.name}
            </span>
            <Select
              value={getTeeForCategory(category.id)}
              onValueChange={(value) => handleTeeChange(category.id, value)}
              disabled={disabled}
            >
              <SelectTrigger className="flex-1 h-9">
                <SelectValue placeholder="Use default tee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Use default tee</SelectItem>
                {tees.map((tee) => (
                  <SelectItem key={tee.id} value={tee.id.toString()}>
                    {tee.name}
                    {tee.color ? ` (${tee.color})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {getTeeForCategory(category.id) !== "default" && (
              <TeeColorDot
                color={
                  tees.find(
                    (t) => t.id === parseInt(getTeeForCategory(category.id))
                  )?.color
                }
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState } from "react";
import {
  Loader2,
  Plus,
  Layers,
  Edit2,
  Trash2,
  ChevronUp,
  ChevronDown,
  Check,
} from "lucide-react";
import {
  useTourCategories,
  useCreateTourCategory,
  useUpdateTourCategory,
  useDeleteTourCategory,
  useReorderTourCategories,
  type TourCategory,
} from "../../../api/tours";
import { useNotification, formatErrorMessage } from "@/hooks/useNotification";

interface TourCategoriesTabProps {
  tourId: number;
}

export function TourCategoriesTab({ tourId }: TourCategoriesTabProps) {
  const { showError } = useNotification();
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TourCategory | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryError, setCategoryError] = useState<string | null>(null);

  const { data: categories, isLoading: categoriesLoading } = useTourCategories(tourId);

  const createCategoryMutation = useCreateTourCategory();
  const updateCategoryMutation = useUpdateTourCategory();
  const deleteCategoryMutation = useDeleteTourCategory();
  const reorderCategoriesMutation = useReorderTourCategories();

  const openCategoryDialog = (category?: TourCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryName(category.name);
      setCategoryDescription(category.description || "");
    } else {
      setEditingCategory(null);
      setCategoryName("");
      setCategoryDescription("");
    }
    setCategoryError(null);
    setShowCategoryDialog(true);
  };

  const closeCategoryDialog = () => {
    setShowCategoryDialog(false);
    setEditingCategory(null);
    setCategoryName("");
    setCategoryDescription("");
    setCategoryError(null);
  };

  const handleSaveCategory = async () => {
    setCategoryError(null);

    if (!categoryName.trim()) {
      setCategoryError("Category name is required");
      return;
    }

    try {
      if (editingCategory) {
        await updateCategoryMutation.mutateAsync({
          tourId,
          categoryId: editingCategory.id,
          data: { name: categoryName, description: categoryDescription || undefined },
        });
      } else {
        await createCategoryMutation.mutateAsync({
          tourId,
          data: { name: categoryName, description: categoryDescription || undefined },
        });
      }
      closeCategoryDialog();
    } catch (err) {
      setCategoryError(err instanceof Error ? err.message : "Failed to save category");
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    if (confirm("Are you sure you want to delete this category? Enrolled players will have their category cleared.")) {
      try {
        await deleteCategoryMutation.mutateAsync({ tourId, categoryId });
      } catch (err) {
        showError(formatErrorMessage(err, "Failed to delete category"));
      }
    }
  };

  const handleMoveCategory = async (categoryId: number, direction: "up" | "down") => {
    if (!categories) return;

    const currentIndex = categories.findIndex(c => c.id === categoryId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= categories.length) return;

    const newOrder = [...categories];
    const [moved] = newOrder.splice(currentIndex, 1);
    newOrder.splice(newIndex, 0, moved);

    try {
      await reorderCategoriesMutation.mutateAsync({
        tourId,
        categoryIds: newOrder.map(c => c.id),
      });
    } catch (err) {
      showError(formatErrorMessage(err, "Failed to reorder categories"));
    }
  };

  return (
    <div className="space-y-6">
      {/* Categories Info */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-charcoal">Player Categories</h3>
            <p className="text-sm text-charcoal/60 mt-1">
              Create categories to group players (e.g., Men, Women, Seniors). Categories can be used to filter standings.
            </p>
          </div>
          <button
            onClick={() => openCategoryDialog()}
            className="flex items-center gap-2 px-4 py-2 bg-fairway text-white rounded-lg hover:bg-turf transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>
      </div>

      {/* Categories List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-charcoal mb-4">Categories</h3>

        {categoriesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-fairway" />
          </div>
        ) : categories && categories.length > 0 ? (
          <div className="space-y-2">
            {categories.map((category, index) => (
              <div
                key={category.id}
                className="border border-soft-grey rounded-lg p-4 hover:bg-light-rough/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Reorder buttons */}
                    <div className="flex flex-col">
                      <button
                        onClick={() => handleMoveCategory(category.id, "up")}
                        disabled={index === 0 || reorderCategoriesMutation.isPending}
                        className={`p-0.5 rounded transition-colors ${
                          index === 0
                            ? "text-charcoal/20 cursor-not-allowed"
                            : "text-charcoal/50 hover:text-turf"
                        }`}
                        title="Move up"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMoveCategory(category.id, "down")}
                        disabled={index === categories.length - 1 || reorderCategoriesMutation.isPending}
                        className={`p-0.5 rounded transition-colors ${
                          index === categories.length - 1
                            ? "text-charcoal/20 cursor-not-allowed"
                            : "text-charcoal/50 hover:text-turf"
                        }`}
                        title="Move down"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-charcoal">{category.name}</h4>
                        <span className="px-2 py-0.5 bg-charcoal/10 text-charcoal/70 text-xs rounded-full">
                          {category.enrollment_count} {category.enrollment_count === 1 ? "player" : "players"}
                        </span>
                      </div>
                      {category.description && (
                        <p className="text-sm text-charcoal/60 mt-0.5">{category.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openCategoryDialog(category)}
                      className="p-2 text-charcoal/60 hover:text-turf transition-colors"
                      title="Edit category"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      disabled={deleteCategoryMutation.isPending}
                      className="p-2 text-charcoal/60 hover:text-coral transition-colors"
                      title="Delete category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-charcoal/60">
            <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No categories yet.</p>
            <p className="text-sm mt-2">Create categories to organize players into groups.</p>
          </div>
        )}
      </div>

      {/* Category Dialog */}
      {showCategoryDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full overflow-hidden">
            <div className="p-6 border-b border-soft-grey">
              <h2 className="text-xl font-semibold text-charcoal">
                {editingCategory ? "Edit Category" : "Create Category"}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">
                  Name <span className="text-coral">*</span>
                </label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g., Men, Women, Seniors"
                  className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  placeholder="Optional description for this category"
                  rows={3}
                  className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors resize-none"
                />
              </div>

              {categoryError && (
                <p className="text-coral text-sm">{categoryError}</p>
              )}
            </div>

            <div className="p-6 border-t border-soft-grey flex justify-end gap-3">
              <button
                onClick={closeCategoryDialog}
                className="px-4 py-2 text-charcoal/70 hover:text-charcoal transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                className="flex items-center gap-2 px-6 py-2 bg-turf text-white rounded-lg hover:bg-fairway transition-colors disabled:opacity-50"
              >
                {(createCategoryMutation.isPending || updateCategoryMutation.isPending) ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {editingCategory ? "Save Changes" : "Create Category"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

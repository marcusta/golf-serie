import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  useSeries,
  useCreateSeries,
  useDeleteSeries,
  type Series,
} from "@/api/series";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Plus, Trash2, Eye, EyeOff, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useNotification } from "@/hooks/useNotification";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

function SeriesSkeleton() {
  return (
    <div className="grid grid-cols-[minmax(200px,2fr)_140px_140px_120px] gap-4 px-4 py-2 items-center">
      <div className="space-y-2">
        <Skeleton className="h-4 w-[240px]" />
        <Skeleton className="h-3 w-[320px]" />
      </div>
      <Skeleton className="h-3 w-[80px]" />
      <Skeleton className="h-3 w-[90px]" />
      <div className="flex justify-end gap-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </div>
  );
}

export default function AdminSeries() {
  const navigate = useNavigate();
  const { canCreate } = useAuth();
  const { showError } = useNotification();
  const { data: series, isLoading, error } = useSeries();
  const createSeries = useCreateSeries();
  const deleteSeries = useDeleteSeries();
  const { confirm, dialog } = useConfirmDialog();

  const [showDialog, setShowDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    banner_image_url: "",
    is_public: true,
  });

  // Paginate series
  const pagination = usePagination(series, { pageSize: 100 });

  const handleCreate = () => {
    setFormData({
      name: "",
      description: "",
      banner_image_url: "",
      is_public: true,
    });
    setShowDialog(true);
  };

  const handleDelete = async (e: React.MouseEvent, series: Series) => {
    e.stopPropagation();
    const shouldDelete = await confirm({
      title: "Delete series?",
      description: `This will permanently remove "${series.name}" and its settings.`,
      confirmLabel: "Delete series",
      variant: "destructive",
    });
    if (!shouldDelete) return;
    try {
      await deleteSeries.mutateAsync(series.id);
    } catch (error) {
      console.error("Failed to delete series:", error);
      showError("Failed to delete series. Please try again.");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const data = {
        name: formData.name,
        description: formData.description || undefined,
        banner_image_url: formData.banner_image_url || undefined,
        is_public: formData.is_public,
      };
      await createSeries.mutateAsync(data);
      setShowDialog(false);
      setFormData({
        name: "",
        description: "",
        banner_image_url: "",
        is_public: true,
      });
    } catch (error) {
      console.error("Failed to save series:", error);
      showError("Failed to save series. Please try again.");
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNavigate = (seriesId: number) => {
    navigate({ to: `/admin/series/${seriesId}` });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-turf" />
            <h2 className="text-xl font-semibold text-charcoal">Series</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-charcoal/60">Loading...</span>
            {canCreate && (
              <Button
                onClick={handleCreate}
                className="flex items-center gap-2 h-9 px-3 rounded-md text-sm"
              >
                <Plus className="h-4 w-4" />
                Add Series
              </Button>
            )}
          </div>
        </div>
        <div className="bg-white border border-soft-grey rounded-lg overflow-hidden">
          <div className="divide-y divide-soft-grey">
            {[...Array(3)].map((_, i) => (
              <SeriesSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-turf" />
            <h2 className="text-xl font-semibold text-charcoal">Series</h2>
          </div>
          {canCreate && (
            <Button onClick={handleCreate} className="flex items-center gap-2 h-9 px-3 rounded-md text-sm">
              <Plus className="h-4 w-4" />
              Add Series
            </Button>
          )}
        </div>
        <div className="border border-flag/30 bg-flag/5 rounded-lg p-4">
          <div className="flex items-center gap-2 text-flag">
            <Trophy className="h-4 w-4" />
            <p className="text-sm font-semibold">Error loading series</p>
          </div>
          <p className="text-sm text-flag/80 mt-2">
            Please try refreshing the page or contact support if the problem persists.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-turf" />
            <h2 className="text-xl font-semibold text-charcoal">Series</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-charcoal/60">{pagination.pageInfo}</span>
            {canCreate && (
              <Button onClick={handleCreate} className="flex items-center gap-2 h-9 px-3 rounded-md text-sm">
                <Plus className="h-4 w-4" />
                Add Series
              </Button>
            )}
          </div>
        </div>

        {!series || series.length === 0 ? (
          <div className="border border-soft-grey rounded-lg bg-white px-6 py-10 text-center">
            <h3 className="text-sm font-semibold text-charcoal mb-2">
              No series yet
            </h3>
            <p className="text-sm text-charcoal/60">
              Create a series to organize multiple competitions into tournaments.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white border border-soft-grey rounded-lg overflow-hidden">
              <div className="grid grid-cols-[minmax(200px,2fr)_140px_140px_120px] gap-4 px-4 py-2 text-xs font-semibold text-charcoal/70 uppercase tracking-wide border-b border-soft-grey bg-soft-grey/30">
                <div>Series</div>
                <div>Visibility</div>
                <div>Assets</div>
                <div className="text-right">Actions</div>
              </div>
              <div className="divide-y divide-soft-grey">
                {pagination.paginatedItems.map((seriesItem) => (
                  <div
                    key={seriesItem.id}
                    className="grid grid-cols-[minmax(200px,2fr)_140px_140px_120px] gap-4 px-4 py-2 text-sm items-center hover:bg-rough/20 cursor-pointer"
                    onClick={() => handleNavigate(seriesItem.id)}
                  >
                    <div>
                      <div className="font-medium text-charcoal">{seriesItem.name}</div>
                      <div className="text-xs text-charcoal/60">ID #{seriesItem.id}</div>
                      {seriesItem.description && (
                        <div className="text-sm text-charcoal/60 line-clamp-1">
                          {seriesItem.description}
                        </div>
                      )}
                    </div>
                    <div
                      className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide ${
                        seriesItem.is_public ? "text-turf" : "text-charcoal/60"
                      }`}
                    >
                      {seriesItem.is_public ? (
                        <Eye className="h-3 w-3" />
                      ) : (
                        <EyeOff className="h-3 w-3" />
                      )}
                      {seriesItem.is_public ? "Public" : "Private"}
                    </div>
                    <div className="text-sm text-charcoal/60">
                      {seriesItem.banner_image_url ? (
                        <span className="inline-flex items-center gap-1">
                          <Image className="h-3 w-3" />
                          Banner
                        </span>
                      ) : (
                        "-"
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, seriesItem)}
                        className="h-8 w-8 rounded-md text-flag hover:text-flag hover:bg-flag/10 transition-colors"
                        title="Delete series"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pagination Controls */}
            <PaginationControls
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={pagination.setCurrentPage}
            />
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Series</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Series Name
              </label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter series name"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Enter series description (optional)"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="banner_image_url" className="text-sm font-medium">
                Banner Image URL
              </label>
              <Input
                id="banner_image_url"
                name="banner_image_url"
                type="url"
                value={formData.banner_image_url}
                onChange={handleInputChange}
                placeholder="https://example.com/banner.jpg (optional)"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_public: checked }))
                }
              />
              <label htmlFor="is_public" className="text-sm font-medium">
                Public series (visible to players)
              </label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {dialog}
    </>
  );
}

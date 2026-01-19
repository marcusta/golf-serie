import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Trash2, Trophy, Globe, Lock, Users, Calculator } from "lucide-react";
import {
  useTours,
  useCreateTour,
  useDeleteTour,
  type TourEnrollmentMode,
  type TourVisibility,
  type TourScoringMode,
} from "../../api/tours";
import { useAuth } from "../../hooks/useAuth";
import { useNotification, formatErrorMessage } from "@/hooks/useNotification";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

function ToursSkeleton() {
  return (
    <div className="grid grid-cols-[minmax(220px,2fr)_140px_140px_140px_120px] gap-4 px-4 py-2 items-center">
      <div className="space-y-2">
        <Skeleton className="h-4 w-[240px]" />
        <Skeleton className="h-3 w-[320px]" />
      </div>
      <Skeleton className="h-3 w-[90px]" />
      <Skeleton className="h-3 w-[90px]" />
      <Skeleton className="h-3 w-[90px]" />
      <div className="flex justify-end gap-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </div>
  );
}

export default function Tours() {
  const navigate = useNavigate();
  const { canCreate } = useAuth();
  const { showError } = useNotification();
  const { data: tours, isLoading, error } = useTours();
  const createMutation = useCreateTour();
  const deleteMutation = useDeleteTour();
  const { confirm, dialog } = useConfirmDialog();

  const [showDialog, setShowDialog] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [enrollmentMode, setEnrollmentMode] = useState<TourEnrollmentMode>("closed");
  const [visibility, setVisibility] = useState<TourVisibility>("private");
  const [scoringMode, setScoringMode] = useState<TourScoringMode>("gross");
  const [formError, setFormError] = useState<string | null>(null);

  const pagination = usePagination(tours, { pageSize: 100 });

  const openCreate = () => {
    setName("");
    setDescription("");
    setEnrollmentMode("closed");
    setVisibility("private");
    setScoringMode("gross");
    setFormError(null);
    setShowDialog(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      await createMutation.mutateAsync({
        name,
        description: description || undefined,
        enrollment_mode: enrollmentMode,
        visibility,
        scoring_mode: scoringMode,
      });
      setShowDialog(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Operation failed");
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const shouldDelete = await confirm({
      title: "Delete tour?",
      description: "This will permanently remove the tour and its settings.",
      confirmLabel: "Delete tour",
      variant: "destructive",
    });
    if (!shouldDelete) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      showError(formatErrorMessage(err, "Delete failed"));
    }
  };

  const handleNavigate = (tourId: number) => {
    navigate({ to: `/admin/tours/${tourId}` });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-turf" />
            <h2 className="text-xl font-semibold text-charcoal">Tours</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-charcoal/60">Loading...</span>
            {canCreate && (
              <Button
                onClick={openCreate}
                className="flex items-center gap-2 h-9 px-3 rounded-md text-sm"
              >
                <Plus className="h-4 w-4" />
                Add Tour
              </Button>
            )}
          </div>
        </div>
        <div className="bg-white border border-soft-grey rounded-lg overflow-hidden">
          <div className="divide-y divide-soft-grey">
            {[...Array(3)].map((_, i) => (
              <ToursSkeleton key={i} />
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
            <h2 className="text-xl font-semibold text-charcoal">Tours</h2>
          </div>
          {canCreate && (
            <Button onClick={openCreate} className="flex items-center gap-2 h-9 px-3 rounded-md text-sm">
              <Plus className="h-4 w-4" />
              Add Tour
            </Button>
          )}
        </div>
        <div className="border border-flag/30 bg-flag/5 rounded-lg p-4">
          <div className="flex items-center gap-2 text-flag">
            <Trophy className="h-4 w-4" />
            <p className="text-sm font-semibold">Error loading tours</p>
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
            <h2 className="text-xl font-semibold text-charcoal">Tours</h2>
          </div>
          <div className="flex items-center gap-3">
            {tours && tours.length > 0 && (
              <span className="text-sm text-charcoal/60">{pagination.pageInfo}</span>
            )}
            {canCreate && (
              <Button onClick={openCreate} className="flex items-center gap-2 h-9 px-3 rounded-md text-sm">
                <Plus className="h-4 w-4" />
                Add Tour
              </Button>
            )}
          </div>
        </div>

        {!tours || tours.length === 0 ? (
          <div className="border border-soft-grey rounded-lg bg-white px-6 py-10 text-center">
            <h3 className="text-sm font-semibold text-charcoal mb-2">
              No tours yet
            </h3>
            <p className="text-sm text-charcoal/60">
              Create a tour to manage enrollment, points, and standings.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white border border-soft-grey rounded-lg overflow-hidden">
              <div className="grid grid-cols-[minmax(220px,2fr)_140px_140px_140px_120px] gap-4 px-4 py-2 text-xs font-semibold text-charcoal/70 uppercase tracking-wide border-b border-soft-grey bg-soft-grey/30">
                <div>Tour</div>
                <div>Visibility</div>
                <div>Enrollment</div>
                <div>Scoring</div>
                <div className="text-right">Actions</div>
              </div>
              <div className="divide-y divide-soft-grey">
                {pagination.paginatedItems.map((tour) => (
                  <div
                    key={tour.id}
                    className="grid grid-cols-[minmax(220px,2fr)_140px_140px_140px_120px] gap-4 px-4 py-2 text-sm items-center hover:bg-rough/20 cursor-pointer"
                    onClick={() => handleNavigate(tour.id)}
                  >
                    <div>
                      <div className="font-medium text-charcoal">{tour.name}</div>
                      <div className="text-xs text-charcoal/60">ID #{tour.id}</div>
                      {tour.description && (
                        <div className="text-sm text-charcoal/60 line-clamp-1">
                          {tour.description}
                        </div>
                      )}
                    </div>
                    <div
                      className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide ${
                        tour.visibility === "public" ? "text-turf" : "text-charcoal/60"
                      }`}
                    >
                      {tour.visibility === "public" ? (
                        <Globe className="h-3 w-3" />
                      ) : (
                        <Lock className="h-3 w-3" />
                      )}
                      {tour.visibility === "public" ? "Public" : "Private"}
                    </div>
                    <div
                      className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide ${
                        tour.enrollment_mode === "request" ? "text-sky" : "text-charcoal/60"
                      }`}
                    >
                      <Users className="h-3 w-3" />
                      {tour.enrollment_mode === "request" ? "Requests" : "Closed"}
                    </div>
                    <div className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-charcoal/60">
                      <Calculator className="h-3 w-3" />
                      {tour.scoring_mode}
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, tour.id)}
                        className="h-8 w-8 rounded-md text-flag hover:text-flag hover:bg-flag/10 transition-colors"
                        title="Delete tour"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <PaginationControls
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={pagination.setCurrentPage}
            />
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Tour</DialogTitle>
          </DialogHeader>
          {formError && (
            <div className="border border-flag/30 bg-flag/5 rounded-md px-3 py-2 text-sm text-flag">
              {formError}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="tour-name" className="text-sm font-medium">
                Tour Name
              </label>
              <Input
                id="tour-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="PGA Tour 2024"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="tour-description" className="text-sm font-medium">
                Description
              </label>
              <Textarea
                id="tour-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A description of this tour (optional)"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Visibility</label>
                <Select
                  value={visibility}
                  onValueChange={(value) => setVisibility(value as TourVisibility)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private</SelectItem>
                    <SelectItem value="public">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Enrollment</label>
                <Select
                  value={enrollmentMode}
                  onValueChange={(value) => setEnrollmentMode(value as TourEnrollmentMode)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select enrollment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="closed">Admin only</SelectItem>
                    <SelectItem value="request">Requests</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Scoring</label>
                <Select
                  value={scoringMode}
                  onValueChange={(value) => setScoringMode(value as TourScoringMode)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select scoring" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gross">Gross</SelectItem>
                    <SelectItem value="net">Net</SelectItem>
                    <SelectItem value="both">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                Create Tour
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {dialog}
    </>
  );
}

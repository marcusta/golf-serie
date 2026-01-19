import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useDeleteCompetition, type Competition } from "@/api/competitions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import {
  SeriesCompetitionList,
  SeriesCompetitionModal,
} from "@/components/admin/series";
import { useNotification } from "@/hooks/useNotification";

interface SeriesCompetitionsTabProps {
  seriesId: number;
}

export function SeriesCompetitionsTab({ seriesId }: SeriesCompetitionsTabProps) {
  const queryClient = useQueryClient();
  const { showError } = useNotification();
  const deleteCompetition = useDeleteCompetition();

  const [showCompetitionModal, setShowCompetitionModal] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [deletingCompetition, setDeletingCompetition] = useState<Competition | null>(null);

  const handleEditCompetition = (competition: Competition) => {
    setEditingCompetition(competition);
    setShowCompetitionModal(true);
  };

  const handleDeleteCompetitionClick = (competition: Competition) => {
    setDeletingCompetition(competition);
  };

  const handleConfirmDeleteCompetition = async () => {
    if (!deletingCompetition) return;
    try {
      await deleteCompetition.mutateAsync(deletingCompetition.id);
      queryClient.invalidateQueries({ queryKey: ["series", seriesId, "competitions"] });
      setDeletingCompetition(null);
    } catch (error) {
      console.error("Failed to delete competition:", error);
      showError("Failed to delete competition. Please try again.");
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Competitions</h2>
          <Button
            onClick={() => {
              setEditingCompetition(null);
              setShowCompetitionModal(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Competition
          </Button>
        </div>
        <SeriesCompetitionList
          seriesId={seriesId}
          onEdit={handleEditCompetition}
          onDelete={handleDeleteCompetitionClick}
        />
      </div>

      {/* Competition Modal */}
      <SeriesCompetitionModal
        seriesId={seriesId}
        open={showCompetitionModal}
        onOpenChange={(open) => {
          setShowCompetitionModal(open);
          if (!open) setEditingCompetition(null);
        }}
        competition={editingCompetition}
      />

      {/* Delete Competition Confirmation */}
      <Dialog
        open={!!deletingCompetition}
        onOpenChange={(open) => !open && setDeletingCompetition(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Competition</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingCompetition?.name}"? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingCompetition(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDeleteCompetition}
              disabled={deleteCompetition.isPending}
            >
              {deleteCompetition.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

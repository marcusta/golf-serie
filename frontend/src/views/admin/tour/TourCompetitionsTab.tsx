import { useState } from "react";
import { Plus } from "lucide-react";
import {
  useTourCompetitions,
  type TourCompetition,
} from "../../../api/tours";
import { useDeleteCompetition, useCompetition } from "../../../api/competitions";
import {
  TourCompetitionList,
  TourCompetitionModal,
} from "../../../components/admin/tour";
import { useNotification, formatErrorMessage } from "@/hooks/useNotification";

interface TourCompetitionsTabProps {
  tourId: number;
}

export function TourCompetitionsTab({ tourId }: TourCompetitionsTabProps) {
  const { showError } = useNotification();
  const [showCompetitionModal, setShowCompetitionModal] = useState(false);
  const [editingCompetitionId, setEditingCompetitionId] = useState<number | null>(null);

  const { data: competitions } = useTourCompetitions(tourId);
  const { data: editingCompetition } = useCompetition(editingCompetitionId || 0);
  const deleteCompetitionMutation = useDeleteCompetition();

  const handleEditCompetition = (competition: TourCompetition) => {
    setEditingCompetitionId(competition.id);
    setShowCompetitionModal(true);
  };

  const handleDeleteCompetition = async (competition: TourCompetition) => {
    if (confirm(`Are you sure you want to delete "${competition.name}"?`)) {
      try {
        await deleteCompetitionMutation.mutateAsync(competition.id);
      } catch (err) {
        showError(formatErrorMessage(err, "Failed to delete competition"));
      }
    }
  };

  const handleAddCompetition = () => {
    setEditingCompetitionId(null);
    setShowCompetitionModal(true);
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-charcoal">Competitions</h2>
            {competitions && competitions.length > 0 && (
              <p className="text-sm text-charcoal/60 mt-1">
                {competitions.length} competition{competitions.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          <button
            onClick={handleAddCompetition}
            className="flex items-center gap-2 px-4 py-2 bg-fairway text-white rounded-lg hover:bg-turf transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Competition
          </button>
        </div>

        <TourCompetitionList
          tourId={tourId}
          onEdit={handleEditCompetition}
          onDelete={handleDeleteCompetition}
        />
      </div>

      <TourCompetitionModal
        tourId={tourId}
        open={showCompetitionModal}
        onOpenChange={(open) => {
          setShowCompetitionModal(open);
          if (!open) {
            setEditingCompetitionId(null);
          }
        }}
        competition={editingCompetition}
      />
    </>
  );
}

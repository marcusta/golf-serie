import { useTourCompetitions, type TourCompetition } from "../../../api/tours";
import { CompetitionList } from "../shared/CompetitionList";

export interface TourCompetitionListProps {
  tourId: number;
  onEdit: (competition: TourCompetition) => void;
  onDelete: (competition: TourCompetition) => void;
}

/**
 * Competition list for tour context.
 * Thin wrapper around the shared CompetitionList component.
 */
export function TourCompetitionList({
  tourId,
  onEdit,
  onDelete,
}: TourCompetitionListProps) {
  const { data: competitions, isLoading } = useTourCompetitions(tourId);

  return (
    <CompetitionList
      competitions={competitions}
      isLoading={isLoading}
      parentType="tour"
      onEdit={onEdit}
      onDelete={onDelete}
      showManualScoreEntry={false}
    />
  );
}

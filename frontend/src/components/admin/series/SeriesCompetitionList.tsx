import { useSeriesCompetitions } from "../../../api/series";
import { CompetitionList } from "../shared/CompetitionList";
import type { Competition } from "../../../api/competitions";

export interface SeriesCompetitionListProps {
  seriesId: number;
  onEdit: (competition: Competition) => void;
  onDelete: (competition: Competition) => void;
}

/**
 * Competition list for series context.
 * Thin wrapper around the shared CompetitionList component.
 */
export function SeriesCompetitionList({
  seriesId,
  onEdit,
  onDelete,
}: SeriesCompetitionListProps) {
  const { data: competitions, isLoading } = useSeriesCompetitions(seriesId);

  return (
    <CompetitionList
      competitions={competitions}
      isLoading={isLoading}
      parentType="series"
      onEdit={onEdit}
      onDelete={onDelete}
      showManualScoreEntry={true}
    />
  );
}

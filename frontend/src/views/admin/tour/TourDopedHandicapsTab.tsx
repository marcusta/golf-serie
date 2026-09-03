import { useTourDopedHandicaps } from "../../../api/tours";
import { formatSignedDecimal } from "@/utils/formatSignedDecimal";
import { Skeleton } from "@/components/ui/skeleton";

interface TourDopedHandicapsTabProps {
  tourId: number;
}

/**
 * Read-only table of the current doped handicap per player.
 * Values come from the live calculation, not from frozen participant values.
 */
export function TourDopedHandicapsTab({ tourId }: TourDopedHandicapsTabProps) {
  const { data, isLoading, error } = useTourDopedHandicaps(tourId);

  return (
    <div className="bg-white border border-soft-grey rounded-lg p-4">
      <div className="text-sm font-semibold uppercase tracking-wide text-charcoal mb-1">
        Doped handicaps
      </div>
      <p className="text-xs text-charcoal/60 mb-4">
        Average strokes over 18 holes each player has played worse than their
        handicap in this tour. Frozen per competition when scoring starts or
        when an admin freezes them.
      </p>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      )}

      {error && (
        <p className="text-sm text-flag">Failed to load doped handicaps.</p>
      )}

      {data && data.length === 0 && (
        <p className="text-sm text-charcoal/60">No players yet.</p>
      )}

      {data && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-charcoal/70 border-b border-soft-grey">
                <th className="py-2 pr-4">Player</th>
                <th className="py-2 pr-4 text-right">Doped handicap</th>
                <th className="py-2 text-right">Rounds</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-soft-grey">
              {data.map((row) => (
                <tr key={row.player_id} className="hover:bg-turf/5 transition-colors">
                  <td className="py-2 pr-4 font-medium text-charcoal">
                    {row.player_name}
                  </td>
                  <td className="py-2 pr-4 text-right font-mono text-charcoal">
                    {formatSignedDecimal(row.doped_handicap)}
                  </td>
                  <td className="py-2 text-right text-charcoal/70">
                    {row.rounds_counted}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

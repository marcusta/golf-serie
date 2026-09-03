import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFinalizeWithCheck } from "@/hooks/useFinalizeWithCheck";
import { FreezeDopedHandicapsButton } from "./FreezeDopedHandicapsButton";

interface Competition {
  id: number;
  name: string;
  is_results_final?: boolean;
  results_finalized_at?: string;
  use_doped_handicap?: boolean;
}

interface CompetitionHeaderProps {
  competition: Competition;
  // True when at least one participant already has a frozen doped handicap
  hasFrozenDopedValues?: boolean;
}

export function CompetitionHeader({
  competition,
  hasFrozenDopedValues = false,
}: CompetitionHeaderProps) {
  const { requestFinalize, dialog, isPending } = useFinalizeWithCheck();

  const handleFinalize = () => requestFinalize(competition.id);
  const handleRefinalize = () => requestFinalize(competition.id, { refinalize: true });

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            Manage Tee Times - {competition.name}
          </h2>
          <p className="text-gray-600">
            Set up participant types and create tee times
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {competition.use_doped_handicap && (
            <FreezeDopedHandicapsButton
              competitionId={competition.id}
              hasFrozenValues={hasFrozenDopedValues}
            />
          )}
          {competition.is_results_final ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <span className="text-green-800 font-medium">Results Finalized</span>
                  {competition.results_finalized_at && (
                    <p className="text-xs text-green-600">
                      {new Date(competition.results_finalized_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleRefinalize}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Re-finalize"
                )}
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleFinalize}
              disabled={isPending}
              className="flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Finalizing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Finalize Results
                </>
              )}
            </Button>
          )}
        </div>
      </div>
      {dialog}
    </>
  );
}

export default CompetitionHeader;

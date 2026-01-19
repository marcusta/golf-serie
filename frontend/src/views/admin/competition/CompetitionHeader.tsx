import { CheckCircle, Loader2 } from "lucide-react";
import { useFinalizeCompetitionResults } from "../../../api/competitions";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

interface Competition {
  id: number;
  name: string;
  is_results_final?: boolean;
  results_finalized_at?: string;
}

interface CompetitionHeaderProps {
  competition: Competition;
}

export function CompetitionHeader({ competition }: CompetitionHeaderProps) {
  const finalizeResults = useFinalizeCompetitionResults();
  const { confirm, dialog } = useConfirmDialog();

  const handleFinalize = async () => {
    const shouldFinalize = await confirm({
      title: "Finalize results?",
      description: "This will calculate and store the final standings and points. You can re-finalize later if needed.",
      confirmLabel: "Finalize results",
    });
    if (!shouldFinalize) return;
    finalizeResults.mutate(competition.id);
  };

  const handleRefinalize = async () => {
    const shouldRefinalize = await confirm({
      title: "Re-finalize results?",
      description: "This will recalculate standings and points based on current scores.",
      confirmLabel: "Re-finalize results",
    });
    if (!shouldRefinalize) return;
    finalizeResults.mutate(competition.id);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Manage Tee Times - {competition.name}
          </h2>
          <p className="text-gray-600">
            Set up participant types and create tee times
          </p>
        </div>
        <div className="flex items-center gap-3">
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
                disabled={finalizeResults.isPending}
              >
                {finalizeResults.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Re-finalize"
                )}
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleFinalize}
              disabled={finalizeResults.isPending}
              className="flex items-center gap-2"
            >
              {finalizeResults.isPending ? (
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

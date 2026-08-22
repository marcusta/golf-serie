import { useCallback } from "react";
import {
  fetchFinalizeCheck,
  useFinalizeCompetitionResults,
} from "@/api/competitions";
import type { UnfinishedParticipant } from "@/api/competitions";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

export function describeUnfinished(p: UnfinishedParticipant): string {
  if (p.holes_played === p.expected_holes && !p.is_locked) {
    return `${p.player_name} (all ${p.expected_holes} holes scored, scorecard not locked)`;
  }
  return `${p.player_name} (${p.holes_played} of ${p.expected_holes} holes scored)`;
}

export function buildFinalizeDescription(
  base: string,
  unfinished: UnfinishedParticipant[] | null
): string {
  if (unfinished === null) {
    return `${base}\n\nCould not check whether all scorecards are finished.`;
  }
  if (unfinished.length === 0) {
    return base;
  }
  const lines = unfinished.map((p) => `\u2022 ${describeUnfinished(p)}`).join("\n");
  return (
    `${base}\n\n` +
    `Warning: ${unfinished.length} player${unfinished.length === 1 ? "" : "s"} ` +
    `will get no result or points because their scores are not finished:\n${lines}\n\n` +
    `Lock their scorecards or complete the missing holes first, then finalize.`
  );
}

/**
 * Finalize (or re-finalize) a competition after confirming with the admin.
 * The confirm dialog lists players whose scores are not finished, since
 * finalize excludes them from results and points.
 */
export function useFinalizeWithCheck() {
  const finalizeResults = useFinalizeCompetitionResults();
  const { confirm, dialog } = useConfirmDialog();

  const requestFinalize = useCallback(
    async (competitionId: number, options: { refinalize?: boolean } = {}) => {
      let unfinished: UnfinishedParticipant[] | null = null;
      try {
        unfinished = await fetchFinalizeCheck(competitionId);
      } catch {
        unfinished = null;
      }

      const refinalize = options.refinalize === true;
      const base = refinalize
        ? "This will recalculate standings and points based on current scores."
        : "This will calculate and store the final standings and points. You can re-finalize later if needed.";
      const hasWarning = unfinished === null || unfinished.length > 0;

      const shouldFinalize = await confirm({
        title: refinalize ? "Re-finalize results?" : "Finalize results?",
        description: buildFinalizeDescription(base, unfinished),
        confirmLabel: hasWarning
          ? refinalize
            ? "Re-finalize anyway"
            : "Finalize anyway"
          : refinalize
          ? "Re-finalize results"
          : "Finalize results",
        variant: hasWarning ? "destructive" : "default",
      });
      if (!shouldFinalize) return;
      finalizeResults.mutate(competitionId);
    },
    [confirm, finalizeResults]
  );

  return { requestFinalize, dialog, isPending: finalizeResults.isPending };
}

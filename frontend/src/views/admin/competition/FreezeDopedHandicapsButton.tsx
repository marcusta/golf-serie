import { Loader2, Snowflake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFreezeDopedHandicaps } from "@/api/competitions";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useNotification, formatErrorMessage } from "@/hooks/useNotification";

interface FreezeDopedHandicapsButtonProps {
  competitionId: number;
  // True when at least one participant already has a frozen value
  hasFrozenValues: boolean;
}

/**
 * Freezes the doped handicap on every participant of the competition.
 * When values already exist the admin must confirm an overwrite (force).
 */
export function FreezeDopedHandicapsButton({
  competitionId,
  hasFrozenValues,
}: FreezeDopedHandicapsButtonProps) {
  const freezeMutation = useFreezeDopedHandicaps();
  const { confirm, dialog } = useConfirmDialog();
  const { showSuccess, showError } = useNotification();

  const handleClick = async () => {
    const force = hasFrozenValues;
    const ok = await confirm({
      title: force ? "Overwrite doped handicaps?" : "Freeze doped handicaps?",
      description: force
        ? "Some participants already have a frozen doped handicap. Freezing again replaces every value with the current calculation. Scorecards already finished in this round count, unless the round is excluded from the calculation."
        : "Stores the current doped handicap on every participant in this competition. Participants that already have a value keep it. Scorecards already finished in this round count, unless the round is excluded from the calculation.",
      confirmLabel: force ? "Overwrite all" : "Freeze",
      variant: force ? "destructive" : "default",
    });
    if (!ok) return;

    try {
      const result = await freezeMutation.mutateAsync({ competitionId, force });
      showSuccess(
        `Froze doped handicap for ${result.updated} participant${
          result.updated === 1 ? "" : "s"
        }`
      );
    } catch (err) {
      showError(formatErrorMessage(err, "Failed to freeze doped handicaps"));
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={handleClick}
        disabled={freezeMutation.isPending}
        className="flex items-center gap-2"
      >
        {freezeMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Snowflake className="h-4 w-4" />
        )}
        {hasFrozenValues ? "Re-freeze doped handicaps" : "Freeze doped handicaps"}
      </Button>
      {dialog}
    </>
  );
}

export default FreezeDopedHandicapsButton;

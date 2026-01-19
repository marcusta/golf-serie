import { useState } from "react";
import type { TeeTime } from "../../../api/tee-times";
import { useUpdateTeeTime } from "../../../api/tee-times";
import { useNotification } from "@/hooks/useNotification";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BulkStartHoleSetterProps {
  teeTimes: TeeTime[] | undefined;
  onRefetch: () => void;
}

export function BulkStartHoleSetter({
  teeTimes,
  onRefetch,
}: BulkStartHoleSetterProps) {
  const [bulkStartHole, setBulkStartHole] = useState<number>(1);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const updateTeeTimeMutation = useUpdateTeeTime();
  const { showError } = useNotification();
  const { confirm, dialog } = useConfirmDialog();

  const handleApplyToAll = async () => {
    if (!teeTimes || teeTimes.length === 0) return;
    const shouldApply = await confirm({
      title: "Apply start hole?",
      description: `Set start hole to ${bulkStartHole} for all ${teeTimes.length} tee times?`,
      confirmLabel: "Apply to all",
    });
    if (!shouldApply) return;

    setIsBulkUpdating(true);
    try {
      await Promise.all(
        teeTimes.map((tt) =>
          updateTeeTimeMutation.mutateAsync({
            id: tt.id,
            data: { start_hole: bulkStartHole },
          })
        )
      );
      await onRefetch();
    } catch (err) {
      console.error(err);
      showError(
        "Failed to update start hole for all tee times. Please try again."
      );
    } finally {
      setIsBulkUpdating(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h4 className="text-md font-semibold text-gray-900 mb-3">
        Apply Start Hole To All Tee Times
      </h4>
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-700">Start hole for all:</label>
        <Select
          value={bulkStartHole.toString()}
          onValueChange={(value) => setBulkStartHole(parseInt(value))}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Select hole" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Hole 1</SelectItem>
            <SelectItem value="10">Hole 10</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={handleApplyToAll}
          disabled={
            isBulkUpdating ||
            updateTeeTimeMutation.isPending ||
            !teeTimes ||
            teeTimes.length === 0
          }
        >
          {isBulkUpdating ? "Applying..." : "Apply to All"}
        </Button>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Useful when shotgun start is determined after tee times are created.
      </p>
      </div>
      {dialog}
    </>
  );
}

export default BulkStartHoleSetter;

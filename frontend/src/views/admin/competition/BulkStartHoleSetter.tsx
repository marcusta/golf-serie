import { useState } from "react";
import type { TeeTime } from "../../../api/tee-times";
import { useUpdateTeeTime } from "../../../api/tee-times";
import { useNotification } from "@/hooks/useNotification";
import { Button } from "@/components/ui/button";

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

  const handleApplyToAll = async () => {
    if (!teeTimes || teeTimes.length === 0) return;
    if (
      !confirm(
        `Set start hole to ${bulkStartHole} for all ${teeTimes.length} tee times?`
      )
    )
      return;

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
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h4 className="text-md font-semibold text-gray-900 mb-3">
        Apply Start Hole To All Tee Times
      </h4>
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-700">Start hole for all:</label>
        <select
          value={bulkStartHole}
          onChange={(e) => setBulkStartHole(parseInt(e.target.value))}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={1}>Hole 1</option>
          <option value={10}>Hole 10</option>
        </select>
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
  );
}

export default BulkStartHoleSetter;

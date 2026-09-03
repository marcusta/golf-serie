import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useUpdateParticipantHandicap } from "../api/participants";

interface EditParticipantHandicapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participantId: number;
  participantName: string;
  currentHandicap?: number;
  // Show the doped handicap field (competitions with use_doped_handicap)
  showDopedHandicap?: boolean;
  currentDopedHandicap?: number | null;
}

export function EditParticipantHandicapDialog({
  open,
  onOpenChange,
  participantId,
  participantName,
  currentHandicap,
  showDopedHandicap = false,
  currentDopedHandicap,
}: EditParticipantHandicapDialogProps) {
  const [handicapValue, setHandicapValue] = useState("");
  const [dopedValue, setDopedValue] = useState("");
  const updateHandicapMutation = useUpdateParticipantHandicap();

  useEffect(() => {
    if (open) {
      setHandicapValue(currentHandicap?.toString() ?? "");
      setDopedValue(currentDopedHandicap?.toString() ?? "");
    }
  }, [open, currentHandicap, currentDopedHandicap]);

  const handleSave = async () => {
    const parsedValue = handicapValue.trim() === "" ? null : parseFloat(handicapValue);

    if (parsedValue !== null && isNaN(parsedValue)) {
      alert("Please enter a valid number");
      return;
    }

    let parsedDoped: number | null | undefined = undefined;
    if (showDopedHandicap) {
      parsedDoped = dopedValue.trim() === "" ? null : parseFloat(dopedValue);
      if (parsedDoped !== null && isNaN(parsedDoped)) {
        alert("Please enter a valid doped handicap");
        return;
      }
    }

    try {
      await updateHandicapMutation.mutateAsync({
        id: participantId,
        handicap_index: parsedValue,
        doped_handicap: parsedDoped,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update handicap:", error);
      alert("Failed to update handicap. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Round Handicap</DialogTitle>
          <DialogDescription>
            Update the handicap index for {participantName} for this round only.
            This will not affect their profile handicap.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label
              htmlFor="handicap"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Handicap Index
            </label>
            <Input
              id="handicap"
              type="number"
              step="0.1"
              min="-10"
              max="54"
              placeholder="e.g., 12.4"
              value={handicapValue}
              onChange={(e) => setHandicapValue(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">
              Leave empty to clear the handicap for this round.
            </p>
          </div>
          {showDopedHandicap && (
            <div>
              <label
                htmlFor="doped-handicap"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Doped handicap
              </label>
              <Input
                id="doped-handicap"
                type="number"
                step="0.1"
                placeholder="e.g., 5.2"
                value={dopedValue}
                onChange={(e) => setDopedValue(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">
                Strokes over 18 holes added on the doped leaderboard. Leave
                empty to mark it as not frozen.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateHandicapMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateHandicapMutation.isPending}
          >
            {updateHandicapMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useAdminSetDQ } from "../../api/participants";
import { useNotification, formatErrorMessage } from "@/hooks/useNotification";

interface AdminDQDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participantId: number;
  participantName: string;
  currentlyDQ: boolean;
}

export function AdminDQDialog({
  open,
  onOpenChange,
  participantId,
  participantName,
  currentlyDQ,
}: AdminDQDialogProps) {
  const [adminNotes, setAdminNotes] = useState("");
  const setDQMutation = useAdminSetDQ();
  const { showError } = useNotification();

  useEffect(() => {
    if (open) {
      setAdminNotes("");
    }
  }, [open]);

  const handleConfirm = async () => {
    try {
      await setDQMutation.mutateAsync({
        id: participantId,
        is_dq: !currentlyDQ, // Toggle the DQ status
        admin_notes: adminNotes || undefined,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update DQ status:", error);
      showError(formatErrorMessage(error, "Failed to update DQ status"));
    }
  };

  const action = currentlyDQ ? "Remove DQ" : "Disqualify";
  const actionVerb = currentlyDQ ? "removing DQ from" : "disqualifying";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {action} Player
          </DialogTitle>
          <DialogDescription>
            {currentlyDQ
              ? `Are you sure you want to remove the disqualification from ${participantName}? They will be eligible for scoring and points again.`
              : `Are you sure you want to disqualify ${participantName}? They will be shown as DQ on the leaderboard with no score or points.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason / Notes {!currentlyDQ && <span className="text-red-500">*</span>}
            </label>
            <Input
              type="text"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder={currentlyDQ ? "Reason for removing DQ..." : "Reason for disqualification..."}
              className="w-full"
            />
            <p className="mt-1 text-xs text-gray-500">
              This note will be saved for audit purposes.
            </p>
          </div>

          {!currentlyDQ && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> The player's scores will be kept for statistics and history,
                but they will not receive any points and will be shown as "DQ" on the leaderboard.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={setDQMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant={currentlyDQ ? "default" : "destructive"}
            onClick={handleConfirm}
            disabled={setDQMutation.isPending || (!currentlyDQ && !adminNotes.trim())}
          >
            {setDQMutation.isPending ? `${actionVerb}...` : action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

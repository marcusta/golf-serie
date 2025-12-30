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
import { useAdminUpdateScore } from "../../api/participants";

interface AdminEditScoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participantId: number;
  participantName: string;
  currentScore: number[];
  pars?: number[];
}

export function AdminEditScoreDialog({
  open,
  onOpenChange,
  participantId,
  participantName,
  currentScore,
  pars = [],
}: AdminEditScoreDialogProps) {
  const [scores, setScores] = useState<string[]>(Array(18).fill(""));
  const [adminNotes, setAdminNotes] = useState("");
  const updateScoreMutation = useAdminUpdateScore();

  useEffect(() => {
    if (open) {
      // Initialize scores from current score, converting 0 to empty and -1 to "X"
      setScores(
        currentScore.map((s) => (s === 0 ? "" : s === -1 ? "X" : s.toString()))
      );
      setAdminNotes("");
    }
  }, [open, currentScore]);

  const handleScoreChange = (index: number, value: string) => {
    const newScores = [...scores];
    // Allow empty, numbers, or "X" for DNF
    if (value === "" || value === "X" || value === "x" || /^\d+$/.test(value)) {
      newScores[index] = value.toUpperCase();
      setScores(newScores);
    }
  };

  const handleSave = async () => {
    // Convert string scores to numbers (empty = 0, X = -1)
    const numericScores = scores.map((s) => {
      if (s === "" || s === "0") return 0;
      if (s === "X") return -1;
      return parseInt(s, 10);
    });

    try {
      await updateScoreMutation.mutateAsync({
        id: participantId,
        score: numericScores,
        admin_notes: adminNotes || undefined,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update score:", error);
      alert(error instanceof Error ? error.message : "Failed to update score");
    }
  };

  // Calculate totals
  const outScores = scores.slice(0, 9);
  const inScores = scores.slice(9, 18);
  const outTotal = outScores.reduce((sum, s) => {
    const n = parseInt(s, 10);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);
  const inTotal = inScores.reduce((sum, s) => {
    const n = parseInt(s, 10);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);
  const totalScore = outTotal + inTotal;

  const outPar = pars.slice(0, 9).reduce((sum, p) => sum + p, 0);
  const inPar = pars.slice(9, 18).reduce((sum, p) => sum + p, 0);
  const totalPar = outPar + inPar;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Score</DialogTitle>
          <DialogDescription>
            Edit the scores for {participantName}. Enter "X" for gave up/DNF on a hole.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Front 9 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Front 9 (OUT)</h4>
            <div className="grid grid-cols-10 gap-1 text-center text-xs">
              {/* Hole numbers */}
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((hole) => (
                <div key={`hole-${hole}`} className="font-medium text-gray-500">
                  {hole}
                </div>
              ))}
              <div className="font-medium text-gray-700">OUT</div>

              {/* Pars */}
              {pars.length > 0 && (
                <>
                  {pars.slice(0, 9).map((par, i) => (
                    <div key={`par-${i}`} className="text-gray-400">
                      {par}
                    </div>
                  ))}
                  <div className="text-gray-500 font-medium">{outPar || "-"}</div>
                </>
              )}

              {/* Scores */}
              {outScores.map((score, i) => (
                <Input
                  key={`score-${i}`}
                  type="text"
                  value={score}
                  onChange={(e) => handleScoreChange(i, e.target.value)}
                  className="h-8 text-center p-1 text-sm"
                  maxLength={2}
                />
              ))}
              <div className="h-8 flex items-center justify-center font-medium bg-gray-100 rounded">
                {outTotal || "-"}
              </div>
            </div>
          </div>

          {/* Back 9 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Back 9 (IN)</h4>
            <div className="grid grid-cols-10 gap-1 text-center text-xs">
              {/* Hole numbers */}
              {[10, 11, 12, 13, 14, 15, 16, 17, 18].map((hole) => (
                <div key={`hole-${hole}`} className="font-medium text-gray-500">
                  {hole}
                </div>
              ))}
              <div className="font-medium text-gray-700">IN</div>

              {/* Pars */}
              {pars.length > 0 && (
                <>
                  {pars.slice(9, 18).map((par, i) => (
                    <div key={`par-${i + 9}`} className="text-gray-400">
                      {par}
                    </div>
                  ))}
                  <div className="text-gray-500 font-medium">{inPar || "-"}</div>
                </>
              )}

              {/* Scores */}
              {inScores.map((score, i) => (
                <Input
                  key={`score-${i + 9}`}
                  type="text"
                  value={score}
                  onChange={(e) => handleScoreChange(i + 9, e.target.value)}
                  className="h-8 text-center p-1 text-sm"
                  maxLength={2}
                />
              ))}
              <div className="h-8 flex items-center justify-center font-medium bg-gray-100 rounded">
                {inTotal || "-"}
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="flex justify-end items-center gap-4 pt-2 border-t">
            <span className="text-sm text-gray-600">
              Total: <span className="font-bold">{totalScore || "-"}</span>
              {totalPar > 0 && (
                <span className="text-gray-400 ml-1">
                  ({totalScore - totalPar >= 0 ? "+" : ""}
                  {totalScore - totalPar})
                </span>
              )}
            </span>
          </div>

          {/* Admin Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Notes (optional)
            </label>
            <Input
              type="text"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Reason for the change..."
              className="w-full"
            />
            <p className="mt-1 text-xs text-gray-500">
              This note will be saved for audit purposes.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateScoreMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateScoreMutation.isPending}
          >
            {updateScoreMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

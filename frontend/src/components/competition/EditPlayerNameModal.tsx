import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Participant {
  id: string;
  currentName: string | null;
  positionName: string;
}

interface EditPlayerNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (participantId: string, newName: string) => void;
  participant: Participant | null;
}

export function EditPlayerNameModal({
  isOpen,
  onClose,
  onSave,
  participant,
}: EditPlayerNameModalProps) {
  const [inputValue, setInputValue] = useState("");

  // Reset input value when participant changes
  useEffect(() => {
    if (participant) {
      setInputValue(participant.currentName || "");
    }
  }, [participant]);

  const handleSave = () => {
    if (!participant) return;

    // Trim whitespace and ensure we have a valid name
    const trimmedName = inputValue.trim();
    if (trimmedName.length === 0) return;

    onSave(participant.id, trimmedName);
  };

  const handleCancel = () => {
    // Reset to original value
    setInputValue(participant?.currentName || "");
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  if (!participant) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-50 z-50" />
        <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-scorecard rounded-xl p-6 w-full max-w-sm shadow-xl border border-soft-grey max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold text-fairway font-display">
                Edit Player Name
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  className="p-2 hover:bg-flag hover:bg-opacity-10 rounded-xl transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4 text-flag" />
                </button>
              </Dialog.Close>
            </div>

            {/* Position context */}
            <div className="mb-4">
              <p className="text-sm text-turf font-primary">
                Editing position:{" "}
                <span className="font-medium">{participant.positionName}</span>
              </p>
            </div>

            {/* Input field */}
            <div className="mb-6">
              <label
                htmlFor="player-name"
                className="block text-sm font-medium text-charcoal mb-2 font-primary"
              >
                Player Name
              </label>
              <input
                id="player-name"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full p-3 border-2 border-soft-grey rounded-xl text-charcoal font-primary focus:border-turf focus:bg-rough focus:bg-opacity-20 transition-colors outline-none"
                placeholder="Enter player name"
                autoFocus
              />
            </div>

            {/* Action buttons */}
            <div className="flex space-x-3">
              <button
                onClick={handleCancel}
                className="flex-1 p-3 bg-rough bg-opacity-30 text-fairway rounded-xl hover:bg-rough hover:bg-opacity-50 font-medium font-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={inputValue.trim().length === 0}
                className={cn(
                  "flex-1 p-3 rounded-xl font-medium font-primary transition-colors",
                  inputValue.trim().length > 0
                    ? "bg-turf text-scorecard hover:bg-fairway"
                    : "bg-soft-grey text-soft-grey cursor-not-allowed"
                )}
              >
                Save
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

import { useState } from "react";
import { Plus, Clock, Trash2 } from "lucide-react";
import { useCreateTeeTime } from "../../../api/tee-times";
import { useNotification } from "@/hooks/useNotification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

interface Wave {
  time: string;
  numberOfBays: number;
}

interface IndoorWaveManagerProps {
  competitionId: string;
  onRefetch: () => void;
}

export function IndoorWaveManager({
  competitionId,
  onRefetch,
}: IndoorWaveManagerProps) {
  const [waves, setWaves] = useState<Wave[]>([]);
  const [newWaveTime, setNewWaveTime] = useState("");
  const [newWaveNumberOfBays, setNewWaveNumberOfBays] = useState(1);
  const [isCreating, setIsCreating] = useState(false);

  const createTeeTimeMutation = useCreateTeeTime();
  const { showError } = useNotification();
  const { confirm, dialog } = useConfirmDialog();

  const handleAddWave = () => {
    if (!newWaveTime) return;
    setWaves([...waves, { time: newWaveTime, numberOfBays: newWaveNumberOfBays }]);
    setNewWaveTime("");
    setNewWaveNumberOfBays(1);
  };

  const handleRemoveWave = (index: number) => {
    setWaves(waves.filter((_, i) => i !== index));
  };

  const handleCreateTeeTimesFromWaves = async () => {
    if (!competitionId || waves.length === 0) return;

    const totalBays = waves.reduce((sum, wave) => sum + wave.numberOfBays, 0);
    const wavesList = waves.map(w => `${w.time} (${w.numberOfBays} bays)`).join(', ');

    const shouldCreate = await confirm({
      title: "Create bay slots?",
      description: `Create ${totalBays} bay slots from ${waves.length} wave(s)? ${wavesList}`,
      confirmLabel: "Create bay slots",
    });
    if (!shouldCreate) return;

    setIsCreating(true);
    try {
      // Create a tee_time record for each wave+bay combination
      for (const wave of waves) {
        for (let bay = 1; bay <= wave.numberOfBays; bay++) {
          await createTeeTimeMutation.mutateAsync({
            competitionId: parseInt(competitionId),
            teetime: wave.time,
            start_hole: 1, // Not used for indoor, but required
            hitting_bay: bay,
          });
        }
      }

      // Clear the waves UI state after creating
      setWaves([]);

      // Refresh tee times list
      await onRefetch();
    } catch (error) {
      console.error("Error creating tee times from waves:", error);
      showError("Failed to create tee times. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Define Wave Times and Bays
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Set up wave times and the number of bays for each wave. Participants will be assigned to specific bays later.
      </p>

      {/* Add Wave Form */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h4 className="text-md font-semibold text-gray-900 mb-3">Add Wave</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wave Time
            </label>
            <Input
              type="time"
              value={newWaveTime}
              onChange={(e) => setNewWaveTime(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Bays
            </label>
            <Input
              type="number"
              min={1}
              max={20}
              value={newWaveNumberOfBays}
              onChange={(e) => setNewWaveNumberOfBays(parseInt(e.target.value) || 1)}
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleAddWave}
              disabled={!newWaveTime}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Wave
            </Button>
          </div>
        </div>
      </div>

      {/* Defined Waves List */}
      {waves.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-md font-semibold text-gray-900">Defined Waves</h4>
            <Button
              onClick={handleCreateTeeTimesFromWaves}
              disabled={isCreating || createTeeTimeMutation.isPending}
              variant="secondary"
            >
              {isCreating ? "Creating..." : `Create ${waves.reduce((sum, w) => sum + w.numberOfBays, 0)} Bay Slots`}
            </Button>
          </div>
          {waves.map((wave, index) => (
            <div key={index} className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-4">
                    <div>
                      <Clock className="h-4 w-4 inline-block mr-2 text-blue-600" />
                      <span className="font-semibold text-gray-900">{wave.time}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {wave.numberOfBays} {wave.numberOfBays === 1 ? 'bay' : 'bays'}
                      {' '}(Bay {Array.from({length: wave.numberOfBays}, (_, i) => i + 1).join(', ')})
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveWave(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
            <strong>Note:</strong> Click "Create Bay Slots" to generate the tee times. Then you can assign participants to each bay.
          </p>
        </div>
      )}

      {waves.length === 0 && (
        <div className="text-center py-6 text-gray-500 text-sm">
          No waves defined yet. Add wave times above to get started.
        </div>
      )}
      </div>
      {dialog}
    </>
  );
}

export default IndoorWaveManager;

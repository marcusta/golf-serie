import { useState } from "react";
import { Plus } from "lucide-react";
import type { TeeTime } from "../../../api/tee-times";
import { useCreateTeeTime } from "../../../api/tee-times";
import { useNotification } from "@/hooks/useNotification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TeeTimeCreationFormProps {
  competitionId: string;
  teeTimes: TeeTime[] | undefined;
  onRefetch: () => void;
}

export function TeeTimeCreationForm({
  competitionId,
  teeTimes,
  onRefetch,
}: TeeTimeCreationFormProps) {
  const [firstTeeTime, setFirstTeeTime] = useState("");
  const [timeBetweenTeeTimes, setTimeBetweenTeeTimes] = useState(10);
  const [isCreating, setIsCreating] = useState(false);

  // Specific tee time creation state
  const [specificTime, setSpecificTime] = useState("");
  const [specificStartHole, setSpecificStartHole] = useState<number>(1);

  const createTeeTimeMutation = useCreateTeeTime();
  const { showError } = useNotification();

  const handleCreateNextTeeTime = async (useStartHole: number) => {
    if (!competitionId) return;

    setIsCreating(true);
    try {
      let newTeeTime: string;

      // If there are existing tee times, use the latest one as base and add interval
      if (teeTimes && teeTimes.length > 0) {
        const latestTeeTime = teeTimes[teeTimes.length - 1].teetime;
        const currentTime = new Date(`2000-01-01T${latestTeeTime}`);
        // Add the time interval to get the next tee time
        const nextTime = new Date(
          currentTime.getTime() + timeBetweenTeeTimes * 60000
        );
        newTeeTime = nextTime.toTimeString().slice(0, 5);
      } else {
        // If no existing tee times, use the first tee time input directly
        newTeeTime = firstTeeTime;
      }

      // Create the empty tee time
      await createTeeTimeMutation.mutateAsync({
        competitionId: parseInt(competitionId),
        teetime: newTeeTime,
        start_hole: useStartHole,
      });

      // Refresh the tee times list
      await onRefetch();
    } catch (error) {
      console.error("Error creating tee time:", error);
      showError("Failed to create tee time. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateSpecificTeeTime = async () => {
    if (!competitionId || !specificTime) return;

    setIsCreating(true);
    try {
      // Create the tee time with the specific time and hole
      await createTeeTimeMutation.mutateAsync({
        competitionId: parseInt(competitionId),
        teetime: specificTime,
        start_hole: specificStartHole,
      });

      // Refresh the tee times list
      await onRefetch();
      // Reset form
      setSpecificTime("");
      setSpecificStartHole(1);
    } catch (error) {
      console.error("Error creating specific tee time:", error);
      showError("Failed to create tee time. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Create Tee Times
      </h3>

      {/* Quick Sequential Creation */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-gray-900 mb-3">
          Quick Sequential Creation
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          {teeTimes && teeTimes.length > 0
            ? `Add tee times sequentially. Next time will be ${timeBetweenTeeTimes} minutes after ${teeTimes[teeTimes.length - 1].teetime}.`
            : "Set the first tee time and interval to start creating tee times."}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Only show first tee time input when there are no existing tee times */}
          {(!teeTimes || teeTimes.length === 0) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Tee Time
              </label>
              <Input
                type="time"
                value={firstTeeTime}
                onChange={(e) => setFirstTeeTime(e.target.value)}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minutes Between Tee Times
            </label>
            <Input
              type="number"
              min={5}
              max={30}
              value={timeBetweenTeeTimes}
              onChange={(e) =>
                setTimeBetweenTeeTimes(parseInt(e.target.value) || 10)
              }
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => handleCreateNextTeeTime(1)}
            disabled={
              ((!teeTimes || teeTimes.length === 0) && !firstTeeTime) ||
              isCreating ||
              createTeeTimeMutation.isPending
            }
          >
            {isCreating ? "Creating..." : "Add Next Tee Time (Hole 1)"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleCreateNextTeeTime(10)}
            disabled={
              ((!teeTimes || teeTimes.length === 0) && !firstTeeTime) ||
              isCreating ||
              createTeeTimeMutation.isPending
            }
          >
            {isCreating ? "Creating..." : "Add Next Tee Time (Hole 10)"}
          </Button>
        </div>
      </div>

      {/* Specific Time Creation */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-md font-semibold text-gray-900 mb-3">
          Add Specific Tee Time
        </h4>
        <p className="text-sm text-gray-600 mb-4">
          Create a tee time at an exact time and hole (useful for simultaneous starts on different holes).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specific Time
            </label>
            <Input
              type="time"
              value={specificTime}
              onChange={(e) => setSpecificTime(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Hole
            </label>
            <Select
              value={specificStartHole.toString()}
              onValueChange={(value) => setSpecificStartHole(parseInt(value))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select hole" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Hole 1</SelectItem>
                <SelectItem value="10">Hole 10</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={handleCreateSpecificTeeTime}
          disabled={
            !specificTime ||
            isCreating ||
            createTeeTimeMutation.isPending
          }
        >
          <Plus className="h-4 w-4 mr-2" />
          {isCreating ? "Creating..." : "Add Specific Tee Time"}
        </Button>
      </div>
    </div>
  );
}

export default TeeTimeCreationForm;

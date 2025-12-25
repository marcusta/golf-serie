import { useState } from "react";
import { Users, Search, Loader2, Play, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  useRegisterForCompetition,
  type RegistrationMode,
} from "@/api/tour-registration";

interface JoinCompetitionFlowProps {
  isOpen: boolean;
  onClose: () => void;
  competitionId: number;
  competitionName: string;
  courseName?: string;
  openUntil?: string;
  onSuccess?: () => void;
}

interface OptionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  highlight?: boolean;
}

function OptionCard({
  icon,
  title,
  description,
  onClick,
  disabled,
  loading,
  highlight,
}: OptionCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left group ${
        highlight
          ? "border-turf bg-turf/5 hover:bg-turf/10 hover:border-fairway"
          : "border-soft-grey bg-scorecard hover:border-turf hover:bg-rough/30"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
            highlight
              ? "bg-turf/20 text-turf group-hover:bg-turf/30"
              : "bg-rough text-charcoal/70 group-hover:bg-turf/20 group-hover:text-turf"
          }`}
        >
          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-label-lg font-semibold text-charcoal group-hover:text-fairway transition-colors">
            {title}
          </h4>
          <p className="text-body-sm text-charcoal/70 mt-1">{description}</p>
        </div>
      </div>
    </button>
  );
}

export function JoinCompetitionFlow({
  isOpen,
  onClose,
  competitionId,
  competitionName,
  courseName,
  openUntil,
  onSuccess,
}: JoinCompetitionFlowProps) {
  const [selectedMode, setSelectedMode] = useState<RegistrationMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const registerMutation = useRegisterForCompetition();

  const handleSelectMode = async (mode: RegistrationMode) => {
    setSelectedMode(mode);
    setError(null);

    try {
      await registerMutation.mutateAsync({ competitionId, mode });
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to register. Please try again.");
      setSelectedMode(null);
    }
  };

  const handleClose = () => {
    setSelectedMode(null);
    setError(null);
    onClose();
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} maxHeight="85vh">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-display-sm font-display font-bold text-charcoal">
            Join Round
          </h2>
          <p className="text-body-md text-charcoal/70 mt-2">{competitionName}</p>
          {courseName && (
            <p className="text-body-sm text-charcoal/50">{courseName}</p>
          )}
          {openUntil && (
            <p className="text-body-sm text-turf mt-2">
              Open until{" "}
              {new Date(openUntil).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-flag/10 border border-flag/20 rounded-xl">
            <AlertCircle className="h-5 w-5 text-flag flex-shrink-0" />
            <p className="text-body-sm text-flag">{error}</p>
          </div>
        )}

        {/* Option prompt */}
        <div className="text-center">
          <h3 className="text-label-lg font-semibold text-charcoal">
            How do you want to play?
          </h3>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <OptionCard
            icon={<Play className="h-6 w-6" />}
            title="Play Solo"
            description="Start your round and play at your own pace"
            onClick={() => handleSelectMode("solo")}
            loading={selectedMode === "solo" && registerMutation.isPending}
            disabled={registerMutation.isPending}
            highlight
          />

          <OptionCard
            icon={<Users className="h-6 w-6" />}
            title="Play with Others"
            description="Create a group and add other players"
            onClick={() => handleSelectMode("create_group")}
            loading={selectedMode === "create_group" && registerMutation.isPending}
            disabled={registerMutation.isPending}
          />

          <OptionCard
            icon={<Search className="h-6 w-6" />}
            title="Looking for Group"
            description="Let others add you to their group"
            onClick={() => handleSelectMode("looking_for_group")}
            loading={
              selectedMode === "looking_for_group" && registerMutation.isPending
            }
            disabled={registerMutation.isPending}
          />
        </div>

        {/* Cancel button */}
        <Button
          variant="outline"
          onClick={handleClose}
          className="w-full border-soft-grey text-charcoal hover:bg-rough/20"
          disabled={registerMutation.isPending}
        >
          Cancel
        </Button>
      </div>
    </BottomSheet>
  );
}

export default JoinCompetitionFlow;

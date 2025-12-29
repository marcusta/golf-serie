import { Input } from "../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

export type StartMode = "scheduled" | "open";

export interface CompetitionSettingsFieldsProps {
  pointsMultiplier: number;
  onPointsMultiplierChange: (value: number) => void;
  startMode: StartMode;
  onStartModeChange: (mode: StartMode) => void;
  openPeriodStart?: string;
  openPeriodEnd?: string;
  onOpenPeriodChange?: (start: string, end: string) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export function CompetitionSettingsFields({
  pointsMultiplier,
  onPointsMultiplierChange,
  startMode,
  onStartModeChange,
  openPeriodStart = "",
  openPeriodEnd = "",
  onOpenPeriodChange,
  errors = {},
  disabled = false,
}: CompetitionSettingsFieldsProps) {
  return (
    <>
      {/* Points Multiplier */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Points Multiplier
        </label>
        <Input
          type="number"
          value={pointsMultiplier}
          onChange={(e) => onPointsMultiplierChange(parseFloat(e.target.value) || 1)}
          min={0.1}
          max={10}
          step={0.1}
          disabled={disabled}
          className={errors.pointsMultiplier ? "border-red-500" : ""}
        />
        <p className="text-xs text-gray-500 mt-1">
          Multiplier for series points (1 = normal, 2 = double points)
        </p>
        {errors.pointsMultiplier && (
          <p className="text-sm text-red-500">{errors.pointsMultiplier}</p>
        )}
      </div>

      {/* Start Mode */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Start Mode
        </label>
        <Select
          value={startMode}
          onValueChange={(val) => onStartModeChange(val as StartMode)}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scheduled">Scheduled (Prepared Start List)</SelectItem>
            <SelectItem value="open">Open (Ad-hoc Play)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-1">
          Scheduled: Players have assigned tee times. Open: Players play ad-hoc.
        </p>
        {errors.startMode && (
          <p className="text-sm text-red-500">{errors.startMode}</p>
        )}
      </div>

      {/* Open Period Fields (only when start_mode = 'open') */}
      {startMode === "open" && (
        <>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Open Period Start
            </label>
            <Input
              type="datetime-local"
              value={openPeriodStart}
              onChange={(e) =>
                onOpenPeriodChange?.(e.target.value, openPeriodEnd)
              }
              disabled={disabled}
              className={errors.openPeriodStart ? "border-red-500" : ""}
            />
            {errors.openPeriodStart && (
              <p className="text-sm text-red-500">{errors.openPeriodStart}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-gray-700">
              Open Period End
            </label>
            <Input
              type="datetime-local"
              value={openPeriodEnd}
              onChange={(e) =>
                onOpenPeriodChange?.(openPeriodStart, e.target.value)
              }
              disabled={disabled}
              className={errors.openPeriodEnd ? "border-red-500" : ""}
            />
            {errors.openPeriodEnd && (
              <p className="text-sm text-red-500">{errors.openPeriodEnd}</p>
            )}
          </div>
        </>
      )}
    </>
  );
}

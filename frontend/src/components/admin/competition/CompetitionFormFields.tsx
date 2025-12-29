import { Input } from "../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";

export type VenueType = "outdoor" | "indoor";
export type ManualEntryFormat = "out_in_total" | "total_only";

export interface CompetitionFormFieldsProps {
  name: string;
  onNameChange: (name: string) => void;
  date: string;
  onDateChange: (date: string) => void;
  venueType: VenueType;
  onVenueTypeChange: (type: VenueType) => void;
  manualEntryFormat: ManualEntryFormat;
  onManualEntryFormatChange: (format: ManualEntryFormat) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}

export function CompetitionFormFields({
  name,
  onNameChange,
  date,
  onDateChange,
  venueType,
  onVenueTypeChange,
  manualEntryFormat,
  onManualEntryFormatChange,
  errors = {},
  disabled = false,
}: CompetitionFormFieldsProps) {
  return (
    <>
      {/* Competition Name */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Competition Name
          <span className="text-red-500 ml-1">*</span>
        </label>
        <Input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Enter competition name"
          disabled={disabled}
          className={errors.name ? "border-red-500" : ""}
          required
        />
        {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
      </div>

      {/* Date */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Date
          <span className="text-red-500 ml-1">*</span>
        </label>
        <Input
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          disabled={disabled}
          className={errors.date ? "border-red-500" : ""}
          required
        />
        {errors.date && <p className="text-sm text-red-500">{errors.date}</p>}
      </div>

      {/* Venue Type */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Venue Type
        </label>
        <Select
          value={venueType}
          onValueChange={(val) => onVenueTypeChange(val as VenueType)}
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="outdoor">Outdoor</SelectItem>
            <SelectItem value="indoor">Indoor (Simulator)</SelectItem>
          </SelectContent>
        </Select>
        {errors.venueType && (
          <p className="text-sm text-red-500">{errors.venueType}</p>
        )}
      </div>

      {/* Manual Entry Format */}
      <div className="space-y-1">
        <label className="block text-sm font-medium text-gray-700">
          Manual Entry Format
        </label>
        <Select
          value={manualEntryFormat}
          onValueChange={(val) =>
            onManualEntryFormatChange(val as ManualEntryFormat)
          }
          disabled={disabled}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="out_in_total">Out, In, and Total</SelectItem>
            <SelectItem value="total_only">Total Score Only</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500 mt-1">
          How scores are entered manually for this competition
        </p>
        {errors.manualEntryFormat && (
          <p className="text-sm text-red-500">{errors.manualEntryFormat}</p>
        )}
      </div>
    </>
  );
}

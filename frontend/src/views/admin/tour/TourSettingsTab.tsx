import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, Calculator, Trophy } from "lucide-react";
import { useUpdateTour, type Tour, type TourScoringMode } from "../../../api/tours";
import {
  useTourPointTemplates,
  type PointTemplate,
} from "../../../api/point-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useNotification } from "@/hooks/useNotification";

// Zod schema for tour settings validation
const tourSettingsSchema = z.object({
  banner_image_url: z
    .string()
    .url("Please enter a valid URL")
    .or(z.literal(""))
    .optional(),
  scoring_mode: z.enum(["gross", "net", "both"] as const),
  point_template_id: z.string().optional(),
});

type TourSettingsFormData = z.infer<typeof tourSettingsSchema>;

interface TourSettingsTabProps {
  tourId: number;
  tour: Tour;
}

export function TourSettingsTab({ tourId, tour }: TourSettingsTabProps) {
  const { showError, showSuccess } = useNotification();
  const { data: tourPointTemplates } = useTourPointTemplates(tourId);
  const updateTourMutation = useUpdateTour();

  const form = useForm<TourSettingsFormData>({
    resolver: zodResolver(tourSettingsSchema),
    defaultValues: {
      banner_image_url: tour.banner_image_url || "",
      scoring_mode: tour.scoring_mode,
      point_template_id: tour.point_template_id?.toString() || "",
    },
    mode: "onChange",
  });

  // Reset form when tour data changes
  useEffect(() => {
    form.reset({
      banner_image_url: tour.banner_image_url || "",
      scoring_mode: tour.scoring_mode,
      point_template_id: tour.point_template_id?.toString() || "",
    });
  }, [tour, form]);

  const onSubmit = async (data: TourSettingsFormData) => {
    try {
      await updateTourMutation.mutateAsync({
        id: tourId,
        data: {
          banner_image_url: data.banner_image_url || null,
          scoring_mode: data.scoring_mode as TourScoringMode,
          point_template_id: data.point_template_id
            ? parseInt(data.point_template_id)
            : null,
        },
      });
      showSuccess("Tour settings saved successfully");
    } catch (err) {
      console.error("Failed to save tour settings:", err);
      showError(
        err instanceof Error ? err.message : "Failed to save settings"
      );
    }
  };

  const getPointsStructurePreview = (template: PointTemplate) => {
    try {
      const structure = JSON.parse(template.points_structure);
      return (
        Object.entries(structure)
          .slice(0, 5)
          .map(([pos, pts]) => `${pos}: ${pts}pts`)
          .join(", ") + (Object.keys(structure).length > 5 ? "..." : "")
      );
    } catch {
      return "Invalid structure";
    }
  };

  const isDirty = form.formState.isDirty;
  const isValid = form.formState.isValid;
  const isSubmitting = form.formState.isSubmitting || updateTourMutation.isPending;

  const selectedTemplateId = form.watch("point_template_id");
  const selectedTemplate = selectedTemplateId
    ? tourPointTemplates?.find((t) => t.id === parseInt(selectedTemplateId))
    : null;

  const scoringModeDescription: Record<TourScoringMode, string> = {
    gross: "Standings based on raw scores without handicap adjustments.",
    net: "Standings based on handicap-adjusted net scores.",
    both: "Display both gross and net scores in standings.",
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-charcoal mb-6">Tour Settings</h3>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
          {/* Banner Image URL */}
          <FormField
            control={form.control}
            name="banner_image_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Banner Image URL</FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://example.com/banner.jpg"
                    autoFocus
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  URL to an image that will be displayed as the tour hero banner.
                </FormDescription>
                <FormMessage />

                {/* Preview */}
                {field.value && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-charcoal mb-2">
                      Preview:
                    </p>
                    <div className="relative h-32 rounded-lg overflow-hidden border border-soft-grey">
                      <img
                        src={field.value}
                        alt="Banner preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  </div>
                )}
              </FormItem>
            )}
          />

          {/* Scoring Mode */}
          <FormField
            control={form.control}
            name="scoring_mode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <span className="flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Scoring Mode
                  </span>
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full max-w-md">
                      <SelectValue placeholder="Select scoring mode" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="gross">Gross (Raw Scores)</SelectItem>
                    <SelectItem value="net">Net (Handicap-Adjusted)</SelectItem>
                    <SelectItem value="both">Both (Gross & Net)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  {scoringModeDescription[field.value as TourScoringMode]}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Point Template */}
          <FormField
            control={form.control}
            name="point_template_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <span className="flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    Point Template
                  </span>
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger className="w-full max-w-md">
                      <SelectValue placeholder="No point template (no standings points)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">
                      No point template (no standings points)
                    </SelectItem>
                    {tourPointTemplates?.map((template) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>
                  Point template defines how standings points are awarded based on
                  finishing position.
                </FormDescription>
                <FormMessage />

                {/* Points structure preview */}
                {selectedTemplate && (
                  <div className="mt-2 p-3 bg-rough/20 rounded-lg">
                    <p className="text-xs text-charcoal/70 font-medium mb-1">
                      Points Structure:
                    </p>
                    <p className="text-sm text-charcoal">
                      {getPointsStructurePreview(selectedTemplate)}
                    </p>
                  </div>
                )}
              </FormItem>
            )}
          />

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={!isDirty || !isValid || isSubmitting}
              className="bg-turf hover:bg-fairway text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import {
  useUpdateTour,
  type Tour,
  type TourEnrollmentMode,
  type TourScoringMode,
  type TourVisibility,
} from "../../../api/tours";
import {
  useTourPointTemplates,
  type PointTemplate,
} from "../../../api/point-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

const tourSettingsSchema = z.object({
  name: z
    .string()
    .min(1, "Tour name is required")
    .max(100, "Tour name must be 100 characters or less"),
  description: z.string().optional(),
  banner_image_url: z
    .string()
    .url("Please enter a valid URL")
    .or(z.literal(""))
    .optional(),
  visibility: z.enum(["public", "private"] as const),
  enrollment_mode: z.enum(["closed", "request"] as const),
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
      name: tour.name,
      description: tour.description || "",
      banner_image_url: tour.banner_image_url || "",
      visibility: tour.visibility,
      enrollment_mode: tour.enrollment_mode,
      scoring_mode: tour.scoring_mode,
      point_template_id: tour.point_template_id?.toString() || "none",
    },
    mode: "onChange",
  });

  useEffect(() => {
    form.reset({
      name: tour.name,
      description: tour.description || "",
      banner_image_url: tour.banner_image_url || "",
      visibility: tour.visibility,
      enrollment_mode: tour.enrollment_mode,
      scoring_mode: tour.scoring_mode,
      point_template_id: tour.point_template_id?.toString() || "none",
    });
  }, [tour, form]);

  const onSubmit = async (data: TourSettingsFormData) => {
    try {
      await updateTourMutation.mutateAsync({
        id: tourId,
        data: {
          name: data.name,
          description: data.description || undefined,
          banner_image_url: data.banner_image_url || null,
          visibility: data.visibility as TourVisibility,
          enrollment_mode: data.enrollment_mode as TourEnrollmentMode,
          scoring_mode: data.scoring_mode as TourScoringMode,
          point_template_id:
            data.point_template_id && data.point_template_id !== "none"
              ? parseInt(data.point_template_id)
              : null,
        },
      });
      showSuccess("Tour settings saved successfully");
    } catch (err) {
      console.error("Failed to save tour settings:", err);
      showError(err instanceof Error ? err.message : "Failed to save settings");
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
  const selectedTemplate =
    selectedTemplateId && selectedTemplateId !== "none"
      ? tourPointTemplates?.find((t) => t.id === parseInt(selectedTemplateId))
      : null;

  const scoringModeDescription: Record<TourScoringMode, string> = {
    gross: "Standings based on raw scores without handicap adjustments.",
    net: "Standings based on handicap-adjusted net scores.",
    both: "Display both gross and net scores in standings.",
  };

  return (
    <div className="bg-white border border-soft-grey rounded-lg p-4">
      <div className="text-sm font-semibold uppercase tracking-wide text-charcoal mb-4">
        Tour Settings
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="text-xs font-semibold uppercase tracking-wide text-charcoal/70">
            Basic Information
          </div>

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wide text-charcoal/70">
                  Tour Name
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter tour name"
                    autoFocus
                    className="h-9 text-sm"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs text-charcoal/60">
                  The name that will be displayed to players.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wide text-charcoal/70">
                  Description
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe the tour (optional)"
                    className="min-h-[90px] text-sm"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs text-charcoal/60">
                  Appears on the player tour overview.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="visibility"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wide text-charcoal/70">
                  Visibility
                </FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormDescription className="text-xs text-charcoal/60">
                  Public tours appear to all players; private tours are hidden.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="enrollment_mode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wide text-charcoal/70">
                  Enrollment Mode
                </FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select enrollment mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="closed">Admin only</SelectItem>
                      <SelectItem value="request">Requests</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormDescription className="text-xs text-charcoal/60">
                  Control how players can join this tour.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="text-xs font-semibold uppercase tracking-wide text-charcoal/70">
            Scoring & Points
          </div>

          <FormField
            control={form.control}
            name="scoring_mode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wide text-charcoal/70">
                  Scoring Mode
                </FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full max-w-md">
                      <SelectValue placeholder="Select scoring mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gross">Gross (Raw Scores)</SelectItem>
                      <SelectItem value="net">Net (Handicap-Adjusted)</SelectItem>
                      <SelectItem value="both">Both (Gross & Net)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormDescription className="text-xs text-charcoal/60">
                  {scoringModeDescription[field.value as TourScoringMode]}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="point_template_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wide text-charcoal/70">
                  Point Template
                </FormLabel>
                <FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full max-w-md">
                      <SelectValue placeholder="No point template (no standings points)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        No point template (no standings points)
                      </SelectItem>
                      {tourPointTemplates?.map((template) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormDescription className="text-xs text-charcoal/60">
                  Point template defines how standings points are awarded.
                </FormDescription>
                <FormMessage />
                {selectedTemplate && (
                  <div className="mt-2 p-3 bg-rough/20 rounded-md">
                    <p className="text-xs text-charcoal/70 font-medium mb-1">
                      Points Structure
                    </p>
                    <p className="text-sm text-charcoal">
                      {getPointsStructurePreview(selectedTemplate)}
                    </p>
                  </div>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="banner_image_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wide text-charcoal/70">
                  Banner Image URL
                </FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://example.com/banner.jpg"
                    className="h-9 text-sm"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs text-charcoal/60">
                  URL to an image that will be displayed as the tour banner.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.watch("banner_image_url") && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/70">
                Preview
              </p>
              <div className="relative h-32 rounded-md overflow-hidden border border-soft-grey">
                <img
                  src={form.watch("banner_image_url")}
                  alt="Banner preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!isDirty || !isValid || isSubmitting}
              className="h-9 px-3 rounded-md text-sm bg-turf hover:bg-fairway text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

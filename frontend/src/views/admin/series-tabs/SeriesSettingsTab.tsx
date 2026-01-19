import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Series, useUpdateSeries } from "@/api/series";
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
import { Loader2, Save } from "lucide-react";
import { useNotification } from "@/hooks/useNotification";

// Zod schema for series settings validation
const seriesSettingsSchema = z.object({
  name: z
    .string()
    .min(1, "Series name is required")
    .max(100, "Series name must be 100 characters or less"),
  description: z.string().optional(),
  banner_image_url: z
    .string()
    .url("Please enter a valid URL")
    .or(z.literal(""))
    .optional(),
  is_public: z.boolean(),
});

type SeriesSettingsFormData = z.infer<typeof seriesSettingsSchema>;

interface SeriesSettingsTabProps {
  series: Series;
}

export function SeriesSettingsTab({ series }: SeriesSettingsTabProps) {
  const { showError, showSuccess } = useNotification();
  const updateSeries = useUpdateSeries();

  const form = useForm<SeriesSettingsFormData>({
    resolver: zodResolver(seriesSettingsSchema),
    defaultValues: {
      name: series.name,
      description: series.description || "",
      banner_image_url: series.banner_image_url || "",
      is_public: Boolean(series.is_public),
    },
    mode: "onChange",
  });

  // Reset form when series data changes (e.g., after successful save)
  useEffect(() => {
    form.reset({
      name: series.name,
      description: series.description || "",
      banner_image_url: series.banner_image_url || "",
      is_public: Boolean(series.is_public),
    });
  }, [series, form]);

  const onSubmit = async (data: SeriesSettingsFormData) => {
    try {
      await updateSeries.mutateAsync({
        id: series.id,
        data: {
          name: data.name,
          description: data.description || undefined,
          banner_image_url: data.banner_image_url || undefined,
          is_public: data.is_public,
        },
      });
      showSuccess("Series settings saved successfully");
    } catch (error) {
      console.error("Failed to update series:", error);
      showError("Failed to update series. Please try again.");
    }
  };

  const isDirty = form.formState.isDirty;
  const isValid = form.formState.isValid;
  const isSubmitting = form.formState.isSubmitting || updateSeries.isPending;

  return (
    <div className="bg-white border border-soft-grey rounded-lg p-4">
      <div className="text-sm font-semibold uppercase tracking-wide text-charcoal mb-4">
        Basic Information
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wide text-charcoal/70">
                  Series Name
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter series name"
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
                    placeholder="Describe the series (optional)"
                    className="min-h-[90px] text-sm"
                    {...field}
                  />
                </FormControl>
                <FormDescription className="text-xs text-charcoal/60">
                  Appears on the player series overview.
                </FormDescription>
                <FormMessage />
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
                  URL to an image that will be displayed as the series banner.
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

          <FormField
            control={form.control}
            name="is_public"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold uppercase tracking-wide text-charcoal/70">
                  Visibility
                </FormLabel>
                <FormControl>
                  <Select
                    value={field.value ? "public" : "private"}
                    onValueChange={(value) => field.onChange(value === "public")}
                  >
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
                  Public series appear to all players; private series are hidden.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

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

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Series, useUpdateSeries } from "@/api/series";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
      banner_image_url: series.banner_image_url || "",
      is_public: series.is_public,
    },
    mode: "onChange",
  });

  // Reset form when series data changes (e.g., after successful save)
  useEffect(() => {
    form.reset({
      name: series.name,
      banner_image_url: series.banner_image_url || "",
      is_public: series.is_public,
    });
  }, [series, form]);

  const onSubmit = async (data: SeriesSettingsFormData) => {
    try {
      await updateSeries.mutateAsync({
        id: series.id,
        data: {
          name: data.name,
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Series Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter series name"
                        autoFocus
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The name that will be displayed to players.
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
                    <FormLabel>Banner Image URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://example.com/banner.jpg"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      URL to an image that will be displayed as the series
                      banner.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Banner preview */}
              {form.watch("banner_image_url") && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-charcoal">Preview:</p>
                  <div className="relative h-32 rounded-lg overflow-hidden border border-soft-grey">
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
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border border-soft-grey p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Public Series</FormLabel>
                      <FormDescription>
                        When enabled, this series will be visible to all players
                        on the public series list.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={!isDirty || !isValid || isSubmitting}
                  className="bg-turf hover:bg-fairway text-white"
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
        </CardContent>
      </Card>
    </div>
  );
}

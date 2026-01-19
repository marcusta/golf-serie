import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateCompetition,
  useUpdateCompetition,
  type Competition,
} from "../../../api/competitions";
import { useCourses } from "../../../api/courses";
import { TeeSelector } from "../competition";
import { Loader2, Check, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

export interface SeriesCompetitionModalProps {
  seriesId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competition?: Competition | null;
  onSuccess?: () => void;
}

// Zod schema for series competition validation
const seriesCompetitionSchema = z
  .object({
    name: z.string().min(1, "Competition name is required"),
    date: z.string().min(1, "Date is required"),
    course_id: z.string().min(1, "Course is required"),
    tee_id: z.string().optional(),
    points_multiplier: z.string(),
    venue_type: z.enum(["outdoor", "indoor"] as const),
    start_mode: z.enum(["scheduled", "open"] as const),
    open_start: z.string().optional(),
    open_end: z.string().optional(),
  })
  .refine(
    (data) => {
      // If start_mode is 'open', open_start is required
      if (data.start_mode === "open" && !data.open_start) {
        return false;
      }
      return true;
    },
    {
      message: "Open period start is required for open mode",
      path: ["open_start"],
    }
  )
  .refine(
    (data) => {
      const num = parseFloat(data.points_multiplier);
      return !isNaN(num) && num >= 0;
    },
    {
      message: "Points multiplier must be 0 or greater",
      path: ["points_multiplier"],
    }
  );

type SeriesCompetitionFormData = z.infer<typeof seriesCompetitionSchema>;

// Helper to convert date or datetime to datetime-local format
const toDatetimeLocal = (value?: string | null): string => {
  if (!value) return "";
  if (value.includes("T")) {
    return value.slice(0, 16);
  }
  return `${value}T00:00`;
};

export function SeriesCompetitionModal({
  seriesId,
  open,
  onOpenChange,
  competition,
  onSuccess,
}: SeriesCompetitionModalProps) {
  const queryClient = useQueryClient();
  const { data: courses } = useCourses();
  const createMutation = useCreateCompetition();
  const updateMutation = useUpdateCompetition();
  const nameInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!competition;

  const form = useForm<SeriesCompetitionFormData>({
    resolver: zodResolver(seriesCompetitionSchema),
    defaultValues: {
      name: "",
      date: "",
      course_id: "",
      tee_id: "",
      points_multiplier: "1",
      venue_type: "outdoor",
      start_mode: "scheduled",
      open_start: "",
      open_end: "",
    },
    mode: "onChange",
  });

  // Reset form when modal opens or competition changes
  useEffect(() => {
    if (open) {
      if (competition) {
        form.reset({
          name: competition.name,
          date: competition.date,
          course_id: competition.course_id?.toString() || "",
          tee_id: competition.tee_id?.toString() || "",
          points_multiplier: (competition.points_multiplier || 1).toString(),
          venue_type: competition.venue_type || "outdoor",
          start_mode: competition.start_mode || "scheduled",
          open_start: toDatetimeLocal(competition.open_start),
          open_end: toDatetimeLocal(competition.open_end),
        });
      } else {
        form.reset({
          name: "",
          date: "",
          course_id: "",
          tee_id: "",
          points_multiplier: "1",
          venue_type: "outdoor",
          start_mode: "scheduled",
          open_start: "",
          open_end: "",
        });
      }
      // Auto-focus name field
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [open, competition, form]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const onSubmit = async (data: SeriesCompetitionFormData) => {
    const submitData = {
      name: data.name.trim(),
      date: data.date,
      course_id: parseInt(data.course_id),
      tee_id: data.tee_id ? parseInt(data.tee_id) : undefined,
      series_id: seriesId,
      points_multiplier: parseFloat(data.points_multiplier),
      venue_type: data.venue_type,
      start_mode: data.start_mode,
      open_start:
        data.start_mode === "open" && data.open_start
          ? data.open_start
          : undefined,
      open_end:
        data.start_mode === "open" && data.open_end ? data.open_end : undefined,
    };

    try {
      if (isEditing && competition) {
        await updateMutation.mutateAsync({ id: competition.id, data: submitData });
      } else {
        await createMutation.mutateAsync(submitData);
      }

      // Invalidate series competitions query to refresh the list
      queryClient.invalidateQueries({
        queryKey: ["series", seriesId, "competitions"],
      });

      onSuccess?.();
      handleClose();
    } catch (err) {
      // Error is handled by form
      form.setError("root", {
        message: err instanceof Error ? err.message : "Failed to save competition",
      });
    }
  };

  const handleCourseChange = (courseId: string) => {
    form.setValue("course_id", courseId, { shouldValidate: true });
    form.setValue("tee_id", ""); // Reset tee when course changes
  };

  const isPending = createMutation.isPending || updateMutation.isPending;
  const startMode = form.watch("start_mode");
  const selectedCourseId = form.watch("course_id");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-charcoal">
            {isEditing ? "Edit Competition" : "Add Competition"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Competition Name <span className="text-coral">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Round 1"
                        {...field}
                        ref={nameInputRef}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date */}
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Date <span className="text-coral">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} disabled={isPending} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Course */}
              <FormField
                control={form.control}
                name="course_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Course <span className="text-coral">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={handleCourseChange}
                      value={field.value}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select a course" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {courses?.map((course) => (
                          <SelectItem key={course.id} value={course.id.toString()}>
                            {course.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tee - Using existing TeeSelector component */}
              <FormField
                control={form.control}
                name="tee_id"
                render={({ field }) => (
                  <FormItem>
                    <TeeSelector
                      courseId={selectedCourseId ? parseInt(selectedCourseId) : null}
                      value={field.value ? parseInt(field.value) : null}
                      onChange={(teeId) =>
                        form.setValue("tee_id", teeId?.toString() || "")
                      }
                      label="Tee Box (Optional)"
                      disabled={isPending}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Points Multiplier */}
              <FormField
                control={form.control}
                name="points_multiplier"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <span className="flex items-center gap-2">
                        <Star className="w-4 h-4" />
                        Points Multiplier
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        {...field}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormDescription>
                      Multiplier for team points (e.g., 2 = double points)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Venue Type */}
              <FormField
                control={form.control}
                name="venue_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Venue Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="outdoor">Outdoor</SelectItem>
                        <SelectItem value="indoor">Indoor (Simulator)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Start Mode */}
              <FormField
                control={form.control}
                name="start_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Mode</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="scheduled">
                          Scheduled (Prepared Start List)
                        </SelectItem>
                        <SelectItem value="open">Open (Ad-hoc Play)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Scheduled: Assigned tee times. Open: Ad-hoc play.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Open Period (only when start_mode is open) */}
              {startMode === "open" && (
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="open_start"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Open Period Start</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                            disabled={isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="open_end"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Open Period End</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                            disabled={isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Root error message */}
              {form.formState.errors.root && (
                <p className="text-coral text-sm">
                  {form.formState.errors.root.message}
                </p>
              )}
            </div>

            <DialogFooter className="pt-4 border-t border-soft-grey mt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClose}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!form.formState.isValid || isPending}
                className="bg-turf hover:bg-fairway text-white"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {isEditing ? "Save Changes" : "Create Competition"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

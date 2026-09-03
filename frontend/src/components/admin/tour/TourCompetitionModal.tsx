import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateCompetition,
  useUpdateCompetition,
  useCompetitionCategoryTees,
  useSetCompetitionCategoryTees,
  type Competition,
  type CategoryTeeMapping,
} from "../../../api/competitions";
import { useCourses, useCourseTees } from "../../../api/courses";
import { useTour } from "../../../api/tours";
import { useTourPointTemplates } from "../../../api/point-templates";
import { TeeSelector, CategoryTeeAssignment } from "../competition";
import { resolveTeeForCourse } from "../../../utils/resolveTeeForCourse";
import { Loader2, Check, Trophy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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

export interface TourCompetitionModalProps {
  tourId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competition?: Competition | null;
  onSuccess?: () => void;
}

// Zod schema for tour competition validation
const tourCompetitionSchema = z
  .object({
    name: z.string().min(1, "Competition name is required"),
    date: z.string().min(1, "Date is required"),
    course_id: z.string().min(1, "Course is required"),
    tee_id: z.string().optional(),
    point_template_id: z.string().optional(),
    scoring_format: z.enum(["tour_default", "stroke_play", "stableford"] as const),
    venue_type: z.enum(["outdoor", "indoor"] as const),
    manual_entry_format: z.enum(["out_in_total", "total_only"] as const),
    start_mode: z.enum(["scheduled", "open"] as const),
    open_start: z.string().optional(),
    open_end: z.string().optional(),
    round_type: z.enum(["full_18", "front_9", "back_9"] as const),
    self_organize: z.boolean(),
    handicap_mode: z.enum(["whs", "exact"] as const),
    handicap_allowance: z
      .string()
      .min(1, "Handicap allowance is required")
      .refine(
        (value) => {
          const parsed = Number(value.replace(",", "."));
          return !Number.isNaN(parsed) && parsed >= 0 && parsed <= 200;
        },
        { message: "Allowance must be a number between 0 and 200" }
      ),
    use_doped_handicap: z.boolean(),
    exclude_from_doped_handicap: z.boolean(),
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
  );

type TourCompetitionFormData = z.infer<typeof tourCompetitionSchema>;

// Helper to convert date or datetime to datetime-local format
const toDatetimeLocal = (value?: string | null): string => {
  if (!value) return "";
  if (value.includes("T")) {
    return value.slice(0, 16);
  }
  return `${value}T00:00`;
};

export function TourCompetitionModal({
  tourId,
  open,
  onOpenChange,
  competition,
  onSuccess,
}: TourCompetitionModalProps) {
  const queryClient = useQueryClient();
  const { data: tour } = useTour(tourId);
  const { data: courses } = useCourses();
  const { data: pointTemplates } = useTourPointTemplates(tourId);
  const createMutation = useCreateCompetition();
  const updateMutation = useUpdateCompetition();
  const setCategoryTeesMutation = useSetCompetitionCategoryTees();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const pendingTeeResolveRef = useRef<{
    preferredTeeId: number | null;
    preferredColor: string | null;
  } | null>(null);

  // Load existing category-tee mappings when editing
  const { data: existingCategoryTees } = useCompetitionCategoryTees(
    competition?.id || 0
  );

  const [categoryTeeMappings, setCategoryTeeMappings] = useState<
    CategoryTeeMapping[]
  >([]);

  const form = useForm<TourCompetitionFormData>({
    resolver: zodResolver(tourCompetitionSchema),
    defaultValues: {
      name: "",
      date: "",
      course_id: "",
      tee_id: "",
      point_template_id: "",
      scoring_format: "tour_default",
      venue_type: "outdoor",
      manual_entry_format: "out_in_total",
      start_mode: "scheduled",
      open_start: "",
      open_end: "",
      round_type: "full_18",
      self_organize: false,
      handicap_mode: "whs",
      handicap_allowance: "100",
      use_doped_handicap: false,
      exclude_from_doped_handicap: false,
    },
    mode: "onChange",
  });

  const isEditing = !!competition;
  const selectedCourseId = form.watch("course_id");
  const { data: courseTees } = useCourseTees(
    selectedCourseId ? parseInt(selectedCourseId) : 0
  );

  // Reset form when modal opens or competition changes
  useEffect(() => {
    if (!open) {
      pendingTeeResolveRef.current = null;
      return;
    }

    if (competition) {
      form.reset({
        name: competition.name,
        date: competition.date,
        course_id: competition.course_id?.toString() || "",
        tee_id: competition.tee_id?.toString() || "",
        point_template_id: competition.point_template_id?.toString() || "",
        scoring_format: competition.scoring_format ?? "tour_default",
        venue_type: competition.venue_type || "outdoor",
        manual_entry_format: competition.manual_entry_format || "out_in_total",
        start_mode: competition.start_mode || "scheduled",
        open_start: toDatetimeLocal(competition.open_start),
        open_end: toDatetimeLocal(competition.open_end),
        round_type: competition.round_type || "full_18",
        self_organize: !!competition.self_organize,
        handicap_mode: competition.handicap_mode || "whs",
        handicap_allowance: (competition.handicap_allowance ?? 100).toString(),
        use_doped_handicap: !!competition.use_doped_handicap,
        exclude_from_doped_handicap: !!competition.exclude_from_doped_handicap,
      });
    } else {
      form.reset({
        name: "",
        date: "",
        course_id: tour?.default_course_id?.toString() || "",
        tee_id: tour?.default_tee_id?.toString() || "",
        point_template_id: "",
        scoring_format: "tour_default",
        venue_type: "outdoor",
        manual_entry_format: "out_in_total",
        start_mode: "scheduled",
        open_start: "",
        open_end: "",
        round_type: "full_18",
        self_organize: false,
        handicap_mode: "whs",
        handicap_allowance: "100",
        use_doped_handicap: false,
        exclude_from_doped_handicap: false,
      });
      setCategoryTeeMappings([]);
    }
    setTimeout(() => nameInputRef.current?.focus(), 100);
  }, [open, competition, form, tour?.default_course_id, tour?.default_tee_id]);

  // Load existing category-tee mappings when data is fetched
  useEffect(() => {
    if (existingCategoryTees && isEditing) {
      setCategoryTeeMappings(
        existingCategoryTees.map((ct) => ({
          categoryId: ct.category_id,
          teeId: ct.tee_id,
        }))
      );
    }
  }, [existingCategoryTees, isEditing]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const onSubmit = async (data: TourCompetitionFormData) => {
    const submitData = {
      name: data.name.trim(),
      date: data.date,
      course_id: parseInt(data.course_id),
      tee_id: data.tee_id ? parseInt(data.tee_id) : undefined,
      point_template_id: data.point_template_id
        ? parseInt(data.point_template_id)
        : undefined,
      scoring_format:
        data.scoring_format === "tour_default" ? null : data.scoring_format,
      tour_id: tourId,
      points_multiplier: 1, // Default - use point templates for different scoring
      venue_type: data.venue_type,
      manual_entry_format: data.manual_entry_format,
      start_mode: data.start_mode,
      open_start:
        data.start_mode === "open" && data.open_start
          ? data.open_start
          : undefined,
      open_end:
        data.start_mode === "open" && data.open_end ? data.open_end : undefined,
      round_type: data.round_type,
      self_organize: data.self_organize,
      handicap_mode: data.handicap_mode,
      handicap_allowance: Number(data.handicap_allowance.replace(",", ".")),
      use_doped_handicap: data.use_doped_handicap,
      exclude_from_doped_handicap: data.exclude_from_doped_handicap,
    };

    try {
      let competitionId: number;

      if (isEditing && competition) {
        await updateMutation.mutateAsync({ id: competition.id, data: submitData });
        competitionId = competition.id;
      } else {
        const newCompetition = await createMutation.mutateAsync(submitData);
        competitionId = newCompetition.id;
      }

      // Save category-tee mappings if any exist
      if (
        categoryTeeMappings.length > 0 ||
        (isEditing && existingCategoryTees && existingCategoryTees.length > 0)
      ) {
        await setCategoryTeesMutation.mutateAsync({
          competitionId,
          mappings: categoryTeeMappings,
        });
      }

      // Invalidate tour competitions query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["tour-competitions", tourId] });

      onSuccess?.();
      handleClose();
    } catch (err) {
      form.setError("root", {
        message: err instanceof Error ? err.message : "Failed to save competition",
      });
    }
  };

  const handleCourseChange = (courseId: string) => {
    const previousTeeId = form.getValues("tee_id");
    const previousTee = courseTees?.find(
      (tee) => tee.id === parseInt(previousTeeId || "0", 10)
    );
    const newCourseId = courseId ? parseInt(courseId, 10) : null;

    form.setValue("course_id", courseId, { shouldValidate: true });
    form.setValue("tee_id", "");
    setCategoryTeeMappings([]);

    if (!newCourseId) {
      pendingTeeResolveRef.current = null;
      return;
    }

    const isHomeCourse = tour?.default_course_id === newCourseId;
    pendingTeeResolveRef.current = {
      preferredTeeId: isHomeCourse ? (tour?.default_tee_id ?? null) : null,
      preferredColor: previousTee?.color || tour?.default_tee_color || null,
    };
  };

  useEffect(() => {
    const pending = pendingTeeResolveRef.current;
    if (!pending || !courseTees) {
      return;
    }

    const resolvedTeeId = resolveTeeForCourse({
      tees: courseTees,
      preferredTeeId: pending.preferredTeeId,
      preferredColor: pending.preferredColor,
    });
    form.setValue("tee_id", resolvedTeeId?.toString() || "");
    pendingTeeResolveRef.current = null;
  }, [courseTees, form]);

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    setCategoryTeesMutation.isPending;

  const startMode = form.watch("start_mode");
  const dopedHandicapEnabled = !!tour?.doped_handicap_enabled;

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
                      label="Default Tee (Optional)"
                      disabled={isPending}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category Tee Assignments - Separate component that manages its own state */}
              <CategoryTeeAssignment
                tourId={tourId}
                courseId={selectedCourseId ? parseInt(selectedCourseId) : null}
                mappings={categoryTeeMappings}
                onChange={setCategoryTeeMappings}
                disabled={isPending}
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
                      onValueChange={(value) =>
                        field.onChange(value === "none" ? "" : value)
                      }
                      value={field.value || "none"}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Use tour default" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Use tour default</SelectItem>
                        {pointTemplates?.map((template) => (
                          <SelectItem
                            key={template.id}
                            value={template.id.toString()}
                          >
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Override the tour's point template for this competition
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scoring_format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scoring Format</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isPending}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Use tour default" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="tour_default">Use tour default</SelectItem>
                        <SelectItem value="stroke_play">Stroke play</SelectItem>
                        <SelectItem value="stableford">Stableford</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Override the tour default only when this competition needs a different scoring format.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Handicap Mode */}
              <FormField
                control={form.control}
                name="handicap_mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Handicap Calculation</FormLabel>
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
                        <SelectItem value="whs">
                          Course rating &amp; slope (standard)
                        </SelectItem>
                        <SelectItem value="exact">
                          Exact handicap (no course rating)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Exact handicap subtracts the handicap index directly from
                      the gross score. Use it for courses without a course
                      rating, e.g. par 3 courses. Net results get one decimal.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Handicap Allowance */}
              <FormField
                control={form.control}
                name="handicap_allowance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Handicap Allowance (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={200}
                        step={5}
                        inputMode="decimal"
                        disabled={isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Share of the handicap each player receives. 100% = full
                      handicap.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Doped handicap (only when the tour has it enabled) */}
              {dopedHandicapEnabled && (
                <div className="space-y-2">
                  <FormLabel>Doped handicap</FormLabel>
                  <FormField
                    control={form.control}
                    name="use_doped_handicap"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <label className="flex items-start gap-3 p-3 border-2 border-soft-grey rounded-xl cursor-pointer hover:border-turf transition-colors">
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(checked) =>
                                field.onChange(checked === true)
                              }
                              disabled={isPending}
                              className="mt-0.5"
                            />
                            <span className="text-sm text-charcoal/80">
                              <span className="font-medium text-charcoal">
                                Use doped handicap
                              </span>
                              <br />
                              Adds a doped leaderboard for this round.
                            </span>
                          </label>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="exclude_from_doped_handicap"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <label className="flex items-start gap-3 p-3 border-2 border-soft-grey rounded-xl cursor-pointer hover:border-turf transition-colors">
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(checked) =>
                                field.onChange(checked === true)
                              }
                              disabled={isPending}
                              className="mt-0.5"
                            />
                            <span className="text-sm text-charcoal/80">
                              <span className="font-medium text-charcoal">
                                Exclude from doped handicap calculation
                              </span>
                              <br />
                              This round's results do not feed the calculation.
                            </span>
                          </label>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

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

              {/* Round Type */}
              <FormField
                control={form.control}
                name="round_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Round</FormLabel>
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
                        <SelectItem value="full_18">18 holes</SelectItem>
                        <SelectItem value="front_9">Front 9 (holes 1-9)</SelectItem>
                        <SelectItem value="back_9">Back 9 (holes 10-18)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Pick which holes to score. Defaults to 18.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Self-Organize */}
              <FormField
                control={form.control}
                name="self_organize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Self-Organize Groups</FormLabel>
                    <FormControl>
                      <label className="flex items-start gap-3 p-3 border-2 border-soft-grey rounded-xl cursor-pointer hover:border-turf transition-colors">
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={(e) => field.onChange(e.target.checked)}
                          disabled={isPending}
                          className="mt-1"
                        />
                        <span className="text-sm text-charcoal/80">
                          Anyone with the link can build groups, move players
                          between tee times, and edit any score. Trust-based —
                          no login required for the round.
                        </span>
                      </label>
                    </FormControl>
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

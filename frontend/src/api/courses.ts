import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";

export interface Course {
  id: number;
  name: string;
  club_id?: number;
  club_name?: string; // Joined from clubs table
  pars: {
    holes: number[];
    out: number;
    in: number;
    total: number;
  };
  stroke_index?: number[]; // Array of 1-18 representing hole difficulty order
  created_at: string;
  updated_at: string;
}

export interface CreateCourseData {
  name: string;
}

export function useCourses() {
  return useQuery<Course[]>({
    queryKey: ["courses"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/courses`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

export function useCourse(id: number) {
  return useQuery<Course>({
    queryKey: ["course", id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/courses/${id}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

// Types for infinite courses admin
export interface CoursesPageResponse {
  courses: Course[];
  total: number;
  hasMore: boolean;
}

export interface UseInfiniteCoursesAdminParams {
  search?: string;
  holeCount?: "18" | "9" | "all";
  hasTees?: "yes" | "no" | "all";
}

// Interface for course with tee info (enriched data)
export interface CourseWithTeeInfo extends Course {
  tee_count: number;
  cr_range?: string; // e.g., "71.2-75.4"
}

export function useInfiniteCoursesAdmin(params: UseInfiniteCoursesAdminParams = {}) {
  const { search, holeCount, hasTees } = params;
  const limit = 20;

  return useInfiniteQuery<CoursesPageResponse>({
    queryKey: ["courses", "admin", "infinite", { search, holeCount, hasTees }],
    queryFn: async ({ pageParam = 0 }) => {
      // For now, fetch all courses and do client-side filtering/pagination
      // This can be updated to use backend pagination when available
      const response = await fetch(`${API_BASE_URL}/courses`);
      if (!response.ok) {
        throw new Error("Failed to fetch courses");
      }
      const allCourses: Course[] = await response.json();

      // Client-side filtering
      let filteredCourses = allCourses;

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        filteredCourses = filteredCourses.filter(
          (course) =>
            course.name.toLowerCase().includes(searchLower) ||
            (course.club_name && course.club_name.toLowerCase().includes(searchLower))
        );
      }

      // Hole count filter
      if (holeCount && holeCount !== "all") {
        const targetHoles = holeCount === "18" ? 18 : 9;
        filteredCourses = filteredCourses.filter(
          (course) => course.pars.holes.length === targetHoles
        );
      }

      // Client-side pagination
      const offset = pageParam as number;
      const paginatedCourses = filteredCourses.slice(offset, offset + limit);

      return {
        courses: paginatedCourses,
        total: filteredCourses.length,
        hasMore: offset + limit < filteredCourses.length,
      };
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) {
        return undefined;
      }
      const totalFetched = allPages.reduce((sum, page) => sum + page.courses.length, 0);
      return totalFetched;
    },
    initialPageParam: 0,
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCourseData) => {
      const response = await fetch(`${API_BASE_URL}/courses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      club_id,
    }: {
      id: number;
      name?: string;
      club_id?: number | null;
    }) => {
      const response = await fetch(`${API_BASE_URL}/courses/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, club_id }),
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["course", variables.id] });
    },
  });
}

export function useUpdateCourseHoles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      holes,
      stroke_index,
    }: {
      id: number;
      holes: number[];
      stroke_index?: number[];
    }) => {
      const response = await fetch(`${API_BASE_URL}/courses/${id}/holes`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pars: holes, stroke_index }),
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_BASE_URL}/courses/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      if (response.status === 204) {
        return null;
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

// Import types
export interface ImportScorecardHole {
  hole: number;
  par: number;
  hcp_men: number;
  hcp_women: number;
}

export interface ImportTeeRating {
  tee_name: string;
  men: { course_rating: number; slope: number } | null;
  women: { course_rating: number; slope: number } | null;
}

export interface ImportCourseMetadata {
  club_name: string;
  course_name: string;
  location?: string;
  total_par: number;
  total_holes: number;
}

export interface ImportCourseData {
  course_metadata: ImportCourseMetadata;
  scorecard: ImportScorecardHole[];
  tee_ratings: ImportTeeRating[];
}

export interface ImportCourseResult {
  success: boolean;
  courseName: string;
  courseId: number;
  action: "created" | "updated";
  teesProcessed: number;
  errors?: string[];
}

export function useImportCourses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ImportCourseData | ImportCourseData[]) => {
      const response = await fetch(`${API_BASE_URL}/courses/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Import failed");
      }
      return response.json() as Promise<ImportCourseResult[]>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

export function useImportForCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, data }: { courseId: number; data: ImportCourseData }) => {
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Import failed");
      }
      return response.json() as Promise<ImportCourseResult>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });
}

// Course Tee Rating Types
export type TeeRatingGender = "men" | "women";

export interface CourseTeeRating {
  id: number;
  tee_id: number;
  gender: TeeRatingGender;
  course_rating: number;
  slope_rating: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCourseTeeRatingData {
  gender: TeeRatingGender;
  course_rating: number;
  slope_rating?: number;
}

export interface UpdateCourseTeeRatingData {
  course_rating?: number;
  slope_rating?: number;
}

// Course Tee Types
export interface CourseTee {
  id: number;
  course_id: number;
  name: string;
  color?: string;
  // Legacy fields (kept for backward compatibility)
  course_rating: number;
  slope_rating: number;
  stroke_index?: number[];
  pars?: number[];
  // Gender-specific ratings (new)
  ratings?: CourseTeeRating[];
  created_at: string;
  updated_at: string;
}

export interface CreateCourseTeeData {
  name: string;
  color?: string;
  // Legacy fields (optional if ratings provided)
  course_rating?: number;
  slope_rating?: number;
  stroke_index?: number[];
  pars?: number[];
  // Gender-specific ratings (preferred)
  ratings?: CreateCourseTeeRatingData[];
}

export interface UpdateCourseTeeData {
  name?: string;
  color?: string;
  course_rating?: number;
  slope_rating?: number;
  stroke_index?: number[];
  pars?: number[];
}

// Course Tee Hooks
export function useCourseTees(courseId: number) {
  return useQuery<CourseTee[]>({
    queryKey: ["course-tees", courseId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/tees`);
      if (!response.ok) {
        throw new Error("Failed to fetch course tees");
      }
      return response.json();
    },
    enabled: !!courseId,
  });
}

export function useCourseTee(courseId: number, teeId: number) {
  return useQuery<CourseTee>({
    queryKey: ["course-tee", courseId, teeId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/tees/${teeId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch course tee");
      }
      return response.json();
    },
    enabled: !!courseId && !!teeId,
  });
}

export function useCreateCourseTee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, data }: { courseId: number; data: CreateCourseTeeData }) => {
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/tees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create course tee");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["course-tees", variables.courseId] });
    },
  });
}

export function useUpdateCourseTee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courseId,
      teeId,
      data,
    }: {
      courseId: number;
      teeId: number;
      data: UpdateCourseTeeData;
    }) => {
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/tees/${teeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update course tee");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["course-tees", variables.courseId] });
      queryClient.invalidateQueries({ queryKey: ["course-tee", variables.courseId, variables.teeId] });
    },
  });
}

export function useDeleteCourseTee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, teeId }: { courseId: number; teeId: number }) => {
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/tees/${teeId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete course tee");
      }
      return response.status === 204 ? null : response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["course-tees", variables.courseId] });
    },
  });
}

// Course Tee Rating Hooks
export function useCourseTeeRatings(courseId: number, teeId: number) {
  return useQuery<CourseTeeRating[]>({
    queryKey: ["course-tee-ratings", courseId, teeId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/tees/${teeId}/ratings`);
      if (!response.ok) {
        throw new Error("Failed to fetch course tee ratings");
      }
      return response.json();
    },
    enabled: !!courseId && !!teeId,
  });
}

export function useUpsertCourseTeeRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courseId,
      teeId,
      data,
    }: {
      courseId: number;
      teeId: number;
      data: CreateCourseTeeRatingData;
    }) => {
      const response = await fetch(`${API_BASE_URL}/courses/${courseId}/tees/${teeId}/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update course tee rating");
      }
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["course-tees", variables.courseId] });
      queryClient.invalidateQueries({ queryKey: ["course-tee", variables.courseId, variables.teeId] });
      queryClient.invalidateQueries({ queryKey: ["course-tee-ratings", variables.courseId, variables.teeId] });
    },
  });
}

export function useDeleteCourseTeeRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courseId,
      teeId,
      gender,
    }: {
      courseId: number;
      teeId: number;
      gender: TeeRatingGender;
    }) => {
      const response = await fetch(
        `${API_BASE_URL}/courses/${courseId}/tees/${teeId}/ratings/${gender}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete course tee rating");
      }
      return response.status === 204 ? null : response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["course-tees", variables.courseId] });
      queryClient.invalidateQueries({ queryKey: ["course-tee", variables.courseId, variables.teeId] });
      queryClient.invalidateQueries({ queryKey: ["course-tee-ratings", variables.courseId, variables.teeId] });
    },
  });
}

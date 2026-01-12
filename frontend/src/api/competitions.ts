import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";
import type { Series } from "./series";
import type { TeeTimeParticipant } from "./tee-times";

export interface Competition {
  id: number;
  name: string;
  date: string;
  course_id: number;
  series_id?: number;
  tour_id?: number;
  tee_id?: number;
  point_template_id?: number;
  manual_entry_format?: "out_in_total" | "total_only";
  points_multiplier: number;
  venue_type: "outdoor" | "indoor";
  start_mode: "scheduled" | "open";
  open_start?: string;
  open_end?: string;
  created_at: string;
  updated_at: string;
  participant_count: number;
  is_results_final?: boolean;
  results_finalized_at?: string;
}

// Enhanced Competition interface
export interface EnhancedCompetition extends Competition {
  series_name?: string;
  tour_name?: string;
}

export interface LeaderboardEntry {
  participant: TeeTimeParticipant & {
    player_id?: number;
    handicap_index?: number;
    category_id?: number;
    category_name?: string;
  };
  totalShots: number;
  holesPlayed: number;
  relativeToPar: number;
  startTime: string; // Start time from tee time data
  // Net score fields (only present for tours with net/both scoring mode)
  netTotalShots?: number;
  netRelativeToPar?: number;
  courseHandicap?: number;
  handicapStrokesPerHole?: number[];
  // DNF status (Did Not Finish - competition window closed before completion)
  isDNF?: boolean;
  // Points and position (for tour competitions)
  position?: number;
  points?: number;
  netPosition?: number;
  netPoints?: number;
  isProjected?: boolean; // true = calculated on-the-fly, false = from finalized results
}

export type TourScoringMode = "gross" | "net" | "both";

export interface TeeInfo {
  id: number;
  name: string;
  color?: string;
  courseRating: number;
  slopeRating: number;
  strokeIndex?: number[];
}

export interface LeaderboardCategory {
  id: number;
  tour_id: number;
  name: string;
  description?: string;
  sort_order: number;
  created_at: string;
}

export interface CategoryTee {
  categoryId: number;
  categoryName: string;
  teeId: number;
  teeName: string;
  courseRating: number;
  slopeRating: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  competitionId: number;
  scoringMode?: TourScoringMode;
  isTourCompetition?: boolean;
  isResultsFinal?: boolean;
  tee?: TeeInfo;
  categoryTees?: CategoryTee[];
  categories?: LeaderboardCategory[];
}

// New interface for team leaderboard entries
export interface TeamLeaderboardEntry {
  teamId: string;
  teamName: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "FINISHED";
  displayProgress: string; // E.g., "Starts 09:30", "Thru 14", or "F" for Finished.
  totalRelativeScore: number | null; // Null if not started.
  totalShots: number | null; // Null if not started.
  teamPoints: number | null; // Null if not started.
  startTime: string | null; // Start time from tee time data
}

export function useCompetitions() {
  return useQuery<Competition[]>({
    queryKey: ["competitions"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/competitions`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

export function useCompetition(competitionId: number) {
  return useQuery<EnhancedCompetition>({
    queryKey: ["competition", competitionId],
    queryFn: async () => {
      const competitionResponse = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}`
      );
      if (!competitionResponse.ok) {
        throw new Error("Network response was not ok");
      }
      const competition: Competition = await competitionResponse.json();

      let enhanced: EnhancedCompetition = { ...competition };

      // Fetch series details if series_id exists
      if (competition.series_id) {
        try {
          const seriesResponse = await fetch(
            `${API_BASE_URL}/series/${competition.series_id}`
          );
          if (seriesResponse.ok) {
            const series: Series = await seriesResponse.json();
            enhanced.series_name = series.name;
          }
        } catch (error) {
          console.error("Failed to fetch series details", error);
        }
      }

      // Fetch tour details if tour_id exists
      if (competition.tour_id) {
        try {
          const tourResponse = await fetch(
            `${API_BASE_URL}/tours/${competition.tour_id}`
          );
          if (tourResponse.ok) {
            const tour: { id: number; name: string } = await tourResponse.json();
            enhanced.tour_name = tour.name;
          }
        } catch (error) {
          console.error("Failed to fetch tour details", error);
        }
      }

      return enhanced;
    },
    enabled: competitionId > 0,
  });
}

export function useCompetitionLeaderboard(competitionId: number) {
  return useQuery<LeaderboardEntry[]>({
    queryKey: ["competition", competitionId, "leaderboard"],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/leaderboard`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: competitionId > 0,
  });
}

/**
 * Fetch leaderboard with full details including tee info and net scores
 */
export function useCompetitionLeaderboardWithDetails(competitionId: number) {
  return useQuery<LeaderboardResponse>({
    queryKey: ["competition", competitionId, "leaderboard", "details"],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/leaderboard/details`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: competitionId > 0,
  });
}

export function useCompetitionTeamLeaderboard(
  competitionId: number,
  numberOfTeams?: number
) {
  return useQuery<TeamLeaderboardEntry[]>({
    queryKey: ["competition", competitionId, "team-leaderboard", numberOfTeams],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/team-leaderboard`
      );
      return response.json();
    },
    enabled: competitionId > 0,
  });
}
export interface CreateCompetitionDto {
  name: string;
  date: string;
  course_id: number;
  series_id?: number;
  tour_id?: number;
  tee_id?: number;
  point_template_id?: number;
  manual_entry_format?: "out_in_total" | "total_only";
  points_multiplier?: number;
  venue_type?: "outdoor" | "indoor";
  start_mode?: "scheduled" | "open";
  open_start?: string;
  open_end?: string;
}

export interface UpdateCompetitionDto {
  name?: string;
  date?: string;
  course_id?: number;
  series_id?: number;
  tour_id?: number;
  tee_id?: number | null;
  point_template_id?: number | null;
  manual_entry_format?: "out_in_total" | "total_only";
  points_multiplier?: number;
  venue_type?: "outdoor" | "indoor";
  start_mode?: "scheduled" | "open";
  open_start?: string | null;
  open_end?: string | null;
}

export function useCreateCompetition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCompetitionDto): Promise<Competition> => {
      const response = await fetch(`${API_BASE_URL}/competitions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create competition");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competitions"] });
    },
  });
}

export function useUpdateCompetition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: UpdateCompetitionDto;
    }): Promise<Competition> => {
      const response = await fetch(`${API_BASE_URL}/competitions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update competition");
      return response.json();
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["competitions"] });
      queryClient.invalidateQueries({ queryKey: ["competition", id] });
    },
  });
}

export function useDeleteCompetition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      const response = await fetch(`${API_BASE_URL}/competitions/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete competition");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competitions"] });
    },
  });
}

// Competition Category Tee Mapping types and hooks
export interface CompetitionCategoryTee {
  id: number;
  competition_id: number;
  category_id: number;
  category_name?: string;
  tee_id: number;
  tee_name?: string;
  tee_color?: string;
  created_at?: string;
}

export interface CategoryTeeMapping {
  categoryId: number;
  teeId: number;
}

export function useCompetitionCategoryTees(competitionId: number) {
  return useQuery<CompetitionCategoryTee[]>({
    queryKey: ["competition", competitionId, "category-tees"],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/category-tees`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch category-tee mappings");
      }
      const data = await response.json();
      return data.categoryTees;
    },
    enabled: competitionId > 0,
  });
}

export function useSetCompetitionCategoryTees() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      competitionId,
      mappings,
    }: {
      competitionId: number;
      mappings: CategoryTeeMapping[];
    }): Promise<CompetitionCategoryTee[]> => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/category-tees`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mappings }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to set category-tee mappings");
      }
      const data = await response.json();
      return data.categoryTees;
    },
    onSuccess: (_, { competitionId }) => {
      queryClient.invalidateQueries({
        queryKey: ["competition", competitionId, "category-tees"],
      });
    },
  });
}

// Competition Results Finalization

export interface FinalizeResultsResponse {
  success: boolean;
  message: string;
  competition_id: number;
}

export function useFinalizeCompetitionResults() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (competitionId: number): Promise<FinalizeResultsResponse> => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/finalize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to finalize results");
      }
      return response.json();
    },
    onSuccess: (_, competitionId) => {
      // Invalidate competition and related queries
      queryClient.invalidateQueries({ queryKey: ["competition", competitionId] });
      queryClient.invalidateQueries({ queryKey: ["competitions"] });
      // Invalidate tour-related queries if this is a tour competition
      queryClient.invalidateQueries({ queryKey: ["tour-standings"] });
      queryClient.invalidateQueries({ queryKey: ["tour-competitions"] });
    },
  });
}

// Competition Admin types and hooks
export interface CompetitionAdmin {
  id: number;
  competition_id: number;
  user_id: number;
  email: string;
  role: string;
  created_at: string;
}

export function useCompetitionAdmins(competitionId: number) {
  return useQuery<CompetitionAdmin[]>({
    queryKey: ["competition", competitionId, "admins"],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/admins`,
        {
          credentials: "include",
        }
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: competitionId > 0,
  });
}

export function useAddCompetitionAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      competitionId,
      userId,
    }: {
      competitionId: number;
      userId: number;
    }) => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/admins`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ userId }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to add admin");
      }
      return response.json();
    },
    onSuccess: (_, { competitionId }) => {
      queryClient.invalidateQueries({
        queryKey: ["competition", competitionId, "admins"],
      });
    },
  });
}

export function useRemoveCompetitionAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      competitionId,
      userId,
    }: {
      competitionId: number;
      userId: number;
    }) => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/admins/${userId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to remove admin");
      }
      return response.json();
    },
    onSuccess: (_, { competitionId }) => {
      queryClient.invalidateQueries({
        queryKey: ["competition", competitionId, "admins"],
      });
    },
  });
}

// Stand-alone competitions hook
export function useStandAloneCompetitions() {
  return useQuery<Competition[]>({
    queryKey: ["competitions", "standalone"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/competitions/standalone`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

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
  manual_entry_format?: "out_in_total" | "total_only";
  points_multiplier: number;
  venue_type: "outdoor" | "indoor";
  start_mode: "scheduled" | "open";
  open_start?: string;
  open_end?: string;
  created_at: string;
  updated_at: string;
  participant_count: number;
}

// Enhanced Competition interface
export interface EnhancedCompetition extends Competition {
  series_name?: string;
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

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  competitionId: number;
  scoringMode?: TourScoringMode;
  tee?: TeeInfo;
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

      if (competition.series_id) {
        try {
          const seriesResponse = await fetch(
            `${API_BASE_URL}/series/${competition.series_id}`
          );
          if (seriesResponse.ok) {
            const series: Series = await seriesResponse.json();
            return { ...competition, series_name: series.name };
          }
        } catch (error) {
          console.error("Failed to fetch series details", error);
          // Return competition data even if series fetch fails
          return { ...competition, series_name: undefined };
        }
      }

      return competition;
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

import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";
import type { TeeTimeParticipant } from "./tee-times";

export interface Competition {
  id: number;
  name: string;
  date: string;
  course_id: number;
  series_id?: number;
  created_at: string;
  updated_at: string;
  participant_count: number;
}

export interface LeaderboardEntry {
  participant: TeeTimeParticipant;
  totalShots: number;
  holesPlayed: number;
  relativeToPar: number;
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
  return useQuery<Competition>({
    queryKey: ["competition", competitionId],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
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

export interface CreateCompetitionDto {
  name: string;
  date: string;
  course_id: number;
  series_id?: number;
}

export interface UpdateCompetitionDto {
  name?: string;
  date?: string;
  course_id?: number;
  series_id?: number;
}

// Note: These mutation hooks will be added when needed for admin functionality
// For now, competitions are read-only in the current implementation

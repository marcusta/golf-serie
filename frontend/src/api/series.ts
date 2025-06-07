import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";
import type { Competition } from "./competitions";
import type { Team } from "./teams";

export interface Series {
  id: number;
  name: string;
  description?: string;
  banner_image_url?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateSeriesDto {
  name: string;
  description?: string;
  banner_image_url?: string;
  is_public?: boolean;
}

export interface UpdateSeriesDto {
  name?: string;
  description?: string;
  banner_image_url?: string;
  is_public?: boolean;
}

export interface SeriesTeamStanding {
  team_id: number;
  team_name: string;
  total_points: number;
  competitions_played: number;
  position: number;
  competitions: {
    competition_id: number;
    competition_name: string;
    competition_date: string;
    points: number;
    position: number;
  }[];
}

export interface SeriesStandings {
  series: Series;
  team_standings: SeriesTeamStanding[];
  total_competitions: number;
}

export function useSeries() {
  return useQuery<Series[]>({
    queryKey: ["series"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/series`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

export function usePublicSeries() {
  return useQuery<Series[]>({
    queryKey: ["series", "public"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/series/public`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

export function useSingleSeries(id: number) {
  return useQuery<Series>({
    queryKey: ["series", id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/series/${id}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: id > 0,
  });
}

export function useSeriesStandings(id: number) {
  return useQuery<SeriesStandings>({
    queryKey: ["series", id, "standings"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/series/${id}/standings`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: id > 0,
  });
}

export function useSeriesCompetitions(id: number) {
  return useQuery<Competition[]>({
    queryKey: ["series", id, "competitions"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/series/${id}/competitions`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: id > 0,
  });
}

export function useSeriesTeams(id: number) {
  return useQuery<Team[]>({
    queryKey: ["series", id, "teams"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/series/${id}/teams`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: id > 0,
  });
}

export function useCreateSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSeriesDto) => {
      const response = await fetch(`${API_BASE_URL}/series`, {
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
      queryClient.invalidateQueries({ queryKey: ["series"] });
    },
  });
}

export function useUpdateSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateSeriesDto }) => {
      const response = await fetch(`${API_BASE_URL}/series/${id}`, {
        method: "PUT",
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
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["series"] });
      queryClient.invalidateQueries({ queryKey: ["series", id] });
      queryClient.invalidateQueries({ queryKey: ["series", "public"] });
    },
  });
}

export function useDeleteSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_BASE_URL}/series/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["series"] });
      queryClient.invalidateQueries({ queryKey: ["series", "public"] });
    },
  });
}

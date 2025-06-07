import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Competition } from "./competitions";
import { API_BASE_URL } from "./config";
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

export interface SeriesDocument {
  id: number;
  series_id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSeriesDocumentDto {
  title: string;
  content: string;
}

export interface UpdateSeriesDocumentDto {
  title?: string;
  content?: string;
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

export function useAvailableTeams(seriesId: number) {
  return useQuery<Team[]>({
    queryKey: ["series", seriesId, "available-teams"],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/series/${seriesId}/available-teams`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: seriesId > 0,
  });
}

export function useAddTeamToSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      seriesId,
      teamId,
    }: {
      seriesId: number;
      teamId: number;
    }) => {
      const response = await fetch(
        `${API_BASE_URL}/series/${seriesId}/teams/${teamId}`,
        {
          method: "POST",
        }
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    onSuccess: (_, { seriesId }) => {
      queryClient.invalidateQueries({
        queryKey: ["series", seriesId, "teams"],
      });
      queryClient.invalidateQueries({
        queryKey: ["series", seriesId, "available-teams"],
      });
      queryClient.invalidateQueries({
        queryKey: ["series", seriesId, "standings"],
      });
    },
  });
}

export function useRemoveTeamFromSeries() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      seriesId,
      teamId,
    }: {
      seriesId: number;
      teamId: number;
    }) => {
      const response = await fetch(
        `${API_BASE_URL}/series/${seriesId}/teams/${teamId}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    onSuccess: (_, { seriesId }) => {
      queryClient.invalidateQueries({
        queryKey: ["series", seriesId, "teams"],
      });
      queryClient.invalidateQueries({
        queryKey: ["series", seriesId, "available-teams"],
      });
      queryClient.invalidateQueries({
        queryKey: ["series", seriesId, "standings"],
      });
    },
  });
}

// Series documents functions
export function useSeriesDocuments(seriesId: number) {
  return useQuery<SeriesDocument[]>({
    queryKey: ["series", seriesId, "documents"],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/series/${seriesId}/documents`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    enabled: seriesId > 0,
  });
}

export function useCreateSeriesDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      seriesId,
      data,
    }: {
      seriesId: number;
      data: CreateSeriesDocumentDto;
    }) => {
      const response = await fetch(
        `${API_BASE_URL}/series/${seriesId}/documents`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    onSuccess: (_, { seriesId }) => {
      queryClient.invalidateQueries({
        queryKey: ["series", seriesId, "documents"],
      });
    },
  });
}

export function useUpdateSeriesDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      seriesId,
      documentId,
      data,
    }: {
      seriesId: number;
      documentId: number;
      data: UpdateSeriesDocumentDto;
    }) => {
      const response = await fetch(
        `${API_BASE_URL}/series/${seriesId}/documents/${documentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    onSuccess: (_, { seriesId }) => {
      queryClient.invalidateQueries({
        queryKey: ["series", seriesId, "documents"],
      });
    },
  });
}

export function useDeleteSeriesDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      seriesId,
      documentId,
    }: {
      seriesId: number;
      documentId: number;
    }) => {
      const response = await fetch(
        `${API_BASE_URL}/series/${seriesId}/documents/${documentId}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
    onSuccess: (_, { seriesId }) => {
      queryClient.invalidateQueries({
        queryKey: ["series", seriesId, "documents"],
      });
    },
  });
}

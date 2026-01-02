import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";

export interface PointTemplate {
  id: number;
  name: string;
  points_structure: string; // JSON string
  created_by: number | null;
  tour_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface PointsStructure {
  [position: string]: number;
}

export function usePointTemplates() {
  return useQuery<PointTemplate[]>({
    queryKey: ["pointTemplates"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/point-templates`);
      if (!response.ok) {
        throw new Error("Failed to fetch point templates");
      }
      return response.json();
    },
  });
}

export function usePointTemplate(id: number) {
  return useQuery<PointTemplate>({
    queryKey: ["pointTemplate", id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/point-templates/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch point template");
      }
      return response.json();
    },
    enabled: !!id,
  });
}

export function useCreatePointTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; points_structure: PointsStructure }) => {
      const response = await fetch(`${API_BASE_URL}/point-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create point template");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pointTemplates"] });
    },
  });
}

export function useUpdatePointTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: { name?: string; points_structure?: PointsStructure };
    }) => {
      const response = await fetch(`${API_BASE_URL}/point-templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update point template");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pointTemplates"] });
    },
  });
}

export function useDeletePointTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_BASE_URL}/point-templates/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete point template");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pointTemplates"] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// Tour-scoped Point Template Hooks
// ─────────────────────────────────────────────────────────────────

export function useTourPointTemplates(tourId: number) {
  return useQuery<PointTemplate[]>({
    queryKey: ["tour-point-templates", tourId],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/tours/${tourId}/point-templates`,
        { credentials: "include" }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch tour point templates");
      }
      return response.json();
    },
    enabled: !!tourId,
  });
}

export function useCreateTourPointTemplate(tourId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      points_structure: PointsStructure;
    }) => {
      const response = await fetch(
        `${API_BASE_URL}/tours/${tourId}/point-templates`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create point template");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tour-point-templates", tourId],
      });
    },
  });
}

export function useUpdateTourPointTemplate(tourId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      data,
    }: {
      templateId: number;
      data: { name?: string; points_structure?: PointsStructure };
    }) => {
      const response = await fetch(
        `${API_BASE_URL}/tours/${tourId}/point-templates/${templateId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(data),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update point template");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tour-point-templates", tourId],
      });
    },
  });
}

export function useDeleteTourPointTemplate(tourId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: number) => {
      const response = await fetch(
        `${API_BASE_URL}/tours/${tourId}/point-templates/${templateId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete point template");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["tour-point-templates", tourId],
      });
    },
  });
}

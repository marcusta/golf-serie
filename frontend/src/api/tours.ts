import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";

export interface Tour {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

export function useTours() {
  return useQuery<Tour[]>({
    queryKey: ["tours"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/tours`);
      if (!response.ok) {
        throw new Error("Failed to fetch tours");
      }
      return response.json();
    },
  });
}

export function useTour(id: number) {
  return useQuery<Tour>({
    queryKey: ["tour", id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/tours/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch tour");
      }
      return response.json();
    },
    enabled: !!id,
  });
}

export function useCreateTour() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await fetch(`${API_BASE_URL}/tours`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create tour");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tours"] });
    },
  });
}

export function useUpdateTour() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: { name?: string; description?: string };
    }) => {
      const response = await fetch(`${API_BASE_URL}/tours/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update tour");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tours"] });
    },
  });
}

export function useDeleteTour() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_BASE_URL}/tours/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete tour");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tours"] });
    },
  });
}

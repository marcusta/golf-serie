import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";

export interface CompetitionGuest {
  id: number;
  competition_id: number;
  name: string;
  handicap_index: number | null;
  created_at: string;
}

export function useCompetitionGuests(competitionId: number) {
  return useQuery<CompetitionGuest[]>({
    queryKey: ["competition-guests", competitionId],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/guests`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch guests");
      }
      return response.json();
    },
  });
}

interface CreateGuestParams {
  competitionId: number;
  name: string;
  handicap_index?: number | null;
}

export function useCreateGuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      competitionId,
      name,
      handicap_index,
    }: CreateGuestParams) => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/guests`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ name, handicap_index }),
        }
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to add guest");
      }
      return response.json() as Promise<CompetitionGuest>;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["competition-guests", variables.competitionId],
      });
    },
  });
}

interface DeleteGuestParams {
  competitionId: number;
  guestId: number;
}

export function useDeleteGuest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ competitionId, guestId }: DeleteGuestParams) => {
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/guests/${guestId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete guest");
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["competition-guests", variables.competitionId],
      });
    },
  });
}

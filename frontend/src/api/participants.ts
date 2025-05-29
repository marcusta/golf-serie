import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";

export interface Participant {
  id: number;
  tee_order: number;
  team_id: number;
  tee_time_id: number;
  position_name: string;
  player_names?: string;
  score: number[];
  created_at: string;
  updated_at: string;
  team_name: string;
}

export function useParticipants() {
  return useQuery<Participant[]>({
    queryKey: ["participants"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/participants`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

export function useParticipant(id: number) {
  return useQuery<Participant>({
    queryKey: ["participant", id],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/participants/${id}`);
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      return response.json();
    },
  });
}

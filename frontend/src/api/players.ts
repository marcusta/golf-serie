import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "./config";

export interface Player {
  id: number;
  name: string;
  handicap: number;
  user_id?: number;
}

/**
 * Fetch all players (for game setup player search)
 */
export function usePlayers() {
  return useQuery<Player[]>({
    queryKey: ["players"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/players`);
      if (!response.ok) {
        throw new Error("Failed to fetch players");
      }
      return response.json();
    },
  });
}

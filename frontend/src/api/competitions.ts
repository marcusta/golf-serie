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
  manual_entry_format?: "out_in_total" | "total_only";
  created_at: string;
  updated_at: string;
  participant_count: number;
}

// Enhanced Competition interface
export interface EnhancedCompetition extends Competition {
  series_name?: string;
}

export interface LeaderboardEntry {
  participant: TeeTimeParticipant;
  totalShots: number;
  holesPlayed: number;
  relativeToPar: number;
  startTime: string; // Start time from tee time data
}

// New interface for team leaderboard entries
export interface TeamLeaderboardEntry {
  teamId: string;
  teamName: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "FINISHED";
  startTime: string | null; // Earliest start time. MUST NOT be null if status is 'NOT_STARTED'.
  displayProgress: string; // E.g., "Starts 09:30", "Thru 14", or "F" for Finished.
  totalRelativeScore: number | null; // Null if not started.
  totalShots: number | null; // Null if not started.
  teamPoints: number | null; // Null if not started.
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

// New hook for team leaderboard data
export function useCompetitionTeamLeaderboard(competitionId: number) {
  return useQuery<TeamLeaderboardEntry[]>({
    queryKey: ["competition", competitionId, "team-leaderboard"],
    queryFn: async () => {
      // For now, this will fall back to the regular leaderboard and transform the data
      // In a real implementation, this would call a dedicated team leaderboard endpoint
      const response = await fetch(
        `${API_BASE_URL}/competitions/${competitionId}/teams`
      );
      if (!response.ok) {
        // Fallback to transforming regular leaderboard data
        const leaderboardResponse = await fetch(
          `${API_BASE_URL}/competitions/${competitionId}/leaderboard`
        );
        if (!leaderboardResponse.ok) {
          throw new Error("Network response was not ok");
        }
        const leaderboard: LeaderboardEntry[] =
          await leaderboardResponse.json();

        // Transform leaderboard data to team leaderboard format
        return transformLeaderboardToTeamLeaderboard(leaderboard);
      }
      return response.json();
    },
    enabled: competitionId > 0,
  });
}

// Helper function to transform regular leaderboard to team leaderboard format
function transformLeaderboardToTeamLeaderboard(
  leaderboard: LeaderboardEntry[]
): TeamLeaderboardEntry[] {
  interface TeamGroup {
    teamId: string;
    teamName: string;
    participants: LeaderboardEntry[];
    totalShots: number;
    totalRelativeScore: number;
    hasStarted: boolean;
    hasFinished: boolean;
    maxHolesCompleted: number;
    startTime: string | null;
  }

  // Group participants by team
  const teamGroups = leaderboard.reduce((acc, entry) => {
    const teamName = entry.participant.team_name;
    if (!acc[teamName]) {
      acc[teamName] = {
        teamId: teamName, // Using team name as ID for now
        teamName,
        participants: [],
        totalShots: 0,
        totalRelativeScore: 0,
        hasStarted: false,
        hasFinished: false,
        maxHolesCompleted: 0,
        startTime: null, // Will be populated from tee time data
      };
    }

    const hasStarted = entry.holesPlayed > 0;
    const isFinished =
      entry.participant.is_locked && !entry.participant.score.includes(-1);
    const hasInvalidRound = entry.participant.score.includes(-1);

    acc[teamName].participants.push(entry);

    if (hasStarted) {
      acc[teamName].hasStarted = true;
      if (!hasInvalidRound) {
        acc[teamName].totalShots += entry.totalShots;
        acc[teamName].totalRelativeScore += entry.relativeToPar;
      }
      acc[teamName].maxHolesCompleted = Math.max(
        acc[teamName].maxHolesCompleted,
        entry.holesPlayed
      );
    }

    if (isFinished) {
      acc[teamName].hasFinished = true;
    }

    return acc;
  }, {} as Record<string, TeamGroup>);

  // Populate start times from participant data
  Object.values(teamGroups).forEach((team: TeamGroup) => {
    // Find the earliest start time for any participant in this team
    let earliestStartTime: string | null = null;

    team.participants.forEach((participant) => {
      if (participant.startTime) {
        if (!earliestStartTime || participant.startTime < earliestStartTime) {
          earliestStartTime = participant.startTime;
        }
      }
    });

    if (earliestStartTime) {
      // earliestStartTime is already in "HH:MM" format, use it directly
      team.startTime = earliestStartTime;
    }
  });

  // Convert to TeamLeaderboardEntry format
  return Object.values(teamGroups)
    .map((team: TeamGroup) => {
      const allFinished = team.participants.every(
        (p: LeaderboardEntry) =>
          p.participant.is_locked && !p.participant.score.includes(-1)
      );
      const anyStarted = team.participants.some(
        (p: LeaderboardEntry) => p.holesPlayed > 0
      );

      let status: "NOT_STARTED" | "IN_PROGRESS" | "FINISHED";
      let displayProgress: string;

      if (!anyStarted) {
        status = "NOT_STARTED";
        displayProgress = team.startTime
          ? `Starts ${team.startTime}`
          : "Starts TBD";
      } else if (allFinished) {
        status = "FINISHED";
        displayProgress = "F";
      } else {
        status = "IN_PROGRESS";
        displayProgress = `Thru ${team.maxHolesCompleted}`;
      }

      return {
        teamId: team.teamId,
        teamName: team.teamName,
        status,
        startTime: team.startTime,
        displayProgress,
        totalRelativeScore: anyStarted ? team.totalRelativeScore : null,
        totalShots: anyStarted ? team.totalShots : null,
        teamPoints: anyStarted
          ? calculateTeamPoints(team.totalRelativeScore, 1)
          : null, // Simplified points calculation
      };
    })
    .sort((a, b) => {
      // Sort by status first (finished, in progress, not started), then by score
      if (a.status !== b.status) {
        const statusOrder = { FINISHED: 0, IN_PROGRESS: 1, NOT_STARTED: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      }

      if (a.totalRelativeScore !== null && b.totalRelativeScore !== null) {
        return a.totalRelativeScore - b.totalRelativeScore;
      }

      return 0;
    });
}

// Simple team points calculation (would be more sophisticated in real implementation)
function calculateTeamPoints(_relativeScore: number, position: number): number {
  // Placeholder calculation - would use proper series team count and position
  return Math.max(1, 20 - position);
}

export interface CreateCompetitionDto {
  name: string;
  date: string;
  course_id: number;
  series_id?: number;
  manual_entry_format?: "out_in_total" | "total_only";
}

export interface UpdateCompetitionDto {
  name?: string;
  date?: string;
  course_id?: number;
  series_id?: number;
  manual_entry_format?: "out_in_total" | "total_only";
}

// Note: These mutation hooks will be added when needed for admin functionality
// For now, competitions are read-only in the current implementation

export function useCreateCompetition() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCompetitionDto): Promise<Competition> => {
      const response = await fetch(`${API_BASE_URL}/competitions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create competition");
      }

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to update competition");
      }

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

      if (!response.ok) {
        throw new Error("Failed to delete competition");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["competitions"] });
    },
  });
}

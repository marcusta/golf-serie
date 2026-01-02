import type { UseMutationResult } from "@tanstack/react-query";
import {
  useCompetition,
  useCompetitionLeaderboard,
  useCompetitionTeamLeaderboard,
} from "../api/competitions";
import type {
  EnhancedCompetition,
  LeaderboardEntry,
  TeamLeaderboardEntry,
} from "../api/competitions";
import { useCourse } from "../api/courses";
import type { Course } from "../api/courses";
import {
  useParticipant,
  useTeeTime,
  useTeeTimesForCompetition,
  useUpdateScore,
} from "../api/tee-times";
import type { TeeTime, TeeTimeParticipant } from "../api/tee-times";

interface UseCompetitionDataProps {
  competitionId?: string;
  teeTimeId?: string;
  selectedParticipantId?: number | null;
}

/** Return type for useCompetitionData hook */
export interface UseCompetitionDataResult {
  // Data
  competition: EnhancedCompetition | undefined;
  course: Course | undefined;
  teeTimes: TeeTime[] | undefined;
  leaderboard: LeaderboardEntry[] | undefined;
  teamLeaderboard: TeamLeaderboardEntry[] | undefined;
  teeTime: TeeTime | undefined;
  selectedParticipant: TeeTimeParticipant | undefined;
  // Loading states
  isLoading: boolean;
  leaderboardLoading: boolean;
  teamLeaderboardLoading: boolean;
  // Refetch functions
  refetchTeeTime: () => Promise<unknown>;
  refetchLeaderboard: () => Promise<unknown>;
  refetchTeamLeaderboard: () => Promise<unknown>;
  refetchTeeTimes: () => Promise<unknown>;
  // Mutations
  updateScoreMutation: UseMutationResult<
    TeeTimeParticipant,
    Error,
    { participantId: number; hole: number; shots: number }
  >;
}

export function useCompetitionData({
  competitionId,
  teeTimeId,
  selectedParticipantId,
}: UseCompetitionDataProps): UseCompetitionDataResult {
  // Main competition data - now returns EnhancedCompetition with series info
  const { data: competition, isLoading: competitionLoading } = useCompetition(
    competitionId ? parseInt(competitionId) : 0
  );

  // Course data
  const { data: course } = useCourse(competition?.course_id || 0);

  // Tee times and leaderboard data
  const { data: teeTimes, refetch: refetchTeeTimes } =
    useTeeTimesForCompetition(competitionId ? parseInt(competitionId) : 0);

  const {
    data: rawLeaderboard,
    isLoading: leaderboardLoading,
    refetch: refetchLeaderboard,
  } = useCompetitionLeaderboard(competitionId ? parseInt(competitionId) : 0);

  // Use leaderboard data directly from API (now includes start time)
  const leaderboard = rawLeaderboard;

  // Team leaderboard data
  const {
    data: teamLeaderboard,
    isLoading: teamLeaderboardLoading,
    refetch: refetchTeamLeaderboard,
  } = useCompetitionTeamLeaderboard(
    competitionId ? parseInt(competitionId) : 0
  );

  // Tee time data for score entry
  const { data: teeTime, refetch: refetchTeeTime } = useTeeTime(
    teeTimeId ? parseInt(teeTimeId) : 0
  );

  // Selected participant data for scorecard
  const { data: selectedParticipant } = useParticipant(
    selectedParticipantId || 0
  );

  // Update score mutation
  const updateScoreMutation = useUpdateScore();

  return {
    competition,
    course,
    teeTimes,
    leaderboard,
    teamLeaderboard,
    teeTime,
    selectedParticipant,
    isLoading: competitionLoading,
    leaderboardLoading,
    teamLeaderboardLoading,
    refetchTeeTime,
    refetchLeaderboard,
    refetchTeamLeaderboard,
    refetchTeeTimes,
    updateScoreMutation,
  };
}

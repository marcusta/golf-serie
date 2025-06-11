import { useCompetition, useCompetitionLeaderboard } from "../api/competitions";
import { useCourse } from "../api/courses";
import {
  useParticipant,
  useTeeTime,
  useTeeTimesForCompetition,
  useUpdateScore,
} from "../api/tee-times";

interface UseCompetitionDataProps {
  competitionId?: string;
  teeTimeId?: string;
  selectedParticipantId?: number | null;
}

export function useCompetitionData({
  competitionId,
  teeTimeId,
  selectedParticipantId,
}: UseCompetitionDataProps) {
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
    data: leaderboard,
    isLoading: leaderboardLoading,
    refetch: refetchLeaderboard,
  } = useCompetitionLeaderboard(competitionId ? parseInt(competitionId) : 0);

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
    teeTime,
    selectedParticipant,
    isLoading: competitionLoading,
    leaderboardLoading,
    refetchTeeTime,
    refetchLeaderboard,
    refetchTeeTimes,
    updateScoreMutation,
  };
}

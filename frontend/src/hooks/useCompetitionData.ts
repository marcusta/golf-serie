import {
  useCompetition,
  useCompetitionLeaderboard,
  useCompetitionTeamLeaderboard,
} from "../api/competitions";
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

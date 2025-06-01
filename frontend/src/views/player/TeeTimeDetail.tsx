import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import {
  useTeeTime,
  useUpdateScore,
  type TeeTimeParticipant,
} from "../../api/tee-times";
import { ScoreEntry } from "../../components/score-entry";
import {
  calculateTotalPlayers,
  formatParticipantTypeDisplay,
  isMultiPlayerFormat,
} from "../../utils/playerUtils";

export default function TeeTimeDetail() {
  const { competitionId, teeTimeId } = useParams({ strict: false });
  const { data: teeTime, isLoading } = useTeeTime(
    teeTimeId ? parseInt(teeTimeId) : 0
  );
  const updateScoreMutation = useUpdateScore();

  if (isLoading) return <div className="p-4">Loading tee time...</div>;
  if (!teeTime) return <div className="p-4">Tee time not found</div>;

  const handleScoreUpdate = (
    participantId: string,
    hole: number,
    score: number
  ) => {
    updateScoreMutation.mutate({
      participantId: parseInt(participantId),
      hole,
      shots: score,
    });
    // Note: All score states are now represented as numbers:
    // -1 = gave up, 0 = unreported, 1+ = actual scores
  };

  const handleComplete = () => {
    // You could add a completion message or redirect here
    console.log("Score entry completed!");
  };

  // Calculate total actual players for display
  const totalActualPlayers = calculateTotalPlayers(teeTime.participants);

  // Transform tee time data to match ScoreEntry component's expected format
  const teeTimeGroup = {
    id: teeTime.id.toString(),
    players: teeTime.participants.map((participant: TeeTimeParticipant) => ({
      participantId: participant.id.toString(),
      participantName: participant.team_name,
      participantType: formatParticipantTypeDisplay(participant.position_name),
      isMultiPlayer: isMultiPlayerFormat(participant.position_name),
      scores: participant.score,
    })),
  };

  const course = {
    id: teeTime.id.toString(),
    name: `${teeTime.course_name} ${teeTime.teetime}`,
    holes: teeTime.pars.map((par: number, index: number) => ({
      number: index + 1,
      par,
    })),
  };

  return (
    <div className="h-screen-mobile flex flex-col bg-gray-50">
      {/* Minimal back navigation - only shown when needed */}
      <div className="absolute top-2 left-2 z-10">
        <Link
          to={`/player/competitions/${competitionId}`}
          className="p-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full shadow-sm transition-all touch-manipulation"
        >
          <ArrowLeft className="h-4 w-4 text-gray-700" />
        </Link>
      </div>

      {/* Player count indicator */}
      {totalActualPlayers > 4 && (
        <div className="absolute top-2 right-2 z-10">
          <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
            ⚠️ {totalActualPlayers}/4 players
          </div>
        </div>
      )}

      {/* Full-screen optimized score entry */}
      <ScoreEntry
        teeTimeGroup={teeTimeGroup}
        course={course}
        onScoreUpdate={handleScoreUpdate}
        onComplete={handleComplete}
      />
    </div>
  );
}

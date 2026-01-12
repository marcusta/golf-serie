import { Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Share2 } from "lucide-react";
import { useState } from "react";
import { PlayerPageLayout } from "../../components/layout/PlayerPageLayout";
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
import { Button } from "../../components/ui/button";
import { QRCodeDialog } from "../../components/competition/QRCodeDialog";
import { getTeeTimeUrl } from "../../utils/qrCodeUrls";

export default function TeeTimeDetail() {
  const { competitionId, teeTimeId } = useParams({ strict: false });
  const [showShareDialog, setShowShareDialog] = useState(false);
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
      playerNames: participant.player_name,
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
    <PlayerPageLayout
      title={`Tee ${teeTime.teetime}`}
      subtitle={teeTime.course_name}
      onBackClick={() => window.history.back()}
      customActions={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowShareDialog(true)}
          className="text-turf hover:text-fairway hover:bg-turf/10"
        >
          <Share2 className="h-5 w-5" />
        </Button>
      }
      className="h-screen flex flex-col"
    >
      <div className="flex-1 bg-gray-50">
        <Link
          to={`/player/competitions/${competitionId}`}
          className="absolute top-2 left-2 z-10 p-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full shadow-sm transition-all touch-manipulation"
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

      {/* Share Dialog */}
      {competitionId && teeTimeId && (
        <QRCodeDialog
          open={showShareDialog}
          onOpenChange={setShowShareDialog}
          url={getTeeTimeUrl(parseInt(competitionId), parseInt(teeTimeId))}
          title="Share Scorecard"
          description="Share this QR code or link to get others to this scorecard"
        />
      )}
    </PlayerPageLayout>
  );
}

import { useState, useEffect } from "react";
import { useParams } from "@tanstack/react-router";
import { useCompetition } from "../../api/competitions";
import { useCourse } from "../../api/courses";
import { useTeams } from "../../api/teams";
import { useSeriesTeams } from "../../api/series";
import { useTourEnrollments } from "../../api/tours";
import { useTeeTimesForCompetition } from "../../api/tee-times";
import ParticipantAssignment from "../../components/ParticipantAssignment";
import TourPlayerAssignment from "../../components/TourPlayerAssignment";
import { EditParticipantHandicapDialog } from "../../components/EditParticipantHandicapDialog";
import { AdminEditScoreDialog } from "../../components/admin/AdminEditScoreDialog";
import { AdminDQDialog } from "../../components/admin/AdminDQDialog";
import { QRCodeDialog } from "../../components/competition/QRCodeDialog";
import { getTeeTimeUrl } from "../../utils/qrCodeUrls";
import {
  CompetitionHeader,
  TeeTimeList,
  TeeTimeCreationForm,
  IndoorWaveManager,
  TourEnrollmentSelector,
  SeriesTeamSelector,
  BulkStartHoleSetter,
  useParticipantDialogs,
} from "./competition";

interface ParticipantType {
  id: string;
  name: string;
}

export default function AdminCompetitionTeeTimes() {
  const { competitionId } = useParams({ strict: false });
  const { data: competition, isLoading: competitionLoading } = useCompetition(
    competitionId ? parseInt(competitionId) : 0
  );
  const { data: allTeams } = useTeams();
  const { data: seriesTeams } = useSeriesTeams(competition?.series_id || 0);
  const { data: teeTimes, refetch: refetchTeeTimes } =
    useTeeTimesForCompetition(competitionId ? parseInt(competitionId) : 0);
  const { data: tourEnrollments } = useTourEnrollments(competition?.tour_id || 0, "active");
  const { data: course } = useCourse(competition?.course_id || 0);

  const teams = competition?.series_id ? seriesTeams : allTeams;

  // State for series competition
  const [participantTypes, setParticipantTypes] = useState<ParticipantType[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<number[]>([]);
  const [hasAnalyzedExistingData, setHasAnalyzedExistingData] = useState(false);
  const [selectedEnrollments, setSelectedEnrollments] = useState<number[]>([]);

  // Dialog management via custom hook
  const dialogs = useParticipantDialogs(() => refetchTeeTimes());

  // Auto-analyze existing tee times
  useEffect(() => {
    if (teeTimes && teeTimes.length > 0 && teams && !hasAnalyzedExistingData) {
      const foundTeamIds = new Set<number>();
      const foundParticipantTypes = new Set<string>();

      teeTimes.forEach((teeTime) => {
        teeTime.participants.forEach((participant) => {
          foundTeamIds.add(participant.team_id);
          foundParticipantTypes.add(participant.position_name);
        });
      });

      if (foundTeamIds.size > 0 || foundParticipantTypes.size > 0) {
        setSelectedTeams(Array.from(foundTeamIds));
        setParticipantTypes(
          Array.from(foundParticipantTypes).map((name) => ({
            id: crypto.randomUUID(),
            name,
          }))
        );
      }
      setHasAnalyzedExistingData(true);
    }
  }, [teeTimes, teams, hasAnalyzedExistingData]);

  if (competitionLoading) return <div>Loading competition...</div>;
  if (!competition) return <div>Competition not found</div>;

  const handleRefetch = () => refetchTeeTimes();

  return (
    <div className="space-y-6">
      <CompetitionHeader competition={competition} />

      {competition?.series_id && (
        <SeriesTeamSelector
          teams={teams}
          selectedTeams={selectedTeams}
          participantTypes={participantTypes}
          hasAnalyzedExistingData={hasAnalyzedExistingData && Boolean(teeTimes && teeTimes.length > 0)}
          onTeamSelection={(teamId) =>
            setSelectedTeams((prev) =>
              prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
            )
          }
          onAddParticipantType={() =>
            setParticipantTypes([...participantTypes, { id: crypto.randomUUID(), name: "" }])
          }
          onParticipantTypeChange={(id, name) =>
            setParticipantTypes(participantTypes.map((t) => (t.id === id ? { ...t, name } : t)))
          }
          onRemoveParticipantType={(id) =>
            setParticipantTypes(participantTypes.filter((t) => t.id !== id))
          }
        />
      )}

      {competition?.tour_id && (
        <TourEnrollmentSelector
          tourEnrollments={tourEnrollments}
          teeTimes={teeTimes}
          selectedEnrollments={selectedEnrollments}
          onEnrollmentSelection={(enrollmentId) =>
            setSelectedEnrollments((prev) =>
              prev.includes(enrollmentId)
                ? prev.filter((id) => id !== enrollmentId)
                : [...prev, enrollmentId]
            )
          }
          onSelectAll={() => {
            if (!tourEnrollments) return;
            const unassignedIds = tourEnrollments
              .filter((e) => !teeTimes?.some((tt) => tt.participants.some((p) => p.player_id === e.player_id)))
              .map((e) => e.id);
            setSelectedEnrollments(
              selectedEnrollments.length === unassignedIds.length ? [] : unassignedIds
            );
          }}
        />
      )}

      {competition?.venue_type === "indoor" ? (
        <IndoorWaveManager competitionId={competitionId!} onRefetch={handleRefetch} />
      ) : (
        <TeeTimeCreationForm competitionId={competitionId!} teeTimes={teeTimes} onRefetch={handleRefetch} />
      )}

      {competition?.venue_type === "outdoor" && (
        <BulkStartHoleSetter teeTimes={teeTimes} onRefetch={handleRefetch} />
      )}

      {teeTimes && teeTimes.length > 0 && (
        <TeeTimeList
          teeTimes={teeTimes}
          competition={competition}
          competitionId={competitionId!}
          tourEnrollments={tourEnrollments}
          onRefetch={handleRefetch}
          onEditHandicap={dialogs.openHandicapDialog}
          onEditScore={dialogs.openScoreDialog}
          onDQ={dialogs.openDQDialog}
          onShowQRCode={dialogs.openQRDialog}
          getTeeTimeUrl={getTeeTimeUrl}
        />
      )}

      {competition?.series_id &&
        selectedTeams.length > 0 &&
        participantTypes.length > 0 &&
        teeTimes &&
        teeTimes.length > 0 && (
          <ParticipantAssignment
            selectedTeams={teams?.filter((team) => selectedTeams.includes(team.id)) || []}
            participantTypes={participantTypes}
            teeTimes={teeTimes}
            onAssignmentsChange={handleRefetch}
          />
        )}

      {competition?.tour_id &&
        selectedEnrollments.length > 0 &&
        teeTimes &&
        teeTimes.length > 0 &&
        teams &&
        teams.length > 0 && (
          <TourPlayerAssignment
            selectedEnrollments={tourEnrollments?.filter((e) => selectedEnrollments.includes(e.id)) || []}
            allEnrollments={tourEnrollments || []}
            teeTimes={teeTimes}
            defaultTeamId={teams[0].id}
            onAssignmentsChange={handleRefetch}
          />
        )}

      {/* Dialogs */}
      {dialogs.selectedParticipantForHandicap && (
        <EditParticipantHandicapDialog
          open={dialogs.editHandicapDialogOpen}
          onOpenChange={dialogs.closeHandicapDialog}
          participantId={dialogs.selectedParticipantForHandicap.id}
          participantName={dialogs.selectedParticipantForHandicap.name}
          currentHandicap={dialogs.selectedParticipantForHandicap.handicap_index}
        />
      )}

      {dialogs.selectedParticipantForScore && (
        <AdminEditScoreDialog
          open={dialogs.editScoreDialogOpen}
          onOpenChange={dialogs.closeScoreDialog}
          participantId={dialogs.selectedParticipantForScore.id}
          participantName={dialogs.selectedParticipantForScore.name}
          currentScore={dialogs.selectedParticipantForScore.score}
          pars={course?.pars?.holes || []}
        />
      )}

      {dialogs.selectedParticipantForDQ && (
        <AdminDQDialog
          open={dialogs.dqDialogOpen}
          onOpenChange={dialogs.closeDQDialog}
          participantId={dialogs.selectedParticipantForDQ.id}
          participantName={dialogs.selectedParticipantForDQ.name}
          currentlyDQ={dialogs.selectedParticipantForDQ.isDQ}
        />
      )}

      <QRCodeDialog
        open={dialogs.qrDialogState.open}
        onOpenChange={dialogs.closeQRDialog}
        url={dialogs.qrDialogState.url}
        title={dialogs.qrDialogState.title}
        description={dialogs.qrDialogState.description}
      />
    </div>
  );
}

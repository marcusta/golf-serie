import { Link } from "@tanstack/react-router";
import { Clock, Users } from "lucide-react";
import {
  formatParticipantTypeDisplay,
  isMultiPlayerFormat,
} from "../../utils/playerUtils";
import type { TeeTimeParticipant } from "../../api/tee-times";

interface TeeTime {
  id: number;
  teetime: string;
  start_hole: number;
  hitting_bay?: number;
  participants: TeeTimeParticipant[];
  pars: number[];
  course_name: string;
}

interface ParticipantsListComponentProps {
  teeTimes: TeeTime[] | undefined;
  teeTimesLoading: boolean;
  competitionId: string;
  venueType?: "outdoor" | "indoor";
  // For CompetitionRound context
  currentTeeTimeId?: string;
  currentTeeTime?: TeeTime;
  showCurrentGroup?: boolean;
  totalParticipants?: number;
  /** When true, hides team terminology (team name, position) for tour competitions */
  isTourCompetition?: boolean;
  /** When true, hides scheduled tee times (for open start competitions) */
  isOpenStart?: boolean;
}

export function ParticipantsListComponent({
  teeTimes,
  teeTimesLoading,
  competitionId,
  venueType = "outdoor",
  currentTeeTimeId,
  currentTeeTime,
  showCurrentGroup = false,
  totalParticipants = 0,
  isTourCompetition = false,
  isOpenStart = false,
}: ParticipantsListComponentProps) {
  // Helper function to format participant display name
  const formatParticipantDisplay = (participant: TeeTimeParticipant) => {
    if (isTourCompetition) {
      // For tour competitions, just show player name
      return participant.player_names || "Player";
    }
    // For series competitions, show player name with team/position info
    return participant.player_names
      ? `${participant.player_names}, ${participant.team_name} ${formatParticipantTypeDisplay(participant.position_name)}`
      : `${participant.team_name} ${formatParticipantTypeDisplay(participant.position_name)}`;
  };
  // For CompetitionDetail.tsx - simple start list view
  if (!showCurrentGroup) {
    return (
      <div className="space-y-3 md:space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-semibold text-fairway font-display">
            Tee Times
          </h2>
          <div className="text-xs md:text-sm text-turf font-primary">
            {teeTimes?.length || 0} tee times
          </div>
        </div>

        {teeTimesLoading ? (
          <div className="p-4 text-charcoal font-primary">
            Loading tee times...
          </div>
        ) : !teeTimes || teeTimes.length === 0 ? (
          <div className="text-center py-6 md:py-8 text-soft-grey text-sm font-primary">
            No tee times scheduled for this competition yet.
          </div>
        ) : (
          <div className="space-y-3">
            {teeTimes.map((teeTime) => (
              <div
                key={teeTime.id}
                className="bg-scorecard rounded-xl border border-soft-grey overflow-hidden"
              >
                <div className="bg-rough bg-opacity-30 px-4 py-3 border-b border-soft-grey">
                  <div className="flex items-center justify-between">
                    <h4 className="text-base md:text-lg font-semibold text-fairway font-display flex items-center gap-2">
                      <Clock className="h-4 w-4 md:h-5 md:w-5 text-turf" />
                      {teeTime.teetime}
                      <span className="text-xs md:text-sm text-turf bg-scorecard px-2 py-1 rounded-full font-primary font-medium">
                        {venueType === "indoor" && teeTime.hitting_bay
                          ? `Bay ${teeTime.hitting_bay}`
                          : `Hole ${teeTime.start_hole}`}
                      </span>
                    </h4>
                    <div className="text-xs md:text-sm text-turf font-primary">
                      {teeTime.participants.length} players
                    </div>
                  </div>
                </div>

                {teeTime.participants.length === 0 ? (
                  <div className="text-center py-4 text-soft-grey text-sm font-primary">
                    No participants assigned to this tee time yet.
                  </div>
                ) : (
                  <div className="divide-y divide-soft-grey">
                    {teeTime.participants.map((participant) => (
                      <Link
                        key={participant.id}
                        to={`/player/competitions/${competitionId}/tee-times/${teeTime.id}`}
                        className="px-4 py-3 flex items-center justify-between hover:bg-rough hover:bg-opacity-20 transition-colors"
                      >
                        <div className="flex-1">
                          <h5 className="text-sm md:text-base font-medium text-fairway font-primary">
                            {formatParticipantDisplay(participant)}
                          </h5>
                        </div>
                        <div className="text-xs text-turf">
                          {isMultiPlayerFormat(participant.position_name) && (
                            <Users className="w-4 h-4 inline-block" />
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // For CompetitionRound.tsx - participants view with current group context
  return (
    <div className="h-full overflow-y-auto bg-scorecard">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-semibold text-fairway font-display">
            Round Participants
          </h2>
          <div className="text-xs md:text-sm text-turf font-primary">
            {currentTeeTimeId ? "Current group" : `${totalParticipants} total`}
          </div>
        </div>

        {/* Current Tee Time Group (if in score entry context) */}
        {currentTeeTimeId && currentTeeTime && (
          <div className="bg-rough bg-opacity-20 rounded-xl border border-turf p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm md:text-lg font-semibold text-fairway font-display flex items-center gap-2">
                {isOpenStart ? "Your Group" : `Your Group - ${currentTeeTime.teetime}`}
                <span className="text-xs text-turf bg-scorecard px-2 py-1 rounded-full font-primary font-medium">
                  {venueType === "indoor" && currentTeeTime.hitting_bay
                    ? `Bay ${currentTeeTime.hitting_bay}`
                    : `Hole ${currentTeeTime.start_hole}`}
                </span>
              </h3>
              <span className="text-xs md:text-sm text-scorecard bg-coral px-2 py-1 rounded-full font-primary font-medium">
                Active
              </span>
            </div>
            <div className="space-y-2">
              {currentTeeTime.participants.map(
                (participant: TeeTimeParticipant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between p-3 bg-scorecard rounded-xl border border-turf"
                  >
                    <div className="flex-1">
                      <h4 className="text-sm md:text-base font-medium text-fairway font-primary">
                        {formatParticipantDisplay(participant)}
                      </h4>
                    </div>
                    <div className="text-xs text-turf">
                      {isMultiPlayerFormat(participant.position_name) && (
                        <Users className="w-4 h-4 inline-block" />
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* All Other Tee Times */}
        <div>
          <h3 className="text-sm md:text-base font-medium text-fairway mb-3 font-primary">
            {currentTeeTimeId ? "Other Groups" : "All Groups"}
          </h3>

          {!teeTimes || teeTimes.length === 0 ? (
            <div className="text-center py-6 md:py-8 text-soft-grey font-primary">
              No tee times scheduled for this competition.
            </div>
          ) : (
            <div className="space-y-3">
              {teeTimes
                .filter(
                  (t) =>
                    !currentTeeTimeId || t.id !== parseInt(currentTeeTimeId)
                )
                .map((teeTimeGroup) => (
                  <div
                    key={teeTimeGroup.id}
                    className="bg-scorecard rounded-xl border border-soft-grey overflow-hidden"
                  >
                    <div className="bg-rough bg-opacity-30 px-4 py-2 border-b border-soft-grey">
                      <h4 className="text-sm md:text-base font-semibold text-fairway font-display flex items-center gap-2">
                        {isOpenStart ? (
                          // For open start, just show "Group" or hole info
                          <span>Group</span>
                        ) : (
                          // For scheduled competitions, show tee time
                          teeTimeGroup.teetime
                        )}
                        <span className="text-xs text-turf bg-scorecard px-2 py-1 rounded-full font-primary font-medium">
                          {venueType === "indoor" && teeTimeGroup.hitting_bay
                            ? `Bay ${teeTimeGroup.hitting_bay}`
                            : `Hole ${teeTimeGroup.start_hole}`}
                        </span>
                      </h4>
                    </div>
                    <div className="divide-y divide-soft-grey">
                      {teeTimeGroup.participants.map(
                        (participant: TeeTimeParticipant) => (
                          <div
                            key={participant.id}
                            className="px-4 py-2 flex items-center justify-between"
                          >
                            <div className="flex-1">
                              <h5 className="text-xs md:text-sm font-medium text-fairway font-primary">
                                {formatParticipantDisplay(participant)}
                              </h5>
                            </div>
                            <div className="text-xs text-turf">
                              {isMultiPlayerFormat(
                                participant.position_name
                              ) && <Users className="w-3 h-3 inline-block" />}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

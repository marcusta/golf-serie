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
  participants: TeeTimeParticipant[];
  pars: number[];
  course_name: string;
}

interface ParticipantsListComponentProps {
  teeTimes: TeeTime[] | undefined;
  teeTimesLoading: boolean;
  competitionId: string;
  // For CompetitionRound context
  currentTeeTimeId?: string;
  currentTeeTime?: TeeTime;
  showCurrentGroup?: boolean;
  totalParticipants?: number;
}

export function ParticipantsListComponent({
  teeTimes,
  teeTimesLoading,
  competitionId,
  currentTeeTimeId,
  currentTeeTime,
  showCurrentGroup = false,
  totalParticipants = 0,
}: ParticipantsListComponentProps) {
  // For CompetitionDetail.tsx - simple start list view
  if (!showCurrentGroup) {
    return (
      <div className="space-y-3 md:space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">
            Tee Times
          </h2>
          <div className="text-xs md:text-sm text-gray-500">
            {teeTimes?.length || 0} tee times
          </div>
        </div>

        {teeTimesLoading ? (
          <div className="p-4">Loading tee times...</div>
        ) : !teeTimes || teeTimes.length === 0 ? (
          <div className="text-center py-6 md:py-8 text-gray-500 text-sm">
            No tee times scheduled for this competition yet.
          </div>
        ) : (
          <div className="grid gap-3 md:gap-4">
            {teeTimes.map((teeTime) => (
              <Link
                key={teeTime.id}
                to={`/player/competitions/${competitionId}/tee-times/${teeTime.id}`}
                className="block bg-white rounded-lg border border-gray-200 hover:border-green-300 hover:shadow-md transition-all duration-200"
              >
                <div className="p-4 md:p-6">
                  <div className="flex items-center justify-between mb-3 md:mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                      <span className="text-base md:text-lg font-semibold text-gray-900">
                        {teeTime.teetime}
                      </span>
                    </div>
                    <div className="text-xs md:text-sm text-gray-500">
                      {teeTime.participants.length} players
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
                    {teeTime.participants.map((participant) => (
                      <div
                        key={participant.id}
                        className="flex items-center justify-between p-2 md:p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-gray-900 text-sm md:text-base block truncate">
                            {participant.team_name} {participant.position_name}
                          </span>
                          <div className="text-xs text-gray-500 truncate">
                            {participant.player_names}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {teeTime.participants.length === 0 && (
                    <div className="text-center py-3 md:py-4 text-gray-500 text-sm">
                      No participants assigned to this tee time yet.
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // For CompetitionRound.tsx - participants view with current group context
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-semibold text-gray-900">
            Round Participants
          </h2>
          <div className="text-xs md:text-sm text-gray-500">
            {currentTeeTimeId ? "Current group" : `${totalParticipants} total`}
          </div>
        </div>

        {/* Current Tee Time Group (if in score entry context) */}
        {currentTeeTimeId && currentTeeTime && (
          <div className="bg-blue-50 rounded-lg border border-blue-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm md:text-lg font-semibold text-blue-900">
                Your Group - {currentTeeTime.teetime}
              </h3>
              <span className="text-xs md:text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                Active
              </span>
            </div>
            <div className="space-y-2">
              {currentTeeTime.participants.map(
                (participant: TeeTimeParticipant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg"
                  >
                    <div className="flex-1">
                      <h4 className="text-sm md:text-base font-medium text-gray-900">
                        {participant.team_name}
                      </h4>
                      <p className="text-xs md:text-sm text-gray-600 mt-1">
                        {formatParticipantTypeDisplay(
                          participant.position_name
                        )}
                        {participant.player_names && (
                          <span className="ml-2">
                            • {participant.player_names}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500">
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
          <h3 className="text-sm md:text-base font-medium text-gray-700 mb-3">
            {currentTeeTimeId ? "Other Groups" : "All Groups"}
          </h3>

          {!teeTimes || teeTimes.length === 0 ? (
            <div className="text-center py-6 md:py-8 text-gray-500">
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
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                  >
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <h4 className="text-sm md:text-base font-semibold text-gray-900">
                        {teeTimeGroup.teetime}
                      </h4>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {teeTimeGroup.participants.map(
                        (participant: TeeTimeParticipant) => (
                          <div
                            key={participant.id}
                            className="px-4 py-2 flex items-center justify-between"
                          >
                            <div className="flex-1">
                              <h5 className="text-xs md:text-sm font-medium text-gray-900">
                                {participant.team_name}
                              </h5>
                              <p className="text-xs text-gray-600">
                                {formatParticipantTypeDisplay(
                                  participant.position_name
                                )}
                              </p>
                            </div>
                            <div className="text-xs text-gray-500">
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

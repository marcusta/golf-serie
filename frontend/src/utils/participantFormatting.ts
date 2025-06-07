import type { TeeTime, TeeTimeParticipant } from "../api/tee-times";
import {
  formatParticipantTypeDisplay,
  isMultiPlayerFormat,
} from "./playerUtils";

export interface ScoreEntryPlayer {
  participantId: string;
  participantName: string;
  participantType?: string;
  isMultiPlayer?: boolean;
  scores: number[];
}

export interface TeeTimeGroup {
  id: string;
  players: ScoreEntryPlayer[];
}

export function formatTeeTimeGroup(
  teeTime: TeeTime | null
): TeeTimeGroup | null {
  if (!teeTime) return null;

  return {
    id: teeTime.id.toString(),
    players: teeTime.participants.map((participant: TeeTimeParticipant) => ({
      participantId: participant.id.toString(),
      participantName: participant.team_name,
      participantType: formatParticipantTypeDisplay(participant.position_name),
      isMultiPlayer: isMultiPlayerFormat(participant.position_name),
      scores: participant.score,
    })),
  };
}

export function formatParticipantForScorecard(
  participant: TeeTimeParticipant | null
) {
  if (!participant) return null;

  return {
    id: participant.id,
    team_name: participant.team_name,
    position_name: participant.position_name,
    player_names: participant.player_names,
    score: participant.score,
    tee_time_id: participant.tee_time_id,
  };
}

/**
 * Utility functions for handling golf participant types and player counting
 */

export interface ParticipantInfo {
  id: string;
  name: string;
  type: string;
  playerCount: number;
}

/**
 * Determines if a participant type represents multiple players
 * @param participantType - The position/participant type name
 * @returns The number of actual players represented by this participant
 */
export function getPlayerCountForParticipantType(
  participantType: string
): number {
  const lowerType = participantType.toLowerCase();

  // Check for multi-player formats
  if (
    lowerType.includes("bäst") ||
    lowerType.includes("better") ||
    lowerType.includes("foursome") ||
    lowerType.includes("greensome")
  ) {
    return 2; // These formats represent 2 players
  }

  return 1; // Default to single player
}

/**
 * Calculates the total number of actual players in a tee time
 * @param participants - Array of participants with their types
 * @returns Total number of actual players
 */
export function calculateTotalPlayers(
  participants: Array<{ position_name: string }>
): number {
  return participants.reduce((total, participant) => {
    return total + getPlayerCountForParticipantType(participant.position_name);
  }, 0);
}

/**
 * Validates if adding a new participant would exceed the 4-player limit
 * @param existingParticipants - Current participants in the tee time
 * @param newParticipantType - Type of the participant to be added
 * @returns Object with validation result and details
 */
export function validatePlayerLimit(
  existingParticipants: Array<{ position_name: string }>,
  newParticipantType: string
): {
  isValid: boolean;
  currentPlayerCount: number;
  newPlayerCount: number;
  maxPlayers: number;
  message?: string;
} {
  const MAX_PLAYERS = 4;
  const currentPlayerCount = calculateTotalPlayers(existingParticipants);
  const newParticipantPlayerCount =
    getPlayerCountForParticipantType(newParticipantType);
  const totalAfterAdding = currentPlayerCount + newParticipantPlayerCount;

  const isValid = totalAfterAdding <= MAX_PLAYERS;

  return {
    isValid,
    currentPlayerCount,
    newPlayerCount: newParticipantPlayerCount,
    maxPlayers: MAX_PLAYERS,
    message: isValid
      ? undefined
      : `Cannot add ${newParticipantType}. This would result in ${totalAfterAdding} players, exceeding the maximum of ${MAX_PLAYERS} players per tee time.`,
  };
}

/**
 * Gets a formatted display for participant types with player counts
 * @param participantType - The position/participant type name
 * @returns Formatted string showing the type and player count
 */
export function formatParticipantTypeDisplay(participantType: string): string {
  const playerCount = getPlayerCountForParticipantType(participantType);
  if (playerCount > 1) {
    return `${participantType} (${playerCount} players)`;
  }
  return participantType;
}

/**
 * Checks if a participant type is a multi-player format
 * @param participantType - The position/participant type name
 * @returns True if the type represents multiple players
 */
export function isMultiPlayerFormat(participantType: string): boolean {
  return getPlayerCountForParticipantType(participantType) > 1;
}

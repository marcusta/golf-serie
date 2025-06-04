// Utility for smart hole navigation and session management

export interface TeeTimeParticipant {
  id: number;
  score: number[];
  // ... other properties
}

// Helper functions for session storage and smart hole navigation
export const getSessionStorageKey = (teeTimeId: string) =>
  `golf-current-hole-${teeTimeId}`;

export const findFirstIncompleteHole = (
  participants: TeeTimeParticipant[]
): number => {
  // Find the first hole where not all participants have valid scores
  for (let hole = 1; hole <= 18; hole++) {
    const holeIndex = hole - 1;
    const allParticipantsHaveScores = participants.every((participant) => {
      const score = participant.score[holeIndex];
      return score && score > 0; // Valid score (not 0 or -1 for incomplete)
    });

    if (!allParticipantsHaveScores) {
      return hole;
    }
  }

  return 18; // All holes complete, go to last hole
};

export const getInitialHole = (
  teeTimeId: string | undefined,
  participants: TeeTimeParticipant[] | undefined
): number => {
  if (!teeTimeId || !participants) return 1;

  // Try to get remembered hole from session storage
  const sessionKey = getSessionStorageKey(teeTimeId);
  const rememberedHole = sessionStorage.getItem(sessionKey);

  if (rememberedHole) {
    const hole = parseInt(rememberedHole, 10);
    if (hole >= 1 && hole <= 18) {
      return hole;
    }
  }

  // No remembered hole, find first incomplete
  return findFirstIncompleteHole(participants);
};

export const rememberCurrentHole = (teeTimeId: string, hole: number): void => {
  if (teeTimeId && hole) {
    sessionStorage.setItem(getSessionStorageKey(teeTimeId), hole.toString());
  }
};

export const clearRememberedHole = (teeTimeId: string): void => {
  sessionStorage.removeItem(getSessionStorageKey(teeTimeId));
};

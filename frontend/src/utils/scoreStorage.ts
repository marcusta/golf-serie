// Utility for managing local score storage and sync resilience

interface PendingScore {
  participantId: number;
  hole: number;
  shots: number;
  timestamp: number;
  attempts: number;
}

const STORAGE_KEY = "golf-pending-scores";
const MAX_RETRY_ATTEMPTS = 3;

export class ScoreStorageManager {
  private static instance: ScoreStorageManager;

  private constructor() {}

  static getInstance(): ScoreStorageManager {
    if (!ScoreStorageManager.instance) {
      ScoreStorageManager.instance = new ScoreStorageManager();
    }
    return ScoreStorageManager.instance;
  }

  // Add a score to pending storage
  addPendingScore(participantId: number, hole: number, shots: number): void {
    const pendingScores = this.getPendingScores();
    const scoreKey = `${participantId}-${hole}`;

    pendingScores[scoreKey] = {
      participantId,
      hole,
      shots,
      timestamp: Date.now(),
      attempts: 0,
    };

    this.savePendingScores(pendingScores);
  }

  // Remove a score from pending storage (after successful sync)
  removePendingScore(participantId: number, hole: number): void {
    const pendingScores = this.getPendingScores();
    const scoreKey = `${participantId}-${hole}`;

    delete pendingScores[scoreKey];
    this.savePendingScores(pendingScores);
  }

  // Get all pending scores
  getPendingScores(): Record<string, PendingScore> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  // Get pending scores as an array
  getPendingScoresArray(): PendingScore[] {
    const pendingScores = this.getPendingScores();
    return Object.values(pendingScores);
  }

  // Get count of pending scores
  getPendingCount(): number {
    return this.getPendingScoresArray().length;
  }

  // Mark a score as attempted (increment retry count)
  markAttempted(participantId: number, hole: number): boolean {
    const pendingScores = this.getPendingScores();
    const scoreKey = `${participantId}-${hole}`;

    if (pendingScores[scoreKey]) {
      pendingScores[scoreKey].attempts += 1;

      // Remove if max attempts reached
      if (pendingScores[scoreKey].attempts >= MAX_RETRY_ATTEMPTS) {
        delete pendingScores[scoreKey];
      }

      this.savePendingScores(pendingScores);
      return pendingScores[scoreKey] ? true : false; // Return false if removed due to max attempts
    }

    return false;
  }

  // Clear all pending scores
  clearPendingScores(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  // Get scores that should be retried (not at max attempts)
  getRetryableScores(): PendingScore[] {
    return this.getPendingScoresArray().filter(
      (score) => score.attempts < MAX_RETRY_ATTEMPTS
    );
  }

  // Check if connectivity issues are suspected
  hasConnectivityIssues(): boolean {
    const pendingScores = this.getPendingScoresArray();
    const oldestPending = Math.min(...pendingScores.map((s) => s.timestamp));

    // Consider connectivity issues if scores have been pending for more than 30 seconds
    return pendingScores.length > 0 && Date.now() - oldestPending > 30000;
  }

  private savePendingScores(scores: Record<string, PendingScore>): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
    } catch (error) {
      console.error("Failed to save pending scores to localStorage:", error);
    }
  }
}

// src/utils/syncManager.ts

// Sync intervals configuration
export const SYNC_INTERVALS = {
  TAB_CHANGE: 15000, // 15 seconds
  VISIBILITY_CHANGE: 60000, // 1 minute
  PERIODIC: 30000, // 30 seconds
  HOLE_NAVIGATION: 20000, // 20 seconds
  INITIAL_FETCH: 10000, // 10 seconds
} as const;

// Sync configuration interfaces
export interface SyncConfig {
  teeTimeId?: string;
  competitionId?: string;
  activeTab: string;
  lastSyncTime: number;
  onSync: () => void | Promise<void>;
}

export interface InitialSyncConfig extends SyncConfig {
  hasData?: boolean;
}

export interface TabSyncConfig extends SyncConfig {
  newTab: string;
  onLeaderboardSync?: () => void | Promise<void>;
  onTeamsSync?: () => void | Promise<void>;
}

export interface VisibilitySyncConfig extends SyncConfig {
  isScoreEntry: boolean;
}

export interface HoleSyncConfig extends SyncConfig {
  currentHole: number;
}

export interface SyncStatus {
  pendingCount: number;
  lastSyncTime: number;
  isOnline: boolean;
  hasConnectivityIssues: boolean;
}

export class SyncManager {
  /**
   * Determine if a sync is needed based on time threshold
   */
  static shouldSync(lastSyncTime: number, threshold: number): boolean {
    const timeSinceLastSync = Date.now() - lastSyncTime;
    return timeSinceLastSync > threshold;
  }

  /**
   * Generate session storage key for sync tracking
   */
  static getSessionKey(type: string, id: string): string {
    return `golf-sync-${type}-${id}`;
  }

  /**
   * Check if initial sync is needed for a session
   */
  static needsInitialSync(sessionKey: string): boolean {
    const lastSyncedThisSession = sessionStorage.getItem(sessionKey);
    return !lastSyncedThisSession;
  }

  /**
   * Mark sync as completed in session storage
   */
  static markSyncCompleted(sessionKey: string): void {
    sessionStorage.setItem(sessionKey, Date.now().toString());
  }

  /**
   * Handle initial sync when entering a view
   */
  static async handleInitialSync(config: InitialSyncConfig): Promise<boolean> {
    if (!config.teeTimeId || !config.hasData) return false;

    const sessionKey = this.getSessionKey("initial", config.teeTimeId);

    if (this.needsInitialSync(sessionKey)) {
      console.log("Initial sync for score entry session...");
      await config.onSync();
      this.markSyncCompleted(sessionKey);
      return true;
    }

    return false;
  }

  /**
   * Handle sync on tab changes
   */
  static async handleTabChangeSync(config: TabSyncConfig): Promise<void> {
    const { newTab, teeTimeId, lastSyncTime } = config;

    // Sync when switching to score tab
    if (newTab === "score" && teeTimeId) {
      if (this.shouldSync(lastSyncTime, SYNC_INTERVALS.TAB_CHANGE)) {
        console.log("Syncing on tab change to score entry...");
        await config.onSync();
      }
    }

    // Sync when switching to leaderboard or teams
    if (newTab === "leaderboard" || newTab === "teams") {
      console.log(`Syncing data for ${newTab} view...`);

      if (config.onLeaderboardSync) {
        await config.onLeaderboardSync();
      }

      if (newTab === "teams" && config.onTeamsSync) {
        await config.onTeamsSync();
      }
    }
  }

  /**
   * Handle sync when browser tab becomes visible
   */
  static async handleVisibilityChangeSync(
    config: VisibilitySyncConfig
  ): Promise<boolean> {
    if (document.hidden || !config.isScoreEntry || !config.teeTimeId) {
      return false;
    }

    if (
      this.shouldSync(config.lastSyncTime, SYNC_INTERVALS.VISIBILITY_CHANGE)
    ) {
      console.log("Syncing after returning to tab...");
      await config.onSync();
      return true;
    }

    return false;
  }

  /**
   * Check if sync is needed when navigating holes (every 3 holes)
   */
  static shouldSyncOnHoleChange(hole: number, lastSyncTime: number): boolean {
    const shouldSyncOnHole = hole % 3 === 1; // Sync on holes 1, 4, 7, 10, 13, 16
    return (
      shouldSyncOnHole &&
      this.shouldSync(lastSyncTime, SYNC_INTERVALS.HOLE_NAVIGATION)
    );
  }

  /**
   * Handle sync on hole navigation
   */
  static async handleHoleNavigationSync(
    config: HoleSyncConfig
  ): Promise<boolean> {
    if (!config.teeTimeId) return false;

    if (this.shouldSyncOnHoleChange(config.currentHole, config.lastSyncTime)) {
      console.log(
        `Syncing on hole navigation to hole ${config.currentHole}...`
      );
      await config.onSync();
      return true;
    }

    return false;
  }

  /**
   * Check if initial data fetch is needed for leaderboard/teams views
   */
  static needsInitialFetch(viewType: string, competitionId: string): boolean {
    const lastFetchKey = `lastFetch-${viewType}-${competitionId}`;
    const lastFetch = sessionStorage.getItem(lastFetchKey);
    const timeSinceLastFetch = lastFetch
      ? Date.now() - parseInt(lastFetch)
      : Infinity;

    return timeSinceLastFetch > SYNC_INTERVALS.INITIAL_FETCH;
  }

  /**
   * Mark initial fetch as completed
   */
  static markInitialFetchCompleted(
    viewType: string,
    competitionId: string
  ): void {
    const lastFetchKey = `lastFetch-${viewType}-${competitionId}`;
    sessionStorage.setItem(lastFetchKey, Date.now().toString());
  }

  /**
   * Handle initial fetch for leaderboard/teams views
   */
  static async handleInitialViewFetch(
    viewType: "leaderboard" | "teams",
    competitionId: string,
    onLeaderboardSync: () => void | Promise<void>,
    onTeamsSync?: () => void | Promise<void>
  ): Promise<boolean> {
    if (this.needsInitialFetch(viewType, competitionId)) {
      console.log(`Initial fetch for ${viewType} view...`);

      await onLeaderboardSync();

      if (viewType === "teams" && onTeamsSync) {
        await onTeamsSync();
      }

      this.markInitialFetchCompleted(viewType, competitionId);
      return true;
    }

    return false;
  }

  /**
   * Create sync status object
   */
  static createSyncStatus(
    scoreManager: { getPendingCount: () => number },
    lastSyncTime: number
  ): SyncStatus {
    const pendingCount = scoreManager.getPendingCount();

    return {
      pendingCount,
      lastSyncTime,
      isOnline: navigator.onLine,
      hasConnectivityIssues:
        pendingCount > 0 && Date.now() - lastSyncTime > SYNC_INTERVALS.PERIODIC,
    };
  }

  /**
   * Determine if periodic sync should run based on active tab
   */
  static shouldRunPeriodicSync(activeTab: string): boolean {
    return activeTab === "leaderboard" || activeTab === "teams";
  }

  /**
   * Handle periodic sync for leaderboard and teams
   */
  static async handlePeriodicViewSync(
    activeTab: string,
    onLeaderboardSync: () => void | Promise<void>,
    onTeamsSync?: () => void | Promise<void>
  ): Promise<void> {
    if (!this.shouldRunPeriodicSync(activeTab)) return;

    console.log(`Periodic sync for ${activeTab} view...`);

    await onLeaderboardSync();

    if (activeTab === "teams" && onTeamsSync) {
      await onTeamsSync();
    }
  }

  /**
   * Check if retryable sync should run (for pending scores)
   */
  static shouldRetryPendingScores(
    retryableScores: unknown[],
    lastSyncTime: number
  ): boolean {
    return (
      retryableScores.length > 0 ||
      this.shouldSync(lastSyncTime, SYNC_INTERVALS.PERIODIC)
    );
  }
}

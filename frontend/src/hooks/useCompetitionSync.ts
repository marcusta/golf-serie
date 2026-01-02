import { useCallback, useEffect, useState } from "react";
import { ScoreStorageManager } from "../utils/scoreStorage";
import { SYNC_INTERVALS, SyncManager } from "../utils/syncManager";
import type { SyncStatus } from "../utils/syncManager";

interface UseCompetitionSyncProps {
  competitionId?: string;
  teeTimeId?: string;
  activeTab: string;
  refetchTeeTime: () => Promise<unknown>;
  refetchLeaderboard: () => Promise<unknown>;
  refetchTeamLeaderboard?: () => Promise<unknown>;
  refetchTeeTimes: () => Promise<unknown>;
  updateScoreMutation: {
    mutate: (
      params: { participantId: number; hole: number; shots: number },
      options?: {
        onSuccess?: () => void;
        onError?: (error: unknown) => void;
      }
    ) => void;
    mutateAsync: (params: {
      participantId: number;
      hole: number;
      shots: number;
    }) => Promise<unknown>;
  };
  teeTime?: unknown;
}

/** Return type for useCompetitionSync hook */
export interface UseCompetitionSyncResult {
  syncStatus: SyncStatus;
  handleScoreUpdate: (participantId: string, hole: number, score: number) => void;
  handleTabChangeSync: (newTab: string) => Promise<void>;
  handleHoleNavigationSync: () => Promise<void>;
}

export function useCompetitionSync({
  competitionId,
  teeTimeId,
  activeTab,
  refetchTeeTime,
  refetchLeaderboard,
  refetchTeamLeaderboard,
  refetchTeeTimes,
  updateScoreMutation,
  teeTime,
}: UseCompetitionSyncProps): UseCompetitionSyncResult {
  const scoreManager = ScoreStorageManager.getInstance();
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());

  // Initial sync when entering score entry view
  useEffect(() => {
    if (activeTab === "score" && teeTimeId && teeTime) {
      SyncManager.handleInitialSync({
        teeTimeId,
        competitionId: competitionId || "",
        activeTab,
        lastSyncTime,
        hasData: !!teeTime,
        onSync: async () => {
          await refetchTeeTime();
          setLastSyncTime(Date.now());
        },
      });
    }
  }, [
    activeTab,
    teeTimeId,
    teeTime,
    refetchTeeTime,
    competitionId,
    lastSyncTime,
  ]);

  // Sync when returning to the browser tab (after being away)
  useEffect(() => {
    const handleVisibilityChange = async () => {
      const synced = await SyncManager.handleVisibilityChangeSync({
        teeTimeId,
        competitionId: competitionId || "",
        activeTab,
        lastSyncTime,
        isScoreEntry: activeTab === "score",
        onSync: async () => {
          await refetchTeeTime();
          setLastSyncTime(Date.now());
        },
      });

      if (synced) {
        setLastSyncTime(Date.now());
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [activeTab, teeTimeId, lastSyncTime, refetchTeeTime, competitionId]);

  // Periodic sync validation and retry logic for score entry
  useEffect(() => {
    if (!teeTimeId) return;

    const syncInterval = setInterval(async () => {
      try {
        let shouldRefetch = false;

        // Try to retry any pending scores
        const retryableScores = scoreManager.getRetryableScores();

        if (retryableScores.length > 0) {
          console.log(`Retrying ${retryableScores.length} pending scores...`);
          shouldRefetch = true;

          for (const score of retryableScores) {
            try {
              await updateScoreMutation.mutateAsync({
                participantId: score.participantId,
                hole: score.hole,
                shots: score.shots,
              });

              // Success - remove from pending
              scoreManager.removePendingScore(score.participantId, score.hole);
            } catch (error) {
              // Mark as attempted
              scoreManager.markAttempted(score.participantId, score.hole);
              console.error(
                `Retry failed for score ${score.participantId}-${score.hole}:`,
                error
              );
            }
          }
        }

        // Check if we should sync using SyncManager logic
        if (
          SyncManager.shouldRetryPendingScores(retryableScores, lastSyncTime)
        ) {
          if (
            shouldRefetch ||
            SyncManager.shouldSync(lastSyncTime, SYNC_INTERVALS.PERIODIC)
          ) {
            console.log("Syncing with server for latest scores...");
            await refetchTeeTime();
            setLastSyncTime(Date.now());
          }
        }
      } catch (error) {
        console.error("Sync validation failed:", error);
      }
    }, SYNC_INTERVALS.PERIODIC);

    return () => clearInterval(syncInterval);
  }, [
    teeTimeId,
    updateScoreMutation,
    refetchTeeTime,
    scoreManager,
    lastSyncTime,
  ]);

  // Periodic sync for leaderboard and teams data
  useEffect(() => {
    if (!competitionId || !SyncManager.shouldRunPeriodicSync(activeTab)) return;

    const syncInterval = setInterval(async () => {
      await SyncManager.handlePeriodicViewSync(
        activeTab,
        async () => {
          await refetchLeaderboard();
          if (refetchTeamLeaderboard) {
            await refetchTeamLeaderboard();
          }
        },
        async () => {
          await refetchTeeTimes();
        }
      );
      setLastSyncTime(Date.now());
    }, SYNC_INTERVALS.PERIODIC);

    return () => clearInterval(syncInterval);
  }, [
    activeTab,
    competitionId,
    refetchLeaderboard,
    refetchTeamLeaderboard,
    refetchTeeTimes,
  ]);

  // Fetch fresh data when first entering leaderboard or teams views
  useEffect(() => {
    if (
      (activeTab === "leaderboard" || activeTab === "teams") &&
      competitionId
    ) {
      SyncManager.handleInitialViewFetch(
        activeTab as "leaderboard" | "teams",
        competitionId,
        async () => {
          await refetchLeaderboard();
          if (refetchTeamLeaderboard) {
            await refetchTeamLeaderboard();
          }
        },
        async () => {
          await refetchTeeTimes();
        }
      );
    }
  }, [
    activeTab,
    competitionId,
    refetchLeaderboard,
    refetchTeamLeaderboard,
    refetchTeeTimes,
  ]);

  const syncStatus = SyncManager.createSyncStatus(scoreManager, lastSyncTime);

  const handleScoreUpdate = useCallback(
    (participantId: string, hole: number, score: number) => {
      const participantIdNum = parseInt(participantId);

      // Add to local storage immediately
      scoreManager.addPendingScore(participantIdNum, hole, score);

      // Attempt to sync with server
      updateScoreMutation.mutate(
        {
          participantId: participantIdNum,
          hole,
          shots: score,
        },
        {
          onSuccess: () => {
            // Remove from pending on success
            scoreManager.removePendingScore(participantIdNum, hole);
            setLastSyncTime(Date.now());
          },
          onError: (error) => {
            console.error("Score update failed:", error);
            // Mark as attempted but keep in pending for retry
            scoreManager.markAttempted(participantIdNum, hole);
          },
        }
      );
    },
    [updateScoreMutation, scoreManager]
  );

  const handleTabChangeSync = useCallback(
    async (newTab: string) => {
      if (newTab === "leaderboard" || newTab === "teams") {
        await refetchLeaderboard();
        if (refetchTeamLeaderboard) {
          await refetchTeamLeaderboard();
        }
      }
      if (newTab === "teams" || newTab === "participants") {
        await refetchTeeTimes();
      }
      setLastSyncTime(Date.now());
    },
    [refetchLeaderboard, refetchTeamLeaderboard, refetchTeeTimes]
  );

  const handleHoleNavigationSync = useCallback(async () => {
    // Sync on hole navigation to ensure we have latest data
    if (teeTimeId) {
      await refetchTeeTime();
      setLastSyncTime(Date.now());
    }
  }, [refetchTeeTime, teeTimeId]);

  return {
    syncStatus,
    handleScoreUpdate,
    handleTabChangeSync,
    handleHoleNavigationSync,
  };
}

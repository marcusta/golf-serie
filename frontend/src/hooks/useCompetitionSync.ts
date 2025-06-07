import { useCallback, useEffect, useState } from "react";
import { ScoreStorageManager } from "../utils/scoreStorage";
import { SYNC_INTERVALS, SyncManager } from "../utils/syncManager";

interface UseCompetitionSyncProps {
  competitionId?: string;
  teeTimeId?: string;
  activeTab: string;
  refetchTeeTime: () => Promise<unknown>;
  refetchLeaderboard: () => Promise<unknown>;
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

export function useCompetitionSync({
  competitionId,
  teeTimeId,
  activeTab,
  refetchTeeTime,
  refetchLeaderboard,
  refetchTeeTimes,
  updateScoreMutation,
  teeTime,
}: UseCompetitionSyncProps) {
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
        },
        async () => {
          await refetchTeeTimes();
        }
      );
      setLastSyncTime(Date.now());
    }, SYNC_INTERVALS.PERIODIC);

    return () => clearInterval(syncInterval);
  }, [activeTab, competitionId, refetchLeaderboard, refetchTeeTimes]);

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
        },
        async () => {
          await refetchTeeTimes();
        }
      );
    }
  }, [activeTab, competitionId, refetchLeaderboard, refetchTeeTimes]);

  const syncStatus = SyncManager.createSyncStatus(scoreManager, lastSyncTime);

  const handleScoreUpdate = useCallback(
    (participantId: string, hole: number, score: number) => {
      const participantIdNum = parseInt(participantId);

      // Add to local storage immediately
      scoreManager.addPendingScore(participantIdNum, hole, score);

      updateScoreMutation.mutate(
        {
          participantId: participantIdNum,
          hole,
          shots: score,
        },
        {
          onSuccess: () => {
            // Remove from pending scores on success
            scoreManager.removePendingScore(participantIdNum, hole);
            setLastSyncTime(Date.now());

            console.log(
              "Score update successful, cache invalidated automatically"
            );
          },
          onError: (error) => {
            console.error("Score update failed:", error);
            // Score is already in pending storage, will be retried
          },
        }
      );
    },
    [updateScoreMutation, scoreManager]
  );

  // Handle tab changes with sync
  const handleTabChangeSync = useCallback(
    async (newTab: string) => {
      await SyncManager.handleTabChangeSync({
        newTab,
        teeTimeId,
        competitionId: competitionId || "",
        activeTab: newTab,
        lastSyncTime,
        onSync: async () => {
          await refetchTeeTime();
          setLastSyncTime(Date.now());
        },
        onLeaderboardSync: async () => {
          await refetchLeaderboard();
          setLastSyncTime(Date.now());
        },
        onTeamsSync: async () => {
          await refetchTeeTimes();
        },
      });
    },
    [
      teeTimeId,
      competitionId,
      lastSyncTime,
      refetchTeeTime,
      refetchLeaderboard,
      refetchTeeTimes,
    ]
  );

  // Handle hole navigation with occasional sync
  const handleHoleNavigationSync = useCallback(
    async (newHole: number) => {
      const synced = await SyncManager.handleHoleNavigationSync({
        currentHole: newHole,
        teeTimeId,
        competitionId: competitionId || "",
        activeTab,
        lastSyncTime,
        onSync: async () => {
          await refetchTeeTime();
          setLastSyncTime(Date.now());
        },
      });

      if (synced) {
        setLastSyncTime(Date.now());
      }
    },
    [lastSyncTime, refetchTeeTime, teeTimeId, competitionId, activeTab]
  );

  return {
    syncStatus,
    handleScoreUpdate,
    handleTabChangeSync,
    handleHoleNavigationSync,
    lastSyncTime,
  };
}

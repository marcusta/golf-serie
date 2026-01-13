import { useState } from "react";
import { useParams } from "@tanstack/react-router";
import { PlayerPageLayout } from "../../components/layout/PlayerPageLayout";
import { ScoreEntry } from "../../components/score-entry/ScoreEntry";
import { GameLeaderboard } from "../../components/games/GameLeaderboard";
import { ParticipantScorecard } from "../../components/scorecard/ParticipantScorecard";
import type { ParticipantData, CourseData } from "../../components/scorecard/ParticipantScorecard";
import { useGameSync } from "../../hooks/useGameSync";
import { Trophy, Users } from "lucide-react";

// Placeholder hooks - these need to be implemented in frontend/src/api/games.ts
// For now, using mock data structure
interface GameGroupScoresData {
  group: {
    id: number;
    name?: string;
    start_hole: number;
  };
  members: Array<{
    member: {
      id: number;
      game_player_id: number;
      tee_order: number;
    };
    player: {
      id: number;
      player_id?: number;
      guest_name?: string;
      is_owner: boolean;
    };
    score: {
      id: number;
      score: number[];
      handicap_index?: number;
      is_locked: boolean;
    };
  }>;
  pars: number[];
  strokeIndex?: number[];
}

interface GameData {
  id: number;
  course_id: number;
  game_type: string;
  scoring_mode: "gross" | "net" | "both";
  status: "setup" | "ready" | "active" | "completed";
}

interface GameLeaderboardEntry {
  memberName: string;
  gamePlayerId: number;
  grossTotal: number;
  netTotal?: number;
  relativeToPar: number;
  netRelativeToPar?: number;
  holesPlayed: number;
  position: number;
  isLocked: boolean;
  customData?: Record<string, any>;
}

// Mock hooks - replace with actual API hooks
const useGame = (_gameId: number) => {
  // TODO: Implement in frontend/src/api/games.ts
  return {
    data: {
      id: _gameId,
      course_id: 1,
      game_type: "stroke-play",
      scoring_mode: "gross" as const,
      status: "active" as const,
    } as GameData,
    isLoading: false,
  };
};

const useGameGroupScores = (_gameId: number, _groupId: number) => {
  // TODO: Implement in frontend/src/api/games.ts
  return {
    data: undefined as GameGroupScoresData | undefined,
    isLoading: false,
  };
};

const useGameLeaderboard = (_unusedGameId: number) => {
  // TODO: Implement in frontend/src/api/games.ts
  return {
    data: [] as GameLeaderboardEntry[],
    isLoading: false,
  };
};

const useUpdateGameScore = () => {
  // TODO: Implement in frontend/src/api/games.ts
  return {
    mutate: (params: { memberId: number; hole: number; shots: number }) => {
      console.log("Update score:", params);
    },
  };
};

type TabType = "score" | "leaderboard";

export default function GamePlay() {
  const { gameId } = useParams({ strict: false });
  const gameIdNum = gameId ? parseInt(gameId) : 0;

  // Permission check for guest players
  const selectedGamePlayerId = localStorage.getItem("selected_game_player_id");
  const canEnterScores = !!selectedGamePlayerId; // Guest or owner

  const [activeTab, setActiveTab] = useState<TabType>("score");
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  // Fetch game data
  const { data: game, isLoading: gameLoading } = useGame(gameIdNum);

  // For now, assume we're viewing the first group
  // TODO: Implement group selection or determine current user's group
  const currentGroupId = 1;
  const { data: groupScores, isLoading: scoresLoading } = useGameGroupScores(
    gameIdNum,
    currentGroupId
  );

  // Fetch leaderboard
  const { data: leaderboard, isLoading: leaderboardLoading } =
    useGameLeaderboard(gameIdNum);

  // Set up polling for active games
  useGameSync({
    gameId: gameIdNum,
    enabled: game?.status === "active",
  });

  // Update score mutation
  const updateScoreMutation = useUpdateGameScore();

  const handleScoreUpdate = (
    participantId: string,
    hole: number,
    score: number
  ) => {
    // Find member ID from participant ID
    const memberId = parseInt(participantId);
    updateScoreMutation.mutate({
      memberId,
      hole,
      shots: score,
    });
  };

  const handleComplete = () => {
    console.log("Score entry completed!");
  };

  const handlePlayerClick = (playerId: number) => {
    setSelectedPlayerId(playerId);
  };

  const handleCloseScorecardModal = () => {
    setSelectedPlayerId(null);
  };

  if (gameLoading || scoresLoading) {
    return (
      <div className="p-4 text-charcoal font-primary">Loading game...</div>
    );
  }

  if (!game) {
    return <div className="p-4 text-charcoal font-primary">Game not found</div>;
  }

  // Transform game group data to match ScoreEntry component format
  const teeTimeGroup = groupScores
    ? {
        id: groupScores.group.id.toString(),
        players: groupScores.members.map((m) => ({
          participantId: m.member.id.toString(),
          participantName: m.player.guest_name || "Player",
          participantType: undefined,
          isMultiPlayer: false,
          scores: m.score.score,
          playerNames: m.player.guest_name || null,
          playerId: m.player.player_id || null,
        })),
      }
    : {
        id: "1",
        players: [],
      };

  const course = groupScores
    ? {
        id: groupScores.group.id.toString(),
        name: "Golf Course",
        holes: groupScores.pars.map((par, index) => ({
          number: index + 1,
          par,
        })),
      }
    : {
        id: "1",
        name: "Golf Course",
        holes: [],
      };

  // Find selected player data for scorecard modal
  const selectedMember = groupScores?.members.find(
    (m) => m.player.id === selectedPlayerId
  );
  const scorecardParticipantData: ParticipantData | null = selectedMember
    ? {
        id: selectedMember.member.id,
        team_name: selectedMember.player.guest_name || "Player",
        position_name: "",
        player_name: selectedMember.player.guest_name || null,
        score: selectedMember.score.score,
        tee_time_id: 0,
      }
    : null;

  const scorecardCourseData: CourseData | null = groupScores
    ? {
        id: groupScores.group.id.toString(),
        name: "Golf Course",
        holes: groupScores.pars.map((par, index) => ({
          number: index + 1,
          par,
        })),
      }
    : null;

  return (
    <PlayerPageLayout
      title="Play Golf"
      subtitle="Live Game"
      onBackClick={() => window.history.back()}
      className="h-screen flex flex-col"
    >
      <div className="flex-1 bg-gray-50 overflow-hidden flex flex-col">
        {/* Tabs */}
        <div className="border-b border-soft-grey bg-scorecard">
          <nav className="flex space-x-4 md:space-x-8 px-4">
            <button
              onClick={() => setActiveTab("score")}
              className={`flex items-center gap-1 md:gap-2 py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors font-primary ${
                activeTab === "score"
                  ? "border-coral text-coral"
                  : "border-transparent text-charcoal hover:text-turf hover:border-rough"
              }`}
            >
              <Users className="h-3 w-3 md:h-4 md:w-4" />
              Scorecard
            </button>
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`flex items-center gap-1 md:gap-2 py-3 md:py-4 px-1 border-b-2 font-medium text-xs md:text-sm transition-colors font-primary ${
                activeTab === "leaderboard"
                  ? "border-coral text-coral"
                  : "border-transparent text-charcoal hover:text-turf hover:border-rough"
              }`}
            >
              <Trophy className="h-3 w-3 md:h-4 md:w-4" />
              Leaderboard
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "score" && (
            <div className="h-full">
              {!canEnterScores ? (
                <div className="p-4 text-center">
                  <div className="bg-rough/50 border border-soft-grey rounded-xl p-6">
                    <p className="text-body-md text-charcoal/70">
                      Please select your player to enter scores
                    </p>
                  </div>
                </div>
              ) : (
                <ScoreEntry
                  teeTimeGroup={teeTimeGroup}
                  course={course}
                  onScoreUpdate={handleScoreUpdate}
                  onComplete={handleComplete}
                />
              )}
            </div>
          )}

          {activeTab === "leaderboard" && (
            <div className="p-4">
              <GameLeaderboard
                entries={leaderboard}
                isLoading={leaderboardLoading}
                scoringMode={game.scoring_mode}
                onPlayerClick={handlePlayerClick}
              />
            </div>
          )}
        </div>
      </div>

      {/* Participant Scorecard Modal */}
      <ParticipantScorecard
        visible={selectedPlayerId !== null}
        participant={scorecardParticipantData}
        course={scorecardCourseData}
        onClose={handleCloseScorecardModal}
        isTourCompetition={true}
      />
    </PlayerPageLayout>
  );
}

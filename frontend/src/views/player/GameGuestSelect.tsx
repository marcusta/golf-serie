import { useNavigate, useParams } from "@tanstack/react-router";
import { useGame, useGamePlayers } from "@/api/games";
import { Loader2, User, UserCircle } from "lucide-react";

export default function GameGuestSelect() {
  const params = useParams({ strict: false }) as { gameId: string };
  const navigate = useNavigate();
  const gameIdNum = parseInt(params.gameId);

  const { data: game, isLoading: gameLoading } = useGame(gameIdNum);
  const { data: players, isLoading: playersLoading } =
    useGamePlayers(gameIdNum);

  const isLoading = gameLoading || playersLoading;

  const handlePlayerSelect = (playerId: number) => {
    localStorage.setItem("selected_game_player_id", playerId.toString());
    navigate({
      to: "/player/games/$gameId/play",
      params: { gameId: params.gameId },
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-turf" />
      </div>
    );
  }

  if (!game || !players) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough flex items-center justify-center">
        <div className="text-center px-4">
          <h2 className="text-display-sm text-charcoal mb-2">
            Game Not Found
          </h2>
          <p className="text-body-md text-charcoal/70">
            This game does not exist or you don't have access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-scorecard to-rough">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-display-lg text-charcoal mb-2">
            Select Your Player
          </h1>
          <p className="text-body-lg text-charcoal/70">
            {game.course_name}
          </p>
        </div>

        {/* Player List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden divide-y divide-soft-grey">
          {players.map((player) => {
            const displayName = player.guest_name || "Player";
            const isGuest = !!player.guest_name;

            return (
              <button
                key={player.id}
                onClick={() => handlePlayerSelect(player.id)}
                className="w-full flex items-center gap-4 px-6 py-5 hover:bg-turf/5 transition-colors text-left"
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {isGuest ? (
                    <div className="w-12 h-12 rounded-full bg-coral/20 flex items-center justify-center">
                      <UserCircle className="h-7 w-7 text-coral" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-turf/20 flex items-center justify-center">
                      <User className="h-7 w-7 text-turf" />
                    </div>
                  )}
                </div>

                {/* Player Info */}
                <div className="flex-1">
                  <div className="font-semibold text-charcoal text-body-lg">
                    {displayName}
                  </div>
                </div>

                {/* Guest Badge */}
                {isGuest && (
                  <div className="flex-shrink-0">
                    <span className="inline-block px-3 py-1 bg-coral/10 text-coral text-label-sm rounded-full font-medium">
                      Guest
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Info Message */}
        <div className="mt-6 text-center text-body-sm text-charcoal/60">
          Select yourself to start playing and tracking your round
        </div>
      </div>
    </div>
  );
}

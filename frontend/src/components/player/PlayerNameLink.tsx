import { Link } from "@tanstack/react-router";
import { useIsFriend } from "@/api/player-profile";
import { useAuth } from "@/hooks/useAuth";

interface PlayerNameLinkProps {
  playerId?: number;
  playerName: string;
  className?: string;
  /**
   * Skip the isFriend check - use when we know they're on the same tour
   * (e.g., all players on a tour leaderboard are "friends" by definition)
   */
  skipFriendCheck?: boolean;
}

/**
 * Renders a player name that links to their profile if:
 * - The viewer is authenticated
 * - The viewer is "friends" with this player (same tour enrollment)
 * - Or skipFriendCheck is true (for tour contexts where all players are friends)
 *
 * Otherwise renders the name as plain text.
 */
export function PlayerNameLink({
  playerId,
  playerName,
  className = "",
  skipFriendCheck = false,
}: PlayerNameLinkProps) {
  const { isAuthenticated } = useAuth();

  // Only check isFriend if we have a playerId, user is authenticated, and we need to check
  const shouldCheck = !skipFriendCheck && !!playerId && isAuthenticated;
  const { data: friendData } = useIsFriend(shouldCheck ? playerId : 0);

  // Determine if we can link to the profile
  const canLink = playerId && isAuthenticated && (skipFriendCheck || friendData?.isFriend);

  if (!canLink) {
    return <span className={className}>{playerName}</span>;
  }

  return (
    <Link
      to="/player/players/$playerId"
      params={{ playerId: playerId.toString() }}
      className={`${className} hover:underline hover:text-turf transition-colors`}
      onClick={(e) => e.stopPropagation()} // Prevent parent click handlers (like row click)
    >
      {playerName}
    </Link>
  );
}

import { Link } from "@tanstack/react-router";
import {
  Play,
  Users,
  ChevronRight,
  MapPin,
  CheckCircle,
  Trophy,
  FileText,
  Clock,
} from "lucide-react";
import type { ActiveRound } from "@/api/tour-registration";

interface ActiveRoundBannerProps {
  activeRound: ActiveRound;
}

/**
 * Banner displayed when a player has an active or finished round.
 * Shows current progress or final score with appropriate actions.
 */
export function ActiveRoundBanner({ activeRound }: ActiveRoundBannerProps) {
  const {
    competition_id,
    competition_name,
    course_name,
    tee_time_id,
    holes_played,
    current_score,
    group,
    open_until,
    status,
  } = activeRound;

  const isFinished = status === "finished";
  const isAllHolesPlayed = holes_played >= 18;

  // Format the score display (e.g., "+3", "-2", "E")
  const formatScore = (score: string) => {
    if (score === "0" || score === "E") return "E";
    const num = parseInt(score, 10);
    if (isNaN(num)) return score;
    return num > 0 ? `+${num}` : `${num}`;
  };

  // Format the open until date
  const formatOpenUntil = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  // Format group members with handicaps
  const formatGroupMembers = () => {
    if (!group || group.length === 0) return null;
    return group.map((member: { name: string; handicap?: number }, index: number) => (
      <span key={index}>
        {index > 0 && ", "}
        {member.name}
        {member.handicap !== undefined && (
          <span className={isFinished ? "text-scorecard/50" : "text-scorecard/60"}>
            {" "}
            ({member.handicap.toFixed(1)})
          </span>
        )}
      </span>
    ));
  };

  if (isFinished) {
    // Finished state - green theme with left accent
    return (
      <div className="border-l-4 border-turf bg-turf/10 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-turf" />
          <span className="text-sm font-semibold text-turf">
            Round Complete
          </span>
        </div>

        {/* Content */}
        <div className="px-4 pb-4 space-y-3">
          {/* Competition info */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-display font-semibold text-charcoal truncate">
                {competition_name}
              </h3>
              <div className="flex items-center gap-1 text-charcoal/70 text-sm mt-1">
                <MapPin className="h-4 w-4 flex-shrink-0 text-turf" />
                <span className="truncate">{course_name}</span>
              </div>
            </div>

            {/* Final score - plain text */}
            <div className="flex-shrink-0 text-right">
              <div className="text-2xl font-display font-bold text-turf">
                {formatScore(current_score)}
              </div>
              <div className="text-xs text-charcoal/70">Final</div>
            </div>
          </div>

          {/* Group members with handicaps */}
          {group && group.length > 0 && (
            <div className="flex items-start gap-2 text-charcoal/70 text-sm">
              <Users className="h-4 w-4 flex-shrink-0 mt-0.5 text-turf" />
              <span>Played with: {formatGroupMembers()}</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <Link
              to="/player/competitions/$competitionId/tee-times/$teeTimeId"
              params={{
                competitionId: competition_id.toString(),
                teeTimeId: tee_time_id.toString(),
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-turf hover:bg-fairway text-scorecard rounded-lg font-semibold transition-colors"
            >
              <FileText className="h-5 w-5" />
              Scorecard
            </Link>
            <Link
              to="/player/competitions/$competitionId"
              params={{ competitionId: competition_id.toString() }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-turf/20 hover:bg-turf/30 text-turf rounded-lg font-semibold transition-colors"
            >
              <Trophy className="h-5 w-5" />
              Leaderboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Playing state - orange theme with left accent
  return (
    <div className="border-l-4 border-coral bg-coral/10 overflow-hidden">
      {/* Header with pulse indicator */}
      <div className="px-4 py-3 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-coral opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-coral"></span>
        </span>
        <span className="text-sm font-semibold text-coral">
          Round in Progress
        </span>
      </div>

      {/* Content */}
      <div className="px-4 pb-4 space-y-3">
        {/* Competition info */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-display font-semibold text-charcoal truncate">
              {competition_name}
            </h3>
            <div className="flex items-center gap-1 text-charcoal/70 text-sm mt-1">
              <MapPin className="h-4 w-4 flex-shrink-0 text-coral" />
              <span className="truncate">{course_name}</span>
            </div>
          </div>

          {/* Score - plain text */}
          <div className="flex-shrink-0 text-right">
            <div className="text-2xl font-display font-bold text-coral">
              {formatScore(current_score)}
            </div>
            <div className="text-xs text-charcoal/70">
              Hole {holes_played}/18
            </div>
          </div>
        </div>

        {/* Group members with handicaps */}
        {group && group.length > 0 && (
          <div className="flex items-start gap-2 text-charcoal/70 text-sm">
            <Users className="h-4 w-4 flex-shrink-0 mt-0.5 text-coral" />
            <span>Playing with: {formatGroupMembers()}</span>
          </div>
        )}

        {/* Open until info */}
        {open_until && (
          <div className="flex items-center gap-2 text-charcoal/70 text-sm">
            <Clock className="h-4 w-4 flex-shrink-0 text-coral" />
            <span>Open until {formatOpenUntil(open_until)}</span>
          </div>
        )}

        {/* Action button */}
        {isAllHolesPlayed ? (
          <Link
            to="/player/competitions/$competitionId"
            params={{
              competitionId: competition_id.toString(),
            }}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-coral hover:bg-coral/90 text-scorecard rounded-lg font-semibold transition-colors"
          >
            <Trophy className="h-5 w-5" />
            View Results
            <ChevronRight className="h-5 w-5" />
          </Link>
        ) : (
          <Link
            to="/player/competitions/$competitionId/tee-times/$teeTimeId"
            params={{
              competitionId: competition_id.toString(),
              teeTimeId: tee_time_id.toString(),
            }}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-coral hover:bg-coral/90 text-scorecard rounded-lg font-semibold transition-colors"
          >
            <Play className="h-5 w-5" />
            Continue Playing
            <ChevronRight className="h-5 w-5" />
          </Link>
        )}
      </div>
    </div>
  );
}

export default ActiveRoundBanner;

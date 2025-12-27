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
    // Finished state - green theme
    return (
      <div className="bg-gradient-to-r from-turf to-fairway rounded-xl overflow-hidden shadow-lg">
        {/* Header */}
        <div className="px-4 py-2 bg-black/10 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-scorecard" />
          <span className="text-xs font-semibold text-scorecard uppercase tracking-wide">
            Round Complete
          </span>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Competition info */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-display font-semibold text-scorecard truncate">
                {competition_name}
              </h3>
              <div className="flex items-center gap-1 text-scorecard/80 text-sm mt-1">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{course_name}</span>
              </div>
            </div>

            {/* Final score badge */}
            <div className="flex-shrink-0 bg-scorecard/20 rounded-lg px-3 py-2 text-center">
              <div className="text-2xl font-display font-bold text-scorecard">
                {formatScore(current_score)}
              </div>
              <div className="text-xs text-scorecard/80">Final</div>
            </div>
          </div>

          {/* Group members with handicaps */}
          {group && group.length > 0 && (
            <div className="flex items-start gap-2 text-scorecard/80 text-sm">
              <Users className="h-4 w-4 flex-shrink-0 mt-0.5" />
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
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-scorecard hover:bg-scorecard/90 text-turf rounded-lg font-semibold transition-colors"
            >
              <FileText className="h-5 w-5" />
              Scorecard
            </Link>
            <Link
              to="/player/competitions/$competitionId"
              params={{ competitionId: competition_id.toString() }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-scorecard/20 hover:bg-scorecard/30 text-scorecard rounded-lg font-semibold transition-colors"
            >
              <Trophy className="h-5 w-5" />
              Leaderboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Playing state - orange theme
  return (
    <div className="bg-gradient-to-r from-coral to-orange-500 rounded-xl overflow-hidden shadow-lg">
      {/* Header with pulse indicator */}
      <div className="px-4 py-2 bg-black/10 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-scorecard opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-scorecard"></span>
        </span>
        <span className="text-xs font-semibold text-scorecard uppercase tracking-wide">
          Round in Progress
        </span>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Competition info */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-display font-semibold text-scorecard truncate">
              {competition_name}
            </h3>
            <div className="flex items-center gap-1 text-scorecard/80 text-sm mt-1">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{course_name}</span>
            </div>
          </div>

          {/* Score badge */}
          <div className="flex-shrink-0 bg-scorecard/20 rounded-lg px-3 py-2 text-center">
            <div className="text-2xl font-display font-bold text-scorecard">
              {formatScore(current_score)}
            </div>
            <div className="text-xs text-scorecard/80">
              Hole {holes_played}/18
            </div>
          </div>
        </div>

        {/* Group members with handicaps */}
        {group && group.length > 0 && (
          <div className="flex items-start gap-2 text-scorecard/80 text-sm">
            <Users className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>Playing with: {formatGroupMembers()}</span>
          </div>
        )}

        {/* Open until info */}
        {open_until && (
          <div className="flex items-center gap-2 text-scorecard/70 text-xs">
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span>Open until {formatOpenUntil(open_until)}</span>
          </div>
        )}

        {/* Continue button */}
        <Link
          to="/player/competitions/$competitionId/tee-times/$teeTimeId"
          params={{
            competitionId: competition_id.toString(),
            teeTimeId: tee_time_id.toString(),
          }}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-scorecard hover:bg-scorecard/90 text-coral rounded-lg font-semibold transition-colors"
        >
          <Play className="h-5 w-5" />
          Continue Playing
          <ChevronRight className="h-5 w-5" />
        </Link>
      </div>
    </div>
  );
}

export default ActiveRoundBanner;

import { useParams } from "@tanstack/react-router";
import { usePlayerProfile } from "@/api/player-profile";
import {
  AlertCircle,
  RefreshCw,
  Trophy,
  Target,
  MapPin,
  Eye,
  EyeOff,
  Users,
  Lock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { PlayerPageLayout } from "@/components/layout/PlayerPageLayout";

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-scorecard animate-pulse">
      <div className="bg-turf h-16" />
      <div className="h-[200px] bg-gradient-to-b from-turf to-fairway" />
      <div className="container mx-auto px-4 -mt-16">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gray-300 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-gray-300 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-1/3" />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <PlayerPageLayout title="Player Profile">
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-flag/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-8 w-8 text-flag" />
          </div>
          <h1 className="text-display-md font-display font-bold text-charcoal mb-4">
            {title}
          </h1>
          <p className="text-body-lg text-charcoal/70 mb-8">{message}</p>
          {onRetry && (
            <Button
              onClick={onRetry}
              className="bg-turf hover:bg-fairway text-scorecard"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </div>
    </PlayerPageLayout>
  );
}

function PrivateProfile() {
  return (
    <PlayerPageLayout title="Player Profile">
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-charcoal/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Lock className="h-8 w-8 text-charcoal/60" />
          </div>
          <h1 className="text-display-md font-display font-bold text-charcoal mb-4">
            Private Profile
          </h1>
          <p className="text-body-lg text-charcoal/70">
            This player's profile is private.
          </p>
        </div>
      </div>
    </PlayerPageLayout>
  );
}

// Visibility icon helper
function VisibilityIcon({ visibility }: { visibility: string }) {
  switch (visibility) {
    case "public":
      return <Eye className="h-4 w-4" />;
    case "friends":
      return <Users className="h-4 w-4" />;
    case "private":
      return <EyeOff className="h-4 w-4" />;
    default:
      return <Eye className="h-4 w-4" />;
  }
}

export default function PlayerPublicProfile() {
  const { playerId } = useParams({ from: "/player/players/$playerId" });
  const playerIdNum = parseInt(playerId);

  const { data: profile, isLoading, error, refetch } = usePlayerProfile(playerIdNum);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load profile";

    // Check if it's a private profile error
    if (errorMessage.includes("private")) {
      return <PrivateProfile />;
    }

    return (
      <ErrorState
        title="Player Not Found"
        message={errorMessage}
        onRetry={() => refetch()}
      />
    );
  }

  if (!profile) {
    return (
      <ErrorState
        title="Player Not Found"
        message="This player profile could not be found."
      />
    );
  }

  return (
    <PlayerPageLayout title={profile.display_name || profile.name}>
      {/* Hero section with gradient */}
      <div className="bg-gradient-to-b from-turf to-fairway h-[160px]" />

      {/* Profile card - overlaps hero */}
      <div className="container mx-auto px-4 -mt-20">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name}
                className="w-14 h-14 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 bg-turf/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-turf">
                  {(profile.display_name || profile.name).charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Name and handicap */}
            <div className="flex-1 min-w-0">
              <h1 className="text-display-md font-display font-bold text-charcoal truncate">
                {profile.display_name || profile.name}
              </h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-charcoal/70">
                <span className="font-medium text-turf">
                  HCP {profile.handicap.toFixed(1)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <VisibilityIcon visibility={profile.visibility} />
                  {profile.visibility}
                </span>
              </div>
              {profile.home_course_name && (
                <p className="flex items-center gap-1 text-charcoal/70 text-sm mt-2">
                  <MapPin className="h-4 w-4 text-turf" />
                  {profile.home_course_name}
                </p>
              )}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && (
            <p className="text-charcoal/70 mt-4">{profile.bio}</p>
          )}
        </div>

        {/* Stats row */}
        <div className="bg-white rounded-xl mb-6">
          <div className="flex divide-x divide-soft-grey">
            <div className="flex-1 py-4 text-center">
              <div className="text-2xl font-bold text-turf">
                {profile.total_rounds}
              </div>
              <div className="text-sm text-charcoal/60">Rounds</div>
            </div>
            <div className="flex-1 py-4 text-center">
              <div className="text-2xl font-bold text-turf">
                {profile.competitions_played}
              </div>
              <div className="text-sm text-charcoal/60">Competitions</div>
            </div>
            <div className="flex-1 py-4 text-center">
              <div className="text-2xl font-bold text-turf">
                {profile.best_score || "–"}
              </div>
              <div className="text-sm text-charcoal/60">Best</div>
            </div>
            <div className="flex-1 py-4 text-center">
              <div className="text-2xl font-bold text-turf">
                {profile.average_score?.toFixed(1) || "–"}
              </div>
              <div className="text-sm text-charcoal/60">Avg</div>
            </div>
          </div>
        </div>

        {/* Handicap info */}
        <div className="bg-white rounded-xl border-l-4 border-turf mb-6">
          <div className="flex items-center gap-2 px-4 pt-4">
            <Target className="h-5 w-5 text-turf" />
            <h2 className="text-lg font-display font-bold text-charcoal">
              Handicap Index
            </h2>
          </div>

          <div className="text-center py-4 mx-4 border-b border-soft-grey">
            <div className="text-4xl font-bold text-turf">
              {profile.handicap.toFixed(1)}
            </div>
            <div className="text-sm text-charcoal/60">Current Index</div>
          </div>

          {/* Recent handicap history */}
          {profile.handicap_history && profile.handicap_history.length > 1 && (
            <div className="px-4 py-4">
              <h3 className="text-sm font-medium text-charcoal/60 mb-2">
                Recent Changes
              </h3>
              <div className="divide-y divide-soft-grey">
                {profile.handicap_history.slice(0, 3).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between text-sm py-2"
                  >
                    <span className="font-medium">
                      {entry.handicap_index.toFixed(1)}
                    </span>
                    <span className="text-charcoal/50">
                      {new Date(entry.effective_date).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Activity summary */}
        <div className="bg-white rounded-xl border-l-4 border-turf mb-6">
          <div className="flex items-center gap-2 px-4 pt-4">
            <Trophy className="h-5 w-5 text-turf" />
            <h2 className="text-lg font-display font-bold text-charcoal">
              Activity
            </h2>
          </div>

          {profile.total_rounds > 0 ? (
            <div className="text-center py-4 px-4">
              <p className="text-charcoal/70">
                {profile.name} has played {profile.total_rounds} rounds across{" "}
                {profile.competitions_played} competitions.
              </p>
              {profile.best_score && profile.average_score && (
                <p className="text-charcoal/50 text-sm mt-2">
                  Best: {profile.best_score} | Avg: {profile.average_score.toFixed(1)}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8 px-4 text-charcoal/60">
              <Trophy className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No rounds recorded yet</p>
            </div>
          )}
        </div>
      </div>
    </PlayerPageLayout>
  );
}

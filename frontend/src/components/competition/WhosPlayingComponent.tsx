import { Users, Clock, Trophy } from "lucide-react";
import type {
  CompetitionGroup,
  CompetitionGroupMember,
} from "../../api/tour-registration";

interface WhosPlayingComponentProps {
  groups: CompetitionGroup[] | undefined;
  isLoading: boolean;
}

function getStatusBadge(status: CompetitionGroup["status"]) {
  switch (status) {
    case "on_course":
      return (
        <span className="px-2 py-0.5 bg-turf/20 text-turf rounded-full text-xs font-medium">
          On Course
        </span>
      );
    case "finished":
      return (
        <span className="px-2 py-0.5 bg-rough text-charcoal/70 rounded-full text-xs font-medium">
          Finished
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 bg-coral/20 text-coral rounded-full text-xs font-medium">
          Registered
        </span>
      );
  }
}

function getMemberStatusBadge(status: CompetitionGroupMember["registration_status"]) {
  switch (status) {
    case "playing":
      return (
        <span className="w-2 h-2 rounded-full bg-turf animate-pulse" title="Playing" />
      );
    case "finished":
      return (
        <span className="w-2 h-2 rounded-full bg-charcoal/40" title="Finished" />
      );
    default:
      return null;
  }
}

export function WhosPlayingComponent({ groups, isLoading }: WhosPlayingComponentProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-coral border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <div className="text-center py-12 text-charcoal/70">
        <Users className="h-12 w-12 mx-auto mb-4 text-charcoal/30" />
        <p className="text-lg font-medium">No players yet</p>
        <p className="text-sm mt-1">Players will appear here once they register</p>
      </div>
    );
  }

  // Count statistics
  const onCourseGroups = groups.filter((g) => g.status === "on_course").length;
  const finishedGroups = groups.filter((g) => g.status === "finished").length;
  const totalPlayers = groups.reduce((sum, g) => sum + g.members.length, 0);

  return (
    <div className="space-y-4">
      {/* Statistics Bar */}
      <div className="flex items-center justify-center gap-4 text-sm text-charcoal/70">
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          <span>{totalPlayers} players</span>
        </div>
        {onCourseGroups > 0 && (
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-turf" />
            <span>{onCourseGroups} on course</span>
          </div>
        )}
        {finishedGroups > 0 && (
          <div className="flex items-center gap-1">
            <Trophy className="h-4 w-4 text-charcoal/50" />
            <span>{finishedGroups} finished</span>
          </div>
        )}
      </div>

      {/* Groups List */}
      <div className="space-y-3">
        {groups.map((group) => (
          <div
            key={group.tee_time_id}
            className={`bg-scorecard rounded-xl border p-4 ${
              group.status === "on_course"
                ? "border-turf/30 bg-turf/5"
                : group.status === "finished"
                  ? "border-soft-grey bg-rough/30"
                  : "border-soft-grey"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {getStatusBadge(group.status)}
                <span className="text-xs text-charcoal/50">
                  {group.members.length} player{group.members.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {group.members.map((member) => (
                <div
                  key={member.player_id}
                  className={`flex items-center justify-between p-2 rounded-lg ${
                    member.registration_status === "playing"
                      ? "bg-turf/10"
                      : member.registration_status === "finished"
                        ? "bg-rough/50"
                        : "bg-rough/20"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {getMemberStatusBadge(member.registration_status)}
                    <span className="font-medium text-charcoal truncate">
                      {member.name}
                    </span>
                    {member.category_name && (
                      <span className="text-xs text-charcoal/50 truncate">
                        ({member.category_name})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-charcoal/70 shrink-0">
                    <span className="text-xs">
                      HCP {member.handicap !== undefined ? member.handicap.toFixed(1) : "-"}
                    </span>
                    {member.holes_played > 0 && (
                      <span className="font-mono text-xs">
                        H{member.holes_played} {member.current_score}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

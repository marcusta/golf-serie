import type { ReactNode } from "react";
import { Users, Clock, CheckCircle2, Circle, Play } from "lucide-react";
import type {
  CompetitionGroup,
  CompetitionGroupMember,
} from "../../api/tour-registration";
import { getToParColor } from "../../utils/scoreCalculations";

interface WhosPlayingComponentProps {
  groups: CompetitionGroup[] | undefined;
  isLoading: boolean;
  /** Current user's tee time ID to identify "My Group" */
  myTeeTimeId?: number;
  /** Whether this is an open-start competition (no scheduled tee times) */
  isOpenStart?: boolean;
}

function categorizeGroups(groups: CompetitionGroup[], myTeeTimeId?: number) {
  const myGroup: CompetitionGroup | undefined = myTeeTimeId
    ? groups.find(g => g.tee_time_id === myTeeTimeId)
    : undefined;

  const otherGroups = myTeeTimeId
    ? groups.filter(g => g.tee_time_id !== myTeeTimeId)
    : groups;

  const onCourse: CompetitionGroup[] = [];
  const registered: CompetitionGroup[] = [];
  const finished: CompetitionGroup[] = [];

  for (const group of otherGroups) {
    if (group.status === "on_course") {
      onCourse.push(group);
    } else if (group.status === "finished") {
      finished.push(group);
    } else {
      registered.push(group);
    }
  }

  return { myGroup, onCourse, registered, finished };
}

// Get the minimum hole completed by all players in the group
function getGroupCurrentHole(group: CompetitionGroup): number {
  if (group.members.length === 0) return 0;
  const holesPlayed = group.members.map((m) => m.holes_played || 0);
  return Math.min(...holesPlayed);
}

// Parse a formatted score string ("+3", "-2", "E", "-") back to a number
function parseFormattedScore(formatted: string | undefined): number | undefined {
  if (!formatted || formatted === "-") return undefined;
  if (formatted === "E") return 0;
  const num = parseInt(formatted, 10);
  return isNaN(num) ? undefined : num;
}

function getStatusLabel(status: CompetitionGroup["status"]): string {
  switch (status) {
    case "on_course": return "On Course";
    case "finished": return "Finished";
    default: return "Registered";
  }
}

export function WhosPlayingComponent({
  groups,
  isLoading,
  myTeeTimeId,
  isOpenStart = true,
}: WhosPlayingComponentProps) {
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

  // Categorize groups
  const { myGroup, onCourse, registered, finished } = categorizeGroups(groups, myTeeTimeId);
  const totalPlayers = groups.reduce((sum, g) => sum + g.members.length, 0);
  const totalOnCourse = onCourse.length + (myGroup?.status === "on_course" ? 1 : 0);

  // Double-line player row
  const renderMemberRow = (member: CompetitionGroupMember) => {
    const score = member.current_score;
    const toPar = parseFormattedScore(score);
    const scoreColor = toPar !== undefined ? getToParColor(toPar) : "text-charcoal";

    return (
      <div
        key={member.player_id}
        className="px-4 py-3 flex items-start justify-between"
      >
        <div className="min-w-0 flex-1">
          <div className="font-medium text-fairway truncate">
            {member.name}
          </div>
          <div className="text-xs text-charcoal/50 mt-0.5">
            {member.category_name && <span>({member.category_name}) </span>}
            HCP {member.handicap !== undefined ? member.handicap.toFixed(1) : "-"}
          </div>
        </div>
        {score && score !== "-" && (
          <div className={`text-sm font-semibold ml-3 ${scoreColor}`}>
            {score}
          </div>
        )}
      </div>
    );
  };

  const renderGroupCard = (
    group: CompetitionGroup,
    statusIndicator?: ReactNode,
    highlight?: boolean
  ) => {
    return (
      <div
        key={group.tee_time_id}
        className={`border-l-4 transition-colors ${
          highlight
            ? "border-turf"
            : "border-soft-grey hover:border-turf"
        }`}
      >
        <div className="bg-rough/20 px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-charcoal/50 font-primary">
            {group.members.length} player{group.members.length !== 1 ? "s" : ""}
          </span>
          {statusIndicator}
        </div>
        <div className="divide-y divide-soft-grey/50">
          {group.members.map(renderMemberRow)}
        </div>
      </div>
    );
  };

  const renderStatusIndicator = (group: CompetitionGroup) => {
    if (group.status === "on_course") {
      const currentHole = getGroupCurrentHole(group);
      if (currentHole > 0) {
        return (
          <span className="text-xs text-charcoal/60 font-semibold font-primary">
            Hole {currentHole}
          </span>
        );
      }
    }
    if (group.status === "finished") {
      return (
        <span className="text-xs text-charcoal/60 font-medium font-primary">
          Done
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Statistics Bar */}
      <div className="flex items-center justify-center gap-4 text-sm text-charcoal/70">
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          <span>{totalPlayers} players</span>
        </div>
        {totalOnCourse > 0 && (
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4 text-coral" />
            <span>{totalOnCourse} on course</span>
          </div>
        )}
      </div>

      {/* My Group Section */}
      {myGroup && (
        <div>
          <h3 className="text-sm font-medium text-fairway mb-3 font-primary flex items-center gap-2">
            <Play className="w-4 h-4 text-turf" />
            Your Group
            <span className="text-xs text-coral font-semibold">
              {getStatusLabel(myGroup.status)}
            </span>
          </h3>
          <div className="space-y-3">
            {renderGroupCard(myGroup, renderStatusIndicator(myGroup), true)}
          </div>
        </div>
      )}

      {/* On Course Section - Other groups playing */}
      {onCourse.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-fairway mb-3 font-primary flex items-center gap-2">
            <Play className="w-4 h-4 text-coral" />
            On Course
            <span className="text-charcoal/50 font-normal">({onCourse.length})</span>
          </h3>
          <div className="space-y-3">
            {onCourse.map((group) => renderGroupCard(group, renderStatusIndicator(group)))}
          </div>
        </div>
      )}

      {/* Registered / Waiting Section - Not started */}
      {registered.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-fairway mb-3 font-primary flex items-center gap-2">
            <Circle className="w-4 h-4 text-charcoal/40" />
            {isOpenStart ? "Waiting to Start" : "Not Started"}
            <span className="text-charcoal/50 font-normal">({registered.length})</span>
          </h3>
          <div className="space-y-3">
            {registered.map((group) => renderGroupCard(group))}
          </div>
        </div>
      )}

      {/* Finished Section */}
      {finished.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-fairway mb-3 font-primary flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-turf" />
            Finished
            <span className="text-charcoal/50 font-normal">({finished.length})</span>
          </h3>
          <div className="space-y-3">
            {finished.map((group) => renderGroupCard(group, renderStatusIndicator(group)))}
          </div>
        </div>
      )}

      {/* Empty state when no groups at all */}
      {!myGroup && onCourse.length === 0 && registered.length === 0 && finished.length === 0 && (
        <div className="text-center py-6 text-charcoal/50 text-sm font-primary">
          No groups in this competition.
        </div>
      )}
    </div>
  );
}

import { useParams, Link } from "@tanstack/react-router";
import { useCompetition } from "../../api/competitions";
import {
  useCompetitionGroups,
  type CompetitionGroup,
  type CompetitionGroupMember,
} from "../../api/tour-registration";
import { ArrowLeft, Users, Clock, Trophy, RefreshCw } from "lucide-react";

function getStatusBadge(status: CompetitionGroup["status"]) {
  switch (status) {
    case "on_course":
      return (
        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
          On Course
        </span>
      );
    case "finished":
      return (
        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
          Finished
        </span>
      );
    default:
      return (
        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
          Registered
        </span>
      );
  }
}

function getMemberStatusIcon(status: CompetitionGroupMember["registration_status"]) {
  switch (status) {
    case "playing":
      return <span className="text-green-600 text-xs">Playing</span>;
    case "finished":
      return <span className="text-gray-600 text-xs">Finished</span>;
    case "looking_for_group":
      return <span className="text-yellow-600 text-xs">LFG</span>;
    default:
      return null;
  }
}

export default function AdminCompetitionGroups() {
  const { competitionId } = useParams({ strict: false });
  const { data: competition, isLoading: competitionLoading } = useCompetition(
    competitionId ? parseInt(competitionId) : 0
  );
  const {
    data: groups,
    isLoading: groupsLoading,
    refetch,
  } = useCompetitionGroups(competitionId ? parseInt(competitionId) : 0);

  if (competitionLoading || groupsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!competition) {
    return <div className="text-center py-12 text-gray-500">Competition not found</div>;
  }

  // Count statistics
  const onCourseGroups = groups?.filter((g) => g.status === "on_course").length || 0;
  const registeredGroups = groups?.filter((g) => g.status === "registered").length || 0;
  const finishedGroups = groups?.filter((g) => g.status === "finished").length || 0;
  const totalPlayers = groups?.reduce((sum, g) => sum + g.members.length, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              to={`/admin/competitions`}
              search={competition.tour_id ? { tour: String(competition.tour_id) } : undefined}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Competitions
            </Link>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{competition.name}</h2>
          <p className="text-gray-600">Groups Overview - Who's Playing</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Players</p>
              <p className="text-2xl font-bold text-gray-900">{totalPlayers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Clock className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">On Course</p>
              <p className="text-2xl font-bold text-gray-900">{onCourseGroups}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Registered</p>
              <p className="text-2xl font-bold text-gray-900">{registeredGroups}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Trophy className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Finished</p>
              <p className="text-2xl font-bold text-gray-900">{finishedGroups}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Groups List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Playing Groups ({groups?.length || 0})
          </h3>
        </div>

        {!groups || groups.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No groups yet</p>
            <p className="text-sm mt-1">Players will appear here once they register for the competition</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {groups.map((group) => (
              <div key={group.tee_time_id} className="px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500">
                      Group #{group.tee_time_id}
                    </span>
                    {getStatusBadge(group.status)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {group.members.length} player{group.members.length !== 1 ? "s" : ""}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {group.members.map((member) => (
                    <div
                      key={member.player_id}
                      className={`p-3 rounded-lg border ${
                        member.registration_status === "playing"
                          ? "bg-green-50 border-green-200"
                          : member.registration_status === "finished"
                            ? "bg-gray-50 border-gray-200"
                            : "bg-white border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{member.name}</span>
                        {getMemberStatusIcon(member.registration_status)}
                      </div>
                      <div className="flex items-center justify-between mt-1 text-sm text-gray-500">
                        <span>
                          HCP: {member.handicap !== undefined ? member.handicap.toFixed(1) : "-"}
                        </span>
                        {member.holes_played > 0 && (
                          <span>
                            Hole {member.holes_played} • {member.current_score}
                          </span>
                        )}
                      </div>
                      {member.category_name && (
                        <div className="mt-1 text-xs text-gray-400">{member.category_name}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useParticipants } from "../api/participants";
import { Users, Trophy, Clock, Hash } from "lucide-react";

function getPlayerInitials(playerNames?: string) {
  if (!playerNames) return "U";
  return playerNames
    .split(" ")
    .map((name) => name[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getAvatarColor(index: number) {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-red-500",
  ];
  return colors[index % colors.length];
}

export default function Participants() {
  const { data: participants, isLoading, error } = useParticipants();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2 mb-6">
          <Users className="h-8 w-8 text-green-600" />
          <h2 className="text-3xl font-bold text-gray-900">Participants</h2>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-gray-200 shadow-sm p-6"
            >
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-[250px]"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-[200px]"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded-full animate-pulse w-[80px]"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 text-red-700">
          <Trophy className="h-5 w-5" />
          <p className="font-medium">Error loading participants</p>
        </div>
        <p className="text-red-600 text-sm mt-2">
          Please try refreshing the page or contact support if the problem
          persists.
        </p>
      </div>
    );
  }

  if (!participants || participants.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2 mb-6">
          <Users className="h-8 w-8 text-green-600" />
          <h2 className="text-3xl font-bold text-gray-900">Participants</h2>
        </div>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No participants yet
          </h3>
          <p className="text-gray-600">
            When participants join the competition, they'll appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-8 w-8 text-green-600" />
          <h2 className="text-3xl font-bold text-gray-900">Participants</h2>
        </div>
        <span className="bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full">
          {participants.length}{" "}
          {participants.length === 1 ? "participant" : "participants"}
        </span>
      </div>

      <div className="grid gap-4">
        {participants.map((participant, index) => (
          <div
            key={participant.id}
            className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 border-l-4 border-l-green-500"
          >
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <div
                    className={`h-12 w-12 ${getAvatarColor(
                      index
                    )} text-white rounded-full flex items-center justify-center font-semibold`}
                  >
                    {getPlayerInitials(participant.player_names)}
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {participant.player_names || "Unnamed Player"}
                    </h3>
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Hash className="h-4 w-4" />
                        <span>Team {participant.team_id}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>Tee Time {participant.tee_time_id}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Trophy className="h-4 w-4" />
                        <span>Order: {participant.tee_order}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-2">
                  <span className="bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full border">
                    {participant.position_name}
                  </span>
                  {participant.score && participant.score.length > 0 && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Current Score</p>
                      <p className="text-lg font-bold text-green-600">
                        {participant.score.reduce((a, b) => a + b, 0)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

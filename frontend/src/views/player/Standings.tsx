import { useParticipants } from "../../api/participants";
import { useCompetitions } from "../../api/competitions";
import { Trophy, Medal, Award, TrendingUp } from "lucide-react";

interface StandingEntry {
  participantId: number;
  participantName: string;
  totalScore: number;
  competitionsPlayed: number;
  averageScore: number;
  bestScore: number;
  position: number;
}

export default function PlayerStandings() {
  const { isLoading: participantsLoading } = useParticipants();
  const { data: competitions, isLoading: competitionsLoading } =
    useCompetitions();

  if (participantsLoading || competitionsLoading) {
    return <div>Loading standings...</div>;
  }

  // Mock standings data - in a real app, this would come from the API
  const standings: StandingEntry[] = [
    {
      participantId: 1,
      participantName: "John Smith",
      totalScore: 285,
      competitionsPlayed: 4,
      averageScore: 71.25,
      bestScore: 68,
      position: 1,
    },
    {
      participantId: 2,
      participantName: "Sarah Johnson",
      totalScore: 292,
      competitionsPlayed: 4,
      averageScore: 73.0,
      bestScore: 70,
      position: 2,
    },
    {
      participantId: 3,
      participantName: "Mike Wilson",
      totalScore: 298,
      competitionsPlayed: 4,
      averageScore: 74.5,
      bestScore: 72,
      position: 3,
    },
    {
      participantId: 4,
      participantName: "Emma Davis",
      totalScore: 305,
      competitionsPlayed: 4,
      averageScore: 76.25,
      bestScore: 74,
      position: 4,
    },
    {
      participantId: 5,
      participantName: "Tom Brown",
      totalScore: 312,
      competitionsPlayed: 4,
      averageScore: 78.0,
      bestScore: 75,
      position: 5,
    },
  ];

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="text-gray-500 font-medium">#{position}</span>;
    }
  };

  const getPositionBg = (position: number) => {
    switch (position) {
      case 1:
        return "bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200";
      case 2:
        return "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200";
      case 3:
        return "bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200";
      default:
        return "bg-white border-gray-200";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-green-600" />
            General Standings
          </h2>
          <p className="text-gray-600">
            Overall performance across all competitions
          </p>
        </div>
        <div className="text-sm text-gray-500">
          Based on {competitions?.length || 0} competitions
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium text-gray-600">
              Total Players
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {standings.length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <Medal className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium text-gray-600">Avg Score</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {(
              standings.reduce((sum, s) => sum + s.averageScore, 0) /
              standings.length
            ).toFixed(1)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium text-gray-600">
              Best Score
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {Math.min(...standings.map((s) => s.bestScore))}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-500" />
            <span className="text-sm font-medium text-gray-600">
              Competitions
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-1">
            {competitions?.length || 0}
          </div>
        </div>
      </div>

      {/* Standings Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Leaderboard</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {standings.map((entry) => (
            <div
              key={entry.participantId}
              className={`px-6 py-4 ${getPositionBg(
                entry.position
              )} border-l-4`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8">
                    {getPositionIcon(entry.position)}
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">
                      {entry.participantName}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {entry.competitionsPlayed} competitions played
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="grid grid-cols-3 gap-6 text-sm">
                    <div>
                      <div className="text-gray-600">Total Score</div>
                      <div className="font-semibold text-gray-900">
                        {entry.totalScore}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Average</div>
                      <div className="font-semibold text-gray-900">
                        {entry.averageScore.toFixed(1)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Best</div>
                      <div className="font-semibold text-green-600">
                        {entry.bestScore}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

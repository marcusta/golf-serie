import {
  useSeriesTeams,
  useAvailableTeams,
  useAddTeamToSeries,
  useRemoveTeamFromSeries,
} from "@/api/series";
import { type Team } from "@/api/teams";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { useNotification } from "@/hooks/useNotification";

interface SeriesTeamsTabProps {
  seriesId: number;
}

export function SeriesTeamsTab({ seriesId }: SeriesTeamsTabProps) {
  const { isSuperAdmin } = useAuth();
  const { showError } = useNotification();

  const { data: seriesTeams } = useSeriesTeams(seriesId);
  const { data: availableTeams } = useAvailableTeams(seriesId);
  const addTeamToSeries = useAddTeamToSeries();
  const removeTeamFromSeries = useRemoveTeamFromSeries();

  const handleAddTeam = async (teamId: number) => {
    try {
      await addTeamToSeries.mutateAsync({
        seriesId,
        teamId,
      });
    } catch (error) {
      console.error("Failed to add team to series:", error);
      showError("Failed to add team to series. Please try again.");
    }
  };

  const handleRemoveTeam = async (teamId: number) => {
    try {
      await removeTeamFromSeries.mutateAsync({
        seriesId,
        teamId,
      });
    } catch (error) {
      console.error("Failed to remove team from series:", error);
      showError("Failed to remove team from series. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      {!isSuperAdmin && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            Team management is restricted to super administrators. Contact a
            super admin to add or remove teams from this series.
          </p>
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Teams in Series</CardTitle>
          </CardHeader>
          <CardContent>
            {seriesTeams && seriesTeams.length > 0 ? (
              <div className="space-y-2">
                {seriesTeams.map((team: Team) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">{team.name}</span>
                    </div>
                    {isSuperAdmin && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveTeam(team.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                No teams in this series yet.
              </p>
            )}
          </CardContent>
        </Card>

        {isSuperAdmin && (
          <Card>
            <CardHeader>
              <CardTitle>Available Teams</CardTitle>
            </CardHeader>
            <CardContent>
              {availableTeams && availableTeams.length > 0 ? (
                <div className="space-y-2">
                  {availableTeams.map((team: Team) => (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-600" />
                        <span className="font-medium">{team.name}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddTeam(team.id)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Add to Series
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  All teams are already in this series.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

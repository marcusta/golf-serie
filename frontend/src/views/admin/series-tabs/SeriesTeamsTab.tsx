import {
  useSeriesTeams,
  useAvailableTeams,
  useAddTeamToSeries,
  useRemoveTeamFromSeries,
} from "@/api/series";
import { type Team } from "@/api/teams";
import { useAuth } from "@/context/AuthContext";
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
        <div className="bg-sky/5 border border-sky/30 rounded-lg p-3">
          <p className="text-sm text-sky">
            Team management is restricted to super administrators. Contact a
            super admin to add or remove teams from this series.
          </p>
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white border border-soft-grey rounded-lg p-4">
          <div className="text-sm font-semibold uppercase tracking-wide text-charcoal mb-3">
            Teams in Series
          </div>
          {seriesTeams && seriesTeams.length > 0 ? (
            <div className="divide-y divide-soft-grey">
              {seriesTeams.map((team: Team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-2 text-sm text-charcoal">
                    <Users className="h-4 w-4 text-charcoal/60" />
                    <span className="font-medium">{team.name}</span>
                  </div>
                  {isSuperAdmin && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveTeam(team.id)}
                      className="h-8 px-2 rounded-md text-sm text-flag hover:text-flag hover:bg-flag/10"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-charcoal/60">
              No teams in this series yet.
            </p>
          )}
        </div>

        {isSuperAdmin && (
          <div className="bg-white border border-soft-grey rounded-lg p-4">
            <div className="text-sm font-semibold uppercase tracking-wide text-charcoal mb-3">
              Available Teams
            </div>
            {availableTeams && availableTeams.length > 0 ? (
              <div className="divide-y divide-soft-grey">
                {availableTeams.map((team: Team) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div className="flex items-center gap-2 text-sm text-charcoal">
                      <Users className="h-4 w-4 text-charcoal/60" />
                      <span className="font-medium">{team.name}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddTeam(team.id)}
                      className="h-8 px-2 rounded-md text-sm text-turf hover:text-fairway hover:bg-rough/30"
                    >
                      Add to Series
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-charcoal/60">
                All teams are already in this series.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

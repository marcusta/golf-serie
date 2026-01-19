import { useState } from "react";
import {
  useTeams,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  type Team,
} from "@/api/teams";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Shield, Calendar, Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useNotification } from "@/hooks/useNotification";

function TeamSkeleton() {
  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-[180px]" />
          <Skeleton className="h-5 w-[60px] rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-[120px]" />
      </CardContent>
    </Card>
  );
}

function getTeamColor(index: number) {
  const colors = [
    {
      bg: "bg-blue-50",
      border: "border-l-blue-500",
      text: "text-blue-700",
      icon: "text-blue-600",
    },
    {
      bg: "bg-green-50",
      border: "border-l-green-500",
      text: "text-green-700",
      icon: "text-green-600",
    },
    {
      bg: "bg-purple-50",
      border: "border-l-purple-500",
      text: "text-purple-700",
      icon: "text-purple-600",
    },
    {
      bg: "bg-orange-50",
      border: "border-l-orange-500",
      text: "text-orange-700",
      icon: "text-orange-600",
    },
    {
      bg: "bg-pink-50",
      border: "border-l-pink-500",
      text: "text-pink-700",
      icon: "text-pink-600",
    },
    {
      bg: "bg-teal-50",
      border: "border-l-teal-500",
      text: "text-teal-700",
      icon: "text-teal-600",
    },
    {
      bg: "bg-indigo-50",
      border: "border-l-indigo-500",
      text: "text-indigo-700",
      icon: "text-indigo-600",
    },
    {
      bg: "bg-red-50",
      border: "border-l-red-500",
      text: "text-red-700",
      icon: "text-red-600",
    },
  ];
  return colors[index % colors.length];
}

export default function Teams() {
  const { data: teams, isLoading, error } = useTeams();
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();
  const { showError } = useNotification();

  const [showDialog, setShowDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState("");

  const handleCreate = () => {
    setEditingTeam(null);
    setTeamName("");
    setShowDialog(true);
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setTeamName(team.name);
    setShowDialog(true);
  };

  const handleDelete = async (team: Team) => {
    if (
      window.confirm(`Are you sure you want to delete team "${team.name}"?`)
    ) {
      try {
        await deleteTeam.mutateAsync(team.id);
      } catch (error) {
        console.error("Failed to delete team:", error);
        showError("Failed to delete team. Please try again.");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      if (editingTeam) {
        await updateTeam.mutateAsync({
          id: editingTeam.id,
          data: { name: teamName },
        });
      } else {
        await createTeam.mutateAsync({ name: teamName });
      }
      setShowDialog(false);
    } catch (error) {
      console.error("Failed to save team:", error);
      showError("Failed to save team. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2 mb-6">
          <Users className="h-8 w-8 text-green-600" />
          <h2 className="text-3xl font-bold text-gray-900">Teams</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <TeamSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-700">
            <Users className="h-5 w-5" />
            <p className="font-medium">Error loading teams</p>
          </div>
          <p className="text-red-600 text-sm mt-2">
            Please try refreshing the page or contact support if the problem
            persists.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="h-8 w-8 text-green-600" />
          <h2 className="text-3xl font-bold text-gray-900">Teams</h2>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-sm">
            {teams?.length || 0} {teams?.length === 1 ? "team" : "teams"}
          </Badge>
          <Button onClick={handleCreate} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Team
          </Button>
        </div>
      </div>

      {!teams || teams.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No teams yet
            </h3>
            <p className="text-gray-600">
              Create teams to organize your golf competition participants.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team, index) => {
            const colors = getTeamColor(index);
            return (
              <Card
                key={team.id}
                className={`hover:shadow-lg transition-shadow duration-200 border-l-4 ${colors.border} ${colors.bg}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle
                      className={`text-lg ${colors.text} flex items-center gap-2`}
                    >
                      <Shield className={`h-5 w-5 ${colors.icon}`} />
                      {team.name}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        #{team.id}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(team)}
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(team)}
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Poäng:</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTeam ? "Edit Team" : "Create New Team"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Team Name
              </label>
              <Input
                id="name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name"
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">{editingTeam ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

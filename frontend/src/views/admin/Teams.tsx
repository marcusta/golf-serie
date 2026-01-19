import { useState } from "react";
import {
  useTeams,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
  type Team,
} from "@/api/teams";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Plus, Edit, Trash2 } from "lucide-react";
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
import { useConfirmDialog } from "@/hooks/useConfirmDialog";

function TeamSkeleton() {
  return (
    <div className="grid grid-cols-[2fr_120px_120px] items-center px-4 py-2">
      <Skeleton className="h-4 w-[180px]" />
      <Skeleton className="h-4 w-[60px]" />
      <div className="flex justify-end gap-2">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
    </div>
  );
}

export default function Teams() {
  const { data: teams, isLoading, error } = useTeams();
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();
  const { showError } = useNotification();
  const { confirm, dialog } = useConfirmDialog();

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
    const shouldDelete = await confirm({
      title: "Delete team?",
      description: `This will permanently remove "${team.name}".`,
      confirmLabel: "Delete team",
      variant: "destructive",
    });
    if (!shouldDelete) return;
    try {
      await deleteTeam.mutateAsync(team.id);
    } catch (error) {
      console.error("Failed to delete team:", error);
      showError("Failed to delete team. Please try again.");
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-charcoal/70" />
            <h2 className="text-xl font-semibold text-charcoal">Teams</h2>
          </div>
          <Skeleton className="h-9 w-[140px]" />
        </div>
        <div className="bg-white border border-soft-grey rounded-lg overflow-hidden">
          <div className="grid grid-cols-[2fr_120px_120px] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal/70 border-b border-soft-grey">
            <div>Team</div>
            <div>ID</div>
            <div className="text-right">Actions</div>
          </div>
          <div className="divide-y divide-soft-grey">
            {[...Array(6)].map((_, i) => (
              <TeamSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-flag/30 bg-flag/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-flag">
            <Users className="h-4 w-4" />
            <p className="text-sm font-medium">Error loading teams</p>
          </div>
          <p className="text-sm text-flag/80 mt-2">
            Please try refreshing the page or contact support if the problem
            persists.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-charcoal/70" />
            <h2 className="text-xl font-semibold text-charcoal">Teams</h2>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-xs text-charcoal/70">
              {teams?.length || 0} {teams?.length === 1 ? "team" : "teams"}
            </Badge>
            <Button
              onClick={handleCreate}
              className="h-9 px-3 rounded-md text-sm font-medium"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Team
            </Button>
          </div>
        </div>

      {!teams || teams.length === 0 ? (
          <Card className="border-dashed border-2 border-soft-grey">
            <CardContent className="p-8 text-center">
              <Users className="h-10 w-10 text-charcoal/40 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-charcoal mb-2">
                No teams yet
              </h3>
              <p className="text-sm text-charcoal/60">
                Create teams to organize your golf competition participants.
              </p>
            </CardContent>
          </Card>
      ) : (
          <div className="bg-white border border-soft-grey rounded-lg overflow-hidden">
            <div className="grid grid-cols-[2fr_120px_120px] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal/70 border-b border-soft-grey">
              <div>Team</div>
              <div>ID</div>
              <div className="text-right">Actions</div>
            </div>
            <div className="divide-y divide-soft-grey">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="grid grid-cols-[2fr_120px_120px] items-center px-4 py-2 text-sm"
                >
                  <div className="font-medium text-charcoal">{team.name}</div>
                  <div className="text-charcoal/70 tabular-nums">#{team.id}</div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(team)}
                      className="h-8 w-8 rounded-md"
                    >
                      <Edit className="h-4 w-4 text-charcoal/70" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(team)}
                      className="h-8 w-8 rounded-md text-flag hover:text-flag hover:bg-flag/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingTeam ? "Edit Team" : "Create New Team"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="text-xs font-semibold uppercase tracking-wide text-charcoal/70"
                >
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
                  className="h-9 px-3 rounded-md text-sm"
                >
                  Cancel
                </Button>
                <Button type="submit" className="h-9 px-3 rounded-md text-sm">
                  {editingTeam ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
      </Dialog>
      </div>
      {dialog}
    </>
  );
}

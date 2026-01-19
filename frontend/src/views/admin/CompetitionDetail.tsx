import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import {
  useCompetition,
  useCompetitionAdmins,
  useAddCompetitionAdmin,
  useRemoveCompetitionAdmin,
} from "@/api/competitions";
import { useUsers } from "@/api/tours";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, Trash2, Users, Shield, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotification, formatErrorMessage } from "@/hooks/useNotification";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminCompetitionDetail() {
  const { competitionId } = useParams({
    from: "/admin/competitions/$competitionId",
  });
  const id = parseInt(competitionId);
  const { user, isSuperAdmin } = useAuth();
  const { showError } = useNotification();

  // API hooks
  const { data: competition, isLoading: competitionLoading } =
    useCompetition(id);
  const { data: admins } = useCompetitionAdmins(id);
  const addAdminMutation = useAddCompetitionAdmin();
  const removeAdminMutation = useRemoveCompetitionAdmin();
  const { data: users } = useUsers();
  const { confirm, dialog } = useConfirmDialog();

  // Check if user can manage admins (owner or SUPER_ADMIN)
  // For stand-alone competitions, the owner_id would be the user who created it
  const canManageAdmins =
    isSuperAdmin || (competition as any)?.owner_id === user?.id;

  // Filter users available to add as admin
  const availableUsers = users?.filter(
    (u) =>
      !admins?.some((admin) => admin.user_id === u.id) &&
      u.id !== (competition as any)?.owner_id
  );

  // Local state
  const [activeTab, setActiveTab] = useState<"admins" | "settings">("admins");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Admin handlers
  const handleAddAdmin = async () => {
    setAdminError(null);
    if (!selectedUserId) {
      setAdminError("Please select a user");
      return;
    }

    try {
      await addAdminMutation.mutateAsync({
        competitionId: id,
        userId: selectedUserId,
      });
      setSelectedUserId(null);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "Failed to add admin");
    }
  };

  const handleRemoveAdmin = async (userId: number) => {
    const shouldRemove = await confirm({
      title: "Remove admin?",
      description: "This user will lose admin access to this competition.",
      confirmLabel: "Remove admin",
      variant: "destructive",
    });
    if (!shouldRemove) return;
    try {
      await removeAdminMutation.mutateAsync({ competitionId: id, userId });
    } catch (err) {
      showError(formatErrorMessage(err, "Failed to remove admin"));
    }
  };

  if (competitionLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-[300px]" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!competition) {
    return <div>Competition not found</div>;
  }

  return (
    <>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/admin/competitions"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Competitions
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {competition.name}
            </h1>
            <p className="text-gray-600">Competition #{competition.id}</p>
          </div>
        </div>
        <Badge variant="outline">{competition.date}</Badge>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("admins")}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
              activeTab === "admins"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Shield className="h-4 w-4" />
            Admins
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
              activeTab === "settings"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "admins" && (
        <div className="space-y-6">
          {/* Add Admin Form - only visible to owners and SUPER_ADMIN */}
          {canManageAdmins && (
            <Card>
              <CardHeader>
                <CardTitle>Add Competition Admin</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Select
                      value={selectedUserId ? selectedUserId.toString() : "none"}
                      onValueChange={(value) =>
                        setSelectedUserId(value === "none" ? null : parseInt(value))
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a user..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select a user...</SelectItem>
                        {availableUsers?.map((u) => (
                          <SelectItem key={u.id} value={u.id.toString()}>
                            {u.email} ({u.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {adminError && (
                      <p className="text-red-600 text-sm mt-1">{adminError}</p>
                    )}
                  </div>
                  <Button
                    onClick={handleAddAdmin}
                    disabled={addAdminMutation.isPending || !selectedUserId}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Admin
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Competition admins can manage tee times and scores for this
                  competition.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Admins List */}
          <Card>
            <CardHeader>
              <CardTitle>Competition Admins</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-gray-200">
                {/* Owner - show if competition has owner_id */}
                {(competition as any)?.owner_id && (
                  <div className="py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">
                          Competition Owner
                        </span>
                        <p className="text-sm text-gray-500">
                          Has full control over this competition
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="default"
                      className="bg-blue-100 text-blue-800"
                    >
                      Owner
                    </Badge>
                  </div>
                )}

                {/* Admins */}
                {admins && admins.length > 0 ? (
                  admins.map((admin) => (
                    <div
                      key={admin.id}
                      className="py-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <Users className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">
                            {admin.email}
                          </span>
                          <p className="text-sm text-gray-500">{admin.role}</p>
                        </div>
                      </div>
                      {canManageAdmins && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveAdmin(admin.user_id)}
                          disabled={removeAdminMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-gray-500">
                    <p>No additional admins.</p>
                    {canManageAdmins && (
                      <p className="text-sm mt-1">
                        Add users to help manage this competition.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "settings" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Competition Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Name
                  </label>
                  <p className="text-gray-900">{competition.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Date
                  </label>
                  <p className="text-gray-900">{competition.date}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Venue Type
                  </label>
                  <p className="text-gray-900 capitalize">
                    {competition.venue_type}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">
                    Start Mode
                  </label>
                  <p className="text-gray-900 capitalize">
                    {competition.start_mode}
                  </p>
                </div>
                {competition.series_id && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Series
                    </label>
                    <p className="text-gray-900">
                      {competition.series_name || `Series #${competition.series_id}`}
                    </p>
                  </div>
                )}
                {competition.tour_id && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">
                      Tour
                    </label>
                    <p className="text-gray-900">Tour #{competition.tour_id}</p>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-4">
                To edit competition settings, use the Edit button in the
                competitions list.
              </p>
            </CardContent>
          </Card>
        </div>
      )}
      </div>
      {dialog}
    </>
  );
}

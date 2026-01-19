import { useState } from "react";
import {
  type Series,
  type SeriesAdmin,
  useSeriesAdmins,
  useAddSeriesAdmin,
  useRemoveSeriesAdmin,
} from "@/api/series";
import { useUsers } from "@/api/tours";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Shield, Trash2, Users } from "lucide-react";
import { useNotification, formatErrorMessage } from "@/hooks/useNotification";

interface SeriesAdminsTabProps {
  seriesId: number;
  series: Series;
}

export function SeriesAdminsTab({ seriesId, series }: SeriesAdminsTabProps) {
  const { user, isSuperAdmin } = useAuth();
  const { showError } = useNotification();

  const { data: admins } = useSeriesAdmins(seriesId);
  const addAdminMutation = useAddSeriesAdmin();
  const removeAdminMutation = useRemoveSeriesAdmin();
  const { data: users } = useUsers();

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Check if user can manage admins (owner or SUPER_ADMIN)
  const canManageAdmins = isSuperAdmin || series.owner_id === user?.id;

  // Filter users available to add as admin (not already admin and not owner)
  const availableUsers = users?.filter(
    (u) =>
      !admins?.some((admin: SeriesAdmin) => admin.user_id === u.id) &&
      u.id !== series.owner_id
  );

  const handleAddAdmin = async () => {
    setAdminError(null);
    if (!selectedUserId) {
      setAdminError("Please select a user");
      return;
    }

    try {
      await addAdminMutation.mutateAsync({ seriesId, userId: selectedUserId });
      setSelectedUserId(null);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "Failed to add admin");
    }
  };

  const handleRemoveAdmin = async (userId: number) => {
    if (confirm("Are you sure you want to remove this admin?")) {
      try {
        await removeAdminMutation.mutateAsync({ seriesId, userId });
      } catch (err) {
        showError(formatErrorMessage(err, "Failed to remove admin"));
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Admin Form - only visible to owners and SUPER_ADMIN */}
      {canManageAdmins && (
        <Card>
          <CardHeader>
            <CardTitle>Add Series Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1">
                <select
                  value={selectedUserId || ""}
                  onChange={(e) =>
                    setSelectedUserId(
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a user...</option>
                  {availableUsers?.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.email} ({u.role})
                    </option>
                  ))}
                </select>
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
              Series admins can manage competitions and documents for this
              series.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Admins List */}
      <Card>
        <CardHeader>
          <CardTitle>Series Admins</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-gray-200">
            {/* Owner */}
            {series.owner_id && (
              <div className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">
                      Series Owner
                    </span>
                    <p className="text-sm text-gray-500">
                      Has full control over this series
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
              admins.map((admin: SeriesAdmin) => (
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
                    Add users to help manage this series.
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

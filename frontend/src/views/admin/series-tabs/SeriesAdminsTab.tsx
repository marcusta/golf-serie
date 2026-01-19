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
        <div className="bg-white border border-soft-grey rounded-lg p-4">
          <div className="text-sm font-semibold uppercase tracking-wide text-charcoal mb-3">
            Add Series Admin
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-charcoal/70">
                User
              </label>
              <select
                value={selectedUserId || ""}
                onChange={(e) =>
                  setSelectedUserId(
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
                className="w-full h-9 mt-1 px-3 border border-soft-grey rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-turf focus:border-transparent"
              >
                <option value="">Select a user...</option>
                {availableUsers?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email} ({u.role})
                  </option>
                ))}
              </select>
              {adminError && (
                <p className="text-flag text-sm mt-1">{adminError}</p>
              )}
            </div>
            <Button
              onClick={handleAddAdmin}
              disabled={addAdminMutation.isPending || !selectedUserId}
              className="h-9 px-3 rounded-md text-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Admin
            </Button>
          </div>
          <p className="text-sm text-charcoal/60 mt-2">
            Series admins can manage competitions and documents for this series.
          </p>
        </div>
      )}

      {/* Admins List */}
      <div className="bg-white border border-soft-grey rounded-lg overflow-hidden">
        <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal/70 border-b border-soft-grey bg-soft-grey/30">
          Series Admins
        </div>
        <div className="divide-y divide-soft-grey">
          {series.owner_id && (
            <div className="grid grid-cols-[minmax(200px,2fr)_160px_120px] gap-4 px-4 py-2 text-sm items-center">
              <div className="flex items-center gap-2 text-charcoal">
                <Shield className="h-4 w-4 text-turf" />
                <div>
                  <div className="font-medium">Series Owner</div>
                  <div className="text-xs text-charcoal/60">Full control</div>
                </div>
              </div>
              <div className="text-xs font-semibold uppercase tracking-wide text-charcoal/60">
                Owner
              </div>
              <div />
            </div>
          )}

          {admins && admins.length > 0 ? (
            admins.map((admin: SeriesAdmin) => (
              <div
                key={admin.id}
                className="grid grid-cols-[minmax(200px,2fr)_160px_120px] gap-4 px-4 py-2 text-sm items-center"
              >
                <div className="flex items-center gap-2 text-charcoal">
                  <Users className="h-4 w-4 text-charcoal/60" />
                  <div>
                    <div className="font-medium">{admin.email}</div>
                    <div className="text-xs text-charcoal/60">{admin.role}</div>
                  </div>
                </div>
                <div className="text-xs font-semibold uppercase tracking-wide text-charcoal/60">
                  Admin
                </div>
                <div className="flex justify-end">
                  {canManageAdmins && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAdmin(admin.user_id)}
                      disabled={removeAdminMutation.isPending}
                      className="h-8 w-8 p-0 rounded-md text-flag hover:text-flag hover:bg-flag/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-sm text-charcoal/60">
              <p>No additional admins.</p>
              {canManageAdmins && (
                <p className="text-xs mt-1">
                  Add users to help manage this series.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import {
  Loader2,
  Plus,
  Users,
  Shield,
  Trash2,
} from "lucide-react";
import {
  useTourAdmins,
  useAddTourAdmin,
  useRemoveTourAdmin,
  useUsers,
  type Tour,
} from "../../../api/tours";
import { useNotification, formatErrorMessage } from "@/hooks/useNotification";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TourAdminsTabProps {
  tourId: number;
  tour: Tour;
}

export function TourAdminsTab({ tourId, tour }: TourAdminsTabProps) {
  const { showError } = useNotification();
  const { confirm, dialog } = useConfirmDialog();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  const { data: admins, isLoading: adminsLoading } = useTourAdmins(tourId);
  const { data: users } = useUsers();

  const addAdminMutation = useAddTourAdmin();
  const removeAdminMutation = useRemoveTourAdmin();

  // Get available users (not already admins)
  const availableUsers = users?.filter(
    (user) => !admins?.some((admin) => admin.user_id === user.id) && user.id !== tour.owner_id
  );

  const handleAddAdmin = async () => {
    setAdminError(null);
    if (!selectedUserId) {
      setAdminError("Please select a user");
      return;
    }

    try {
      await addAdminMutation.mutateAsync({ tourId, userId: selectedUserId });
      setSelectedUserId(null);
    } catch (err) {
      setAdminError(err instanceof Error ? err.message : "Failed to add admin");
    }
  };

  const handleRemoveAdmin = async (userId: number) => {
    const shouldRemove = await confirm({
      title: "Remove admin?",
      description: "This user will lose admin access to this tour.",
      confirmLabel: "Remove admin",
      variant: "destructive",
    });
    if (!shouldRemove) return;
    try {
      await removeAdminMutation.mutateAsync({ tourId, userId });
    } catch (err) {
      showError(formatErrorMessage(err, "Failed to remove admin"));
    }
  };

  return (
    <>
      <div className="space-y-6">
      {/* Add Admin Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-charcoal mb-4">Add Tour Admin</h3>
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
                {availableUsers?.map((user) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.email} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {adminError && (
              <p className="text-coral text-sm mt-1">{adminError}</p>
            )}
          </div>
          <button
            onClick={handleAddAdmin}
            disabled={addAdminMutation.isPending || !selectedUserId}
            className="flex items-center gap-2 px-4 py-2.5 bg-turf text-white rounded-xl hover:bg-fairway transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add Admin
          </button>
        </div>
        <p className="text-sm text-charcoal/50 mt-2">
          Tour admins can manage enrollments and competitions for this tour.
        </p>
      </div>

      {/* Admins List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-charcoal mb-4">Tour Admins</h3>

        {adminsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-fairway" />
          </div>
        ) : (
          <div className="divide-y divide-soft-grey">
            {/* Owner */}
            <div className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-turf/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-turf" />
                </div>
                <div>
                  <span className="font-medium text-charcoal">Tour Owner</span>
                  <p className="text-sm text-charcoal/60">Has full control over this tour</p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-turf/20 text-turf text-xs rounded-full font-medium">
                Owner
              </span>
            </div>

            {/* Admins */}
            {admins && admins.length > 0 ? (
              admins.map((admin) => (
                <div
                  key={admin.id}
                  className="py-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-fairway/20 flex items-center justify-center">
                      <Users className="w-5 h-5 text-fairway" />
                    </div>
                    <div>
                      <span className="font-medium text-charcoal">{admin.email}</span>
                      <p className="text-sm text-charcoal/60">{admin.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveAdmin(admin.user_id)}
                    disabled={removeAdminMutation.isPending}
                    className="p-2 text-charcoal/60 hover:text-coral transition-colors"
                    title="Remove admin"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-charcoal/60">
                <p>No additional admins.</p>
                <p className="text-sm mt-1">Add users to help manage this tour.</p>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
      {dialog}
    </>
  );
}

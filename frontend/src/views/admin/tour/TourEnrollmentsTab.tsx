import { useState } from "react";
import {
  Loader2,
  Plus,
  Users,
  Check,
  X,
  Copy,
  Mail,
  UserPlus,
} from "lucide-react";
import {
  useTourEnrollments,
  useAddEnrollment,
  useApproveEnrollment,
  useRemoveEnrollment,
  useTourCategories,
  useAssignEnrollmentCategory,
  type TourEnrollment,
  type TourEnrollmentStatus,
} from "../../../api/tours";
import { useNotification, formatErrorMessage } from "@/hooks/useNotification";

interface TourEnrollmentsTabProps {
  tourId: number;
}

export function TourEnrollmentsTab({ tourId }: TourEnrollmentsTabProps) {
  const { showError } = useNotification();
  const [statusFilter, setStatusFilter] = useState<TourEnrollmentStatus | "all">("all");
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const { data: enrollments, isLoading: enrollmentsLoading } = useTourEnrollments(
    tourId,
    statusFilter === "all" ? undefined : statusFilter
  );
  const { data: categories } = useTourCategories(tourId);

  const addEnrollmentMutation = useAddEnrollment();
  const approveEnrollmentMutation = useApproveEnrollment();
  const removeEnrollmentMutation = useRemoveEnrollment();
  const assignEnrollmentCategoryMutation = useAssignEnrollmentCategory();

  const handleAddEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);

    if (!newEmail.trim()) {
      setEmailError("Email is required");
      return;
    }

    try {
      await addEnrollmentMutation.mutateAsync({ tourId, email: newEmail.trim() });
      setNewEmail("");
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Failed to add enrollment");
    }
  };

  const handleApprove = async (enrollmentId: number) => {
    try {
      await approveEnrollmentMutation.mutateAsync({ tourId, enrollmentId });
    } catch (err) {
      showError(formatErrorMessage(err, "Failed to approve"));
    }
  };

  const handleRemove = async (enrollmentId: number) => {
    if (confirm("Are you sure you want to remove this enrollment?")) {
      try {
        await removeEnrollmentMutation.mutateAsync({ tourId, enrollmentId });
      } catch (err) {
        showError(formatErrorMessage(err, "Failed to remove"));
      }
    }
  };

  const copyRegistrationLink = async (email: string) => {
    const baseUrl = window.location.origin;
    const registrationUrl = `${baseUrl}/register?email=${encodeURIComponent(email)}`;
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setCopiedEmail(email);
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch {
      showError("Failed to copy to clipboard");
    }
  };

  const handleAssignCategory = async (enrollmentId: number, categoryId: number | null) => {
    try {
      await assignEnrollmentCategoryMutation.mutateAsync({
        tourId,
        enrollmentId,
        categoryId,
      });
    } catch (err) {
      showError(formatErrorMessage(err, "Failed to assign category"));
    }
  };

  const getStatusBadge = (status: TourEnrollmentStatus) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-fairway/20 text-fairway">
            <Check className="h-3 w-3" />
            Active
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Mail className="h-3 w-3" />
            Pending
          </span>
        );
      case "requested":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-turf/20 text-turf">
            <UserPlus className="h-3 w-3" />
            Requested
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Enrollment Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-charcoal mb-4">Add Player by Email</h3>
        <form onSubmit={handleAddEnrollment} className="flex gap-3">
          <div className="flex-1">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="player@example.com"
              className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors"
            />
            {emailError && (
              <p className="text-coral text-sm mt-1">{emailError}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={addEnrollmentMutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 bg-turf text-white rounded-xl hover:bg-fairway transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </form>
        <p className="text-sm text-charcoal/50 mt-2">
          Add an email address to invite a player. They'll receive a pending enrollment
          until they register.
        </p>
      </div>

      {/* Enrollments List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-charcoal">Enrollments</h3>
          <div className="flex gap-2">
            {(["all", "pending", "requested", "active"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  statusFilter === status
                    ? "bg-turf text-white"
                    : "bg-rough/30 text-charcoal hover:bg-rough/50"
                }`}
              >
                {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {enrollmentsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-fairway" />
          </div>
        ) : enrollments && enrollments.length > 0 ? (
          <div className="divide-y divide-soft-grey">
            {enrollments.map((enrollment: TourEnrollment) => (
              <div
                key={enrollment.id}
                className="py-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-charcoal">
                        {enrollment.player_name || enrollment.email}
                      </span>
                      {getStatusBadge(enrollment.status)}
                    </div>
                    {enrollment.player_name && (
                      <p className="text-sm text-charcoal/60">{enrollment.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Category selector */}
                  {categories && categories.length > 0 && (
                    <select
                      value={enrollment.category_id || ""}
                      onChange={(e) => handleAssignCategory(
                        enrollment.id,
                        e.target.value ? parseInt(e.target.value) : null
                      )}
                      disabled={assignEnrollmentCategoryMutation.isPending}
                      className="px-2 py-1 text-sm border border-soft-grey rounded-lg focus:border-turf focus:outline-none bg-white"
                      title="Assign category"
                    >
                      <option value="">No category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {enrollment.status === "pending" && (
                    <button
                      onClick={() => copyRegistrationLink(enrollment.email)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        copiedEmail === enrollment.email
                          ? "bg-fairway/20 text-fairway"
                          : "bg-rough/30 text-charcoal hover:bg-rough/50"
                      }`}
                      title="Copy registration link"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedEmail === enrollment.email ? "Copied!" : "Copy Link"}
                    </button>
                  )}
                  {enrollment.status === "requested" && (
                    <button
                      onClick={() => handleApprove(enrollment.id)}
                      disabled={approveEnrollmentMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 bg-fairway text-white rounded-lg text-sm hover:bg-turf transition-colors disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(enrollment.id)}
                    disabled={removeEnrollmentMutation.isPending}
                    className="p-1.5 text-charcoal/60 hover:text-coral transition-colors"
                    title="Remove enrollment"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-charcoal/60">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No enrollments found.</p>
            <p className="text-sm mt-1">Add players by email to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}

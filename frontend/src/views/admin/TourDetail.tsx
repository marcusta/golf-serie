import { useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  useTour,
  useTourCompetitions,
  useTourEnrollments,
  useAddEnrollment,
  useApproveEnrollment,
  useRemoveEnrollment,
  useTourAdmins,
  useAddTourAdmin,
  useRemoveTourAdmin,
  useUsers,
  type TourEnrollment,
  type TourEnrollmentStatus,
} from "../../api/tours";
import {
  Loader2,
  ArrowLeft,
  Plus,
  Calendar,
  Users,
  Shield,
  Trophy,
  Check,
  X,
  Copy,
  Mail,
  Trash2,
  UserPlus,
  Globe,
  Lock,
} from "lucide-react";

type TabType = "competitions" | "enrollments" | "admins";

export default function TourDetail() {
  const { id } = useParams({ from: "/admin/tours/$id" });
  const navigate = useNavigate();
  const tourId = parseInt(id);

  const [activeTab, setActiveTab] = useState<TabType>("competitions");
  const [statusFilter, setStatusFilter] = useState<TourEnrollmentStatus | "all">("all");
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  const { data: tour, isLoading: tourLoading } = useTour(tourId);
  const { data: competitions, isLoading: competitionsLoading } = useTourCompetitions(tourId);
  const { data: enrollments, isLoading: enrollmentsLoading } = useTourEnrollments(
    tourId,
    statusFilter === "all" ? undefined : statusFilter
  );
  const { data: admins, isLoading: adminsLoading } = useTourAdmins(tourId);
  const { data: users } = useUsers();

  const addEnrollmentMutation = useAddEnrollment();
  const approveEnrollmentMutation = useApproveEnrollment();
  const removeEnrollmentMutation = useRemoveEnrollment();
  const addAdminMutation = useAddTourAdmin();
  const removeAdminMutation = useRemoveTourAdmin();

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
      alert(err instanceof Error ? err.message : "Failed to approve");
    }
  };

  const handleRemove = async (enrollmentId: number) => {
    if (confirm("Are you sure you want to remove this enrollment?")) {
      try {
        await removeEnrollmentMutation.mutateAsync({ tourId, enrollmentId });
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to remove");
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
      alert("Failed to copy to clipboard");
    }
  };

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
    if (confirm("Are you sure you want to remove this admin?")) {
      try {
        await removeAdminMutation.mutateAsync({ tourId, userId });
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to remove admin");
      }
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

  // Get available users (not already admins)
  const availableUsers = users?.filter(
    (user) => !admins?.some((admin) => admin.user_id === user.id) && user.id !== tour?.owner_id
  );

  if (tourLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-fairway" />
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-red-600">Tour not found</h1>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate({ to: "/admin/tours" })}
          className="flex items-center gap-2 text-fairway hover:text-turf mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tours
        </button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-charcoal">{tour.name}</h1>
              <div className="flex gap-1">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    tour.visibility === "public"
                      ? "bg-fairway/20 text-fairway"
                      : "bg-charcoal/10 text-charcoal/70"
                  }`}
                >
                  {tour.visibility === "public" ? (
                    <Globe className="h-3 w-3" />
                  ) : (
                    <Lock className="h-3 w-3" />
                  )}
                  {tour.visibility}
                </span>
              </div>
            </div>
            {tour.description && <p className="text-charcoal/70">{tour.description}</p>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-rough mb-6">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("competitions")}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
              activeTab === "competitions"
                ? "border-turf text-turf"
                : "border-transparent text-charcoal/60 hover:text-charcoal"
            }`}
          >
            <Trophy className="w-4 h-4" />
            Competitions
          </button>
          <button
            onClick={() => setActiveTab("enrollments")}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
              activeTab === "enrollments"
                ? "border-turf text-turf"
                : "border-transparent text-charcoal/60 hover:text-charcoal"
            }`}
          >
            <Users className="w-4 h-4" />
            Enrollments
            {enrollments && enrollments.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-charcoal/10 rounded-full">
                {enrollments.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("admins")}
            className={`flex items-center gap-2 pb-3 px-1 border-b-2 transition-colors ${
              activeTab === "admins"
                ? "border-turf text-turf"
                : "border-transparent text-charcoal/60 hover:text-charcoal"
            }`}
          >
            <Shield className="w-4 h-4" />
            Admins
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "competitions" && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-charcoal">Competitions</h2>
            <button
              onClick={() => {
                navigate({ to: `/admin/competitions`, search: { tour: tourId.toString() } });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-fairway text-white rounded-lg hover:bg-turf transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Competition
            </button>
          </div>

          {competitionsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-fairway" />
            </div>
          ) : competitions && competitions.length > 0 ? (
            <div className="space-y-3">
              {competitions.map((competition) => (
                <div
                  key={competition.id}
                  className="border border-soft-grey rounded-lg p-4 hover:bg-light-rough/30 transition-colors cursor-pointer"
                  onClick={() => navigate({ to: `/admin/competitions/${competition.id}/tee-times` })}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-charcoal">{competition.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-charcoal/60 mt-1">
                        <Calendar className="w-4 h-4" />
                        {competition.date}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-charcoal/60">
              <p>No competitions yet.</p>
              <p className="text-sm mt-2">Click "Add Competition" to create one.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "enrollments" && (
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
                    <div className="flex items-center gap-2">
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
      )}

      {activeTab === "admins" && (
        <div className="space-y-6">
          {/* Add Admin Form */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-charcoal mb-4">Add Tour Admin</h3>
            <div className="flex gap-3">
              <div className="flex-1">
                <select
                  value={selectedUserId || ""}
                  onChange={(e) => setSelectedUserId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-4 py-2.5 border-2 border-soft-grey rounded-xl focus:border-turf focus:outline-none transition-colors bg-white"
                >
                  <option value="">Select a user...</option>
                  {availableUsers?.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email} ({user.role})
                    </option>
                  ))}
                </select>
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
      )}
    </div>
  );
}

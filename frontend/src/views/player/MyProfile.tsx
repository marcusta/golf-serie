import { useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import {
  useMyProfile,
  useUpdateMyProfile,
  useRecordHandicap,
  useMyRounds,
  useMyToursAndSeries,
  type UpdateProfileDto,
} from "@/api/player-profile";
import { useUpdateEmail, useUpdatePassword } from "@/api/auth";
import { useCourses } from "@/api/courses";
import { useAuth } from "@/hooks/useAuth";
import {
  AlertCircle,
  Loader2,
  RefreshCw,
  User,
  Edit2,
  Save,
  X,
  Target,
  MapPin,
  Eye,
  EyeOff,
  Users,
  Plus,
  LogIn,
  Settings,
  Mail,
  Key,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlayerPageLayout } from "@/components/layout/PlayerPageLayout";
import { ProfileRecentRounds, ProfileTours, ProfileSeries } from "@/components/profile";

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-scorecard animate-pulse">
      <div className="bg-turf h-16" />
      <div className="h-[200px] bg-gradient-to-b from-turf to-fairway" />
      <div className="container mx-auto px-4 -mt-16">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gray-300 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-gray-300 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-1/3" />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="min-h-screen bg-scorecard flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <div className="w-16 h-16 bg-flag/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="h-8 w-8 text-flag" />
        </div>
        <h1 className="text-display-md font-display font-bold text-charcoal mb-4">
          {title}
        </h1>
        <p className="text-body-lg text-charcoal/70 mb-8">{message}</p>
        {onRetry && (
          <Button
            onClick={onRetry}
            className="bg-turf hover:bg-fairway text-scorecard"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}

function NotLoggedIn() {
  return (
    <PlayerPageLayout title="My Profile">
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-turf/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="h-8 w-8 text-turf" />
          </div>
          <h1 className="text-display-md font-display font-bold text-charcoal mb-4">
            Sign in to view your profile
          </h1>
          <p className="text-body-lg text-charcoal/70 mb-8">
            Create an account or sign in to track your handicap, view your
            rounds, and manage your golf profile.
          </p>
          <Link to="/player">
            <Button className="bg-turf hover:bg-fairway text-scorecard">
              <LogIn className="h-4 w-4 mr-2" />
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </PlayerPageLayout>
  );
}

function NoPlayerProfile() {
  return (
    <PlayerPageLayout title="My Profile">
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-turf/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <User className="h-8 w-8 text-turf" />
          </div>
          <h1 className="text-display-md font-display font-bold text-charcoal mb-4">
            No Player Profile
          </h1>
          <p className="text-body-lg text-charcoal/70 mb-8">
            You don't have a player profile yet. Join a tour or create a profile
            to get started.
          </p>
        </div>
      </div>
    </PlayerPageLayout>
  );
}

// Visibility icon helper
function VisibilityIcon({ visibility }: { visibility: string }) {
  switch (visibility) {
    case "public":
      return <Eye className="h-4 w-4" />;
    case "friends":
      return <Users className="h-4 w-4" />;
    case "private":
      return <EyeOff className="h-4 w-4" />;
    default:
      return <Eye className="h-4 w-4" />;
  }
}

export default function MyProfile() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading, error, refetch } = useMyProfile();
  const { data: courses } = useCourses();
  const { data: rounds } = useMyRounds(5);
  const { data: toursAndSeries } = useMyToursAndSeries();
  const updateProfile = useUpdateMyProfile();
  const recordHandicap = useRecordHandicap();
  const updateEmail = useUpdateEmail();
  const updatePassword = useUpdatePassword();

  const [isEditing, setIsEditing] = useState(false);
  const [showHandicapForm, setShowHandicapForm] = useState(false);
  const [editForm, setEditForm] = useState<UpdateProfileDto>({});
  const [handicapInput, setHandicapInput] = useState("");
  const [handicapNotes, setHandicapNotes] = useState("");

  // Account settings state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Handle starting edit mode
  const handleStartEdit = useCallback(() => {
    if (profile) {
      setEditForm({
        display_name: profile.display_name || "",
        bio: profile.bio || "",
        home_course_id: profile.home_course_id || null,
        visibility: profile.visibility,
        gender: profile.gender,
      });
      setIsEditing(true);
    }
  }, [profile]);

  // Handle save profile
  const handleSaveProfile = useCallback(async () => {
    try {
      await updateProfile.mutateAsync(editForm);
      setIsEditing(false);
    } catch (err) {
      // Error handling via mutation
    }
  }, [editForm, updateProfile]);

  // Handle record handicap
  const handleRecordHandicap = useCallback(async () => {
    const handicapValue = parseFloat(handicapInput);
    if (isNaN(handicapValue)) return;

    try {
      await recordHandicap.mutateAsync({
        handicap_index: handicapValue,
        notes: handicapNotes || undefined,
      });
      setShowHandicapForm(false);
      setHandicapInput("");
      setHandicapNotes("");
    } catch (err) {
      // Error handling via mutation
    }
  }, [handicapInput, handicapNotes, recordHandicap]);

  // Handle update email
  const handleUpdateEmail = useCallback(async () => {
    if (!newEmail || !emailPassword) return;

    try {
      await updateEmail.mutateAsync({
        newEmail,
        currentPassword: emailPassword,
      });
      setShowEmailForm(false);
      setNewEmail("");
      setEmailPassword("");
      setEmailSuccess(true);
      setTimeout(() => setEmailSuccess(false), 3000);
    } catch (err) {
      // Error handling via mutation
    }
  }, [newEmail, emailPassword, updateEmail]);

  // Handle update password
  const handleUpdatePassword = useCallback(async () => {
    if (!currentPassword || !newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) return;

    try {
      await updatePassword.mutateAsync({
        currentPassword,
        newPassword,
      });
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordSuccess(true);
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err) {
      // Error handling via mutation
    }
  }, [currentPassword, newPassword, confirmPassword, updatePassword]);

  // Loading states
  if (authLoading) {
    return <LoadingSkeleton />;
  }

  if (!user) {
    return <NotLoggedIn />;
  }

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to load profile";

    // Check if it's a "no player profile" error
    if (errorMessage.includes("No player profile")) {
      return <NoPlayerProfile />;
    }

    return (
      <ErrorState
        title="Error Loading Profile"
        message={errorMessage}
        onRetry={() => refetch()}
      />
    );
  }

  if (!profile) {
    return <NoPlayerProfile />;
  }

  return (
    <PlayerPageLayout title="My Profile">
      {/* Hero section with image */}
      <div className="relative h-[200px] md:h-[220px] overflow-hidden z-0">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('/splash-images/golf-from-sky.jpg')`,
          }}
        />
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-charcoal/70 via-charcoal/50 to-charcoal/80 opacity-40" />
      </div>

      {/* Profile card - overlaps hero */}
      <div className="container mx-auto px-4 -mt-20 relative z-10">
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.name}
                className="w-14 h-14 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 bg-turf/10 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold text-turf">
                  {(profile.display_name || profile.name).charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Name and handicap */}
            <div className="flex-1 min-w-0">
              <h1 className="text-display-md font-display font-bold text-charcoal truncate">
                {profile.display_name || profile.name}
              </h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-charcoal/70">
                <span className="font-medium text-turf">
                  HCP {profile.handicap.toFixed(1)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <VisibilityIcon visibility={profile.visibility} />
                  {profile.visibility}
                </span>
              </div>
              {profile.home_course_name && (
                <p className="flex items-center gap-1 text-charcoal/70 text-sm mt-2">
                  <MapPin className="h-4 w-4 text-turf" />
                  {profile.home_course_name}
                </p>
              )}
            </div>

            {/* Edit button */}
            {!isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStartEdit}
                className="flex-shrink-0"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Bio */}
          {profile.bio && !isEditing && (
            <p className="text-charcoal/70 mt-4">{profile.bio}</p>
          )}

          {/* Edit form */}
          {isEditing && (
            <div className="mt-4 space-y-4 border-t pt-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  Display Name
                </label>
                <Input
                  value={editForm.display_name || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, display_name: e.target.value })
                  }
                  placeholder={profile.name}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  Bio
                </label>
                <Textarea
                  value={editForm.bio || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, bio: e.target.value })
                  }
                  placeholder="Tell us about yourself..."
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  Home Course
                </label>
                <Select
                  value={editForm.home_course_id?.toString()}
                  onValueChange={(value) =>
                    setEditForm({
                      ...editForm,
                      home_course_id: value ? parseInt(value) : null,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No home course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses?.map((course) => (
                      <SelectItem key={course.id} value={course.id.toString()}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  Gender
                </label>
                <Select
                  value={editForm.gender}
                  onValueChange={(value) =>
                    setEditForm({
                      ...editForm,
                      gender: value as "male" | "female" | undefined,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Not specified" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-charcoal/60 mt-1">
                  Required for accurate play handicap calculation
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  Profile Visibility
                </label>
                <div className="flex gap-2">
                  {(["public", "friends", "private"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setEditForm({ ...editForm, visibility: v })}
                      className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        editForm.visibility === v
                          ? "bg-turf text-white border-turf"
                          : "bg-white text-charcoal border-gray-200 hover:border-turf"
                      }`}
                    >
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSaveProfile}
                  disabled={updateProfile.isPending}
                  className="bg-turf hover:bg-fairway text-white"
                >
                  {updateProfile.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                  disabled={updateProfile.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Stats - Circular Tiles */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-4 md:gap-8">
            {/* Total Rounds Circle */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-charcoal to-charcoal/80 shadow-lg flex flex-col items-center justify-center">
                <div className="text-2xl md:text-3xl font-bold text-scorecard">
                  {profile.total_rounds}
                </div>
              </div>
              <div className="text-label-sm text-charcoal/70 mt-2">Rounds</div>
            </div>

            {/* Competitions Circle */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-coral to-coral/80 shadow-lg flex flex-col items-center justify-center">
                <div className="text-2xl md:text-3xl font-bold text-scorecard">
                  {profile.competitions_played}
                </div>
              </div>
              <div className="text-label-sm text-charcoal/70 mt-2">Comps</div>
            </div>

            {/* Best Score Circle */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-sky to-sky/80 shadow-lg flex flex-col items-center justify-center">
                <div className="text-2xl md:text-3xl font-bold text-scorecard">
                  {profile.best_score || "–"}
                </div>
              </div>
              <div className="text-label-sm text-charcoal/70 mt-2">Best</div>
            </div>

            {/* Average Score Circle */}
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-turf to-turf/80 shadow-lg flex flex-col items-center justify-center">
                <div className="text-2xl md:text-3xl font-bold text-scorecard">
                  {profile.average_score?.toFixed(1) || "–"}
                </div>
              </div>
              <div className="text-label-sm text-charcoal/70 mt-2">Avg</div>
            </div>
          </div>
        </div>

        {/* Handicap section */}
        <div className="bg-white rounded-xl border-l-2 border-turf mb-6">
          <div className="flex items-center justify-between px-4 pt-4">
            <h2 className="text-lg font-display font-bold text-charcoal flex items-center gap-2">
              <Target className="h-5 w-5 text-turf" />
              Handicap Index
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHandicapForm(!showHandicapForm)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Update
            </Button>
          </div>

          {/* Handicap form */}
          {showHandicapForm && (
            <div className="bg-gray-50 rounded-lg p-4 mx-4 mt-4">
              <div className="grid gap-3">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">
                    New Handicap Index
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={handicapInput}
                    onChange={(e) => setHandicapInput(e.target.value)}
                    placeholder="e.g., 15.4"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">
                    Notes (optional)
                  </label>
                  <Input
                    value={handicapNotes}
                    onChange={(e) => setHandicapNotes(e.target.value)}
                    placeholder="e.g., Updated from Golf Canada"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleRecordHandicap}
                    disabled={!handicapInput || recordHandicap.isPending}
                    className="bg-turf hover:bg-fairway text-white"
                  >
                    {recordHandicap.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowHandicapForm(false);
                      setHandicapInput("");
                      setHandicapNotes("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Current handicap */}
          <div className="text-center py-4 mx-4 border-b border-soft-grey">
            <div className="text-4xl font-bold text-turf">
              {profile.handicap.toFixed(1)}
            </div>
            <div className="text-sm text-charcoal/60">Current Index</div>
          </div>

          {/* Handicap history */}
          {profile.handicap_history && profile.handicap_history.length > 0 && (
            <div className="px-4 py-4">
              <h3 className="text-sm font-medium text-charcoal/60 mb-2">
                Recent History
              </h3>
              <div className="divide-y divide-soft-grey">
                {profile.handicap_history.slice(0, 5).map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between text-sm py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {entry.handicap_index.toFixed(1)}
                      </span>
                      {entry.notes && (
                        <span className="text-charcoal/50 truncate max-w-[150px]">
                          {entry.notes}
                        </span>
                      )}
                    </div>
                    <span className="text-charcoal/50">
                      {new Date(entry.effective_date).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Rounds */}
        <ProfileRecentRounds rounds={rounds} />

        {/* My Tours */}
        <ProfileTours tours={toursAndSeries?.tours} />

        {/* My Series */}
        <ProfileSeries series={toursAndSeries?.series} />

        {/* Account Settings */}
        <div className="bg-white rounded-xl border-l-2 border-turf mb-6">
          <div className="flex items-center gap-2 px-4 pt-4 pb-2">
            <Settings className="h-5 w-5 text-turf" />
            <h2 className="text-lg font-display font-bold text-charcoal">
              Account Settings
            </h2>
          </div>

          <div className="divide-y divide-soft-grey">
            {/* Email section */}
            <div className="px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-charcoal/60" />
                  <div>
                    <div className="text-sm font-medium text-charcoal">Email</div>
                    <div className="text-sm text-charcoal/60">{user?.email}</div>
                  </div>
                </div>
                {emailSuccess ? (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <Check className="h-4 w-4" />
                    Updated
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEmailForm(!showEmailForm)}
                  >
                    Change
                  </Button>
                )}
              </div>

              {showEmailForm && (
                <div className="mt-4 space-y-3 bg-gray-50 rounded-lg p-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1">
                      New Email
                    </label>
                    <Input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Enter new email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1">
                      Current Password
                    </label>
                    <Input
                      type="password"
                      value={emailPassword}
                      onChange={(e) => setEmailPassword(e.target.value)}
                      placeholder="Confirm with your password"
                    />
                  </div>
                  {updateEmail.error && (
                    <p className="text-sm text-red-600">
                      {updateEmail.error instanceof Error
                        ? updateEmail.error.message
                        : "Failed to update email"}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleUpdateEmail}
                      disabled={!newEmail || !emailPassword || updateEmail.isPending}
                      className="bg-turf hover:bg-fairway text-white"
                    >
                      {updateEmail.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Update Email
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowEmailForm(false);
                        setNewEmail("");
                        setEmailPassword("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Password section */}
            <div className="px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Key className="h-4 w-4 text-charcoal/60" />
                  <div>
                    <div className="text-sm font-medium text-charcoal">Password</div>
                    <div className="text-sm text-charcoal/60">••••••••</div>
                  </div>
                </div>
                {passwordSuccess ? (
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <Check className="h-4 w-4" />
                    Updated
                  </span>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPasswordForm(!showPasswordForm)}
                  >
                    Change
                  </Button>
                )}
              </div>

              {showPasswordForm && (
                <div className="mt-4 space-y-3 bg-gray-50 rounded-lg p-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1">
                      Current Password
                    </label>
                    <Input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1">
                      New Password
                    </label>
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password (min 6 characters)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal mb-1">
                      Confirm New Password
                    </label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                  {newPassword && confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-sm text-red-600">Passwords do not match</p>
                  )}
                  {updatePassword.error && (
                    <p className="text-sm text-red-600">
                      {updatePassword.error instanceof Error
                        ? updatePassword.error.message
                        : "Failed to update password"}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleUpdatePassword}
                      disabled={
                        !currentPassword ||
                        !newPassword ||
                        !confirmPassword ||
                        newPassword !== confirmPassword ||
                        updatePassword.isPending
                      }
                      className="bg-turf hover:bg-fairway text-white"
                    >
                      {updatePassword.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Update Password
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowPasswordForm(false);
                        setCurrentPassword("");
                        setNewPassword("");
                        setConfirmPassword("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PlayerPageLayout>
  );
}

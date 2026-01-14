import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  useAdminGetUserPlayerProfile,
  useAdminUpdatePlayerProfile,
} from "@/api/users";
import { useClubs } from "@/api/clubs";

interface EditPlayerProfileDialogProps {
  userId: number | null;
  userEmail: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditPlayerProfileDialog({
  userId,
  userEmail,
  open,
  onOpenChange,
}: EditPlayerProfileDialogProps) {
  const [handicapValue, setHandicapValue] = useState("");
  const [genderValue, setGenderValue] = useState<"male" | "female" | "">("");
  const [homeClubId, setHomeClubId] = useState<string>("none");

  const {
    data: playerProfile,
    isLoading: isLoadingProfile,
    error: profileError,
  } = useAdminGetUserPlayerProfile(open ? userId : null);

  const { data: clubs, isLoading: isLoadingClubs } = useClubs();
  const updateProfileMutation = useAdminUpdatePlayerProfile();

  // Reset form when dialog opens with profile data
  useEffect(() => {
    if (open && playerProfile) {
      setHandicapValue(
        playerProfile.handicap !== null ? playerProfile.handicap.toString() : ""
      );
      setGenderValue(playerProfile.gender || "");
      setHomeClubId(
        playerProfile.home_club_id != null
          ? playerProfile.home_club_id.toString()
          : "none"
      );
    } else if (open && !playerProfile && !isLoadingProfile) {
      // No profile - reset to defaults
      setHandicapValue("");
      setGenderValue("");
      setHomeClubId("none");
    }
  }, [open, playerProfile, isLoadingProfile]);

  const handleSave = async () => {
    if (!userId) return;

    // Validate handicap
    let parsedHandicap: number | null = null;
    if (handicapValue.trim() !== "") {
      parsedHandicap = parseFloat(handicapValue);
      if (isNaN(parsedHandicap)) {
        toast.error("Please enter a valid handicap number");
        return;
      }
      if (parsedHandicap < -10 || parsedHandicap > 54) {
        toast.error("Handicap must be between -10 and 54");
        return;
      }
    }

    try {
      await updateProfileMutation.mutateAsync({
        userId,
        data: {
          handicap: parsedHandicap,
          gender: genderValue || undefined,
          home_club_id: homeClubId && homeClubId !== "none" ? parseInt(homeClubId, 10) : null,
        },
      });
      toast.success("Player profile updated successfully");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update player profile:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update player profile"
      );
    }
  };

  const isLoading = isLoadingProfile || isLoadingClubs;
  const hasNoProfile = !isLoadingProfile && !playerProfile && !profileError;
  const isCreatingNew = hasNoProfile;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Player Profile</DialogTitle>
          <DialogDescription>
            Update the player profile for {userEmail}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : profileError ? (
          <div className="py-8 text-center">
            <p className="text-flag font-medium">Error loading profile</p>
            <p className="text-sm text-charcoal/50 mt-1">
              Please try again later.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* New profile notice */}
            {isCreatingNew && (
              <div className="bg-turf/10 border border-turf/20 rounded-md p-3">
                <p className="text-sm text-charcoal/80">
                  This user doesn't have a player profile yet. A new profile will be created when you save.
                </p>
              </div>
            )}

            {/* Player Name (read-only) */}
            {playerProfile && (
              <div>
                <label className="block text-sm font-medium text-charcoal/70 mb-1">
                  Player Name
                </label>
                <p className="text-charcoal font-medium">
                  {playerProfile.display_name || playerProfile.name}
                </p>
              </div>
            )}

            {/* Handicap Input */}
            <div>
              <label
                htmlFor="handicap"
                className="block text-sm font-medium text-charcoal/70 mb-1"
              >
                Handicap Index
              </label>
              <Input
                id="handicap"
                type="number"
                step="0.1"
                min="-10"
                max="54"
                placeholder="e.g., 12.4"
                value={handicapValue}
                onChange={(e) => setHandicapValue(e.target.value)}
              />
              <p className="mt-1 text-xs text-charcoal/50">
                World Handicap System range: -10 to +54. Leave empty for no handicap.
              </p>
            </div>

            {/* Gender Select */}
            <div>
              <label
                htmlFor="gender"
                className="block text-sm font-medium text-charcoal/70 mb-1"
              >
                Gender
              </label>
              <Select
                value={genderValue}
                onValueChange={(value: "male" | "female" | "") =>
                  setGenderValue(value)
                }
              >
                <SelectTrigger id="gender">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Home Club Select */}
            <div>
              <label
                htmlFor="home-club"
                className="block text-sm font-medium text-charcoal/70 mb-1"
              >
                Home Club
              </label>
              <Select value={homeClubId} onValueChange={setHomeClubId}>
                <SelectTrigger id="home-club">
                  <SelectValue placeholder="Select home club" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No club</SelectItem>
                  {clubs?.map((club) => (
                    <SelectItem key={club.id} value={club.id.toString()}>
                      {club.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateProfileMutation.isPending}
          >
            Cancel
          </Button>
          {!profileError && !isLoading && (
            <Button
              onClick={handleSave}
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending
                ? "Saving..."
                : isCreatingNew
                  ? "Create Profile"
                  : "Save"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

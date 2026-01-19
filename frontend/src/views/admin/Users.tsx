import { useState, useEffect, useRef, useCallback } from "react";
import { useInfiniteUsers, useUpdateUserRole, type UserRole, type User } from "@/api/users";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserCog, Mail, Calendar, Shield, Search, Pencil, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { EditPlayerProfileDialog } from "./EditPlayerProfileDialog";
import { useNotification, formatErrorMessage } from "@/hooks/useNotification";

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: "SUPER_ADMIN", label: "Super Admin", description: "Full system access" },
  { value: "ORGANIZER", label: "Organizer", description: "Can create tours/series/competitions" },
  { value: "ADMIN", label: "Admin", description: "Manage assigned resources only" },
  { value: "PLAYER", label: "Player", description: "Player access only" },
];

const ROLE_FILTER_OPTIONS: { value: UserRole | "ALL"; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "SUPER_ADMIN", label: "Admin" },
  { value: "ORGANIZER", label: "Organizer" },
  { value: "PLAYER", label: "Player" },
];

function getRoleBadgeColor(role: UserRole) {
  switch (role) {
    case "SUPER_ADMIN":
      return "bg-red-100 text-red-800 border-red-200";
    case "ORGANIZER":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "ADMIN":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "PLAYER":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function Users() {
  const updateRole = useUpdateUserRole();
  const { user: currentUser } = useAuth();
  const { showError } = useNotification();
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");

  // Debounce search input
  const debouncedSearch = useDebounce(searchInput, 300);

  // State for edit player profile dialog
  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<{
    id: number;
    email: string;
  } | null>(null);

  // Intersection Observer ref for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const isSuperAdmin = currentUser?.role === "SUPER_ADMIN";

  // Use infinite query with debounced search
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteUsers({
    limit: 50,
    search: debouncedSearch || undefined,
    role: roleFilter,
  });

  // Flatten all pages of users into a single array
  const users = data?.pages.flatMap((page) => page.users) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  // Set up Intersection Observer for infinite scroll
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [target] = entries;
      if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "100px",
      threshold: 0,
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [handleObserver]);

  const handleEditPlayerProfile = (userId: number, userEmail: string) => {
    setSelectedUserForEdit({ id: userId, email: userEmail });
    setEditProfileDialogOpen(true);
  };

  const handleRoleChange = async (userId: number, newRole: UserRole) => {
    setUpdatingUserId(userId);
    try {
      await updateRole.mutateAsync({ userId, role: newRole });
    } catch (err) {
      console.error("Failed to update role:", err);
      showError(formatErrorMessage(err, "Failed to update role"));
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleRoleFilterClick = (role: UserRole | "ALL") => {
    setRoleFilter(role);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2 mb-6">
          <UserCog className="h-8 w-8 text-turf" />
          <h2 className="text-3xl font-bold text-charcoal font-['Inter']">Users</h2>
        </div>
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
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
            <UserCog className="h-5 w-5" />
            <p className="font-medium">Error loading users</p>
          </div>
          <p className="text-red-600 text-sm mt-2">
            Please try refreshing the page or contact support if the problem persists.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <UserCog className="h-8 w-8 text-turf" />
          <h2 className="text-3xl font-bold text-charcoal font-['Inter']">
            Users ({total})
          </h2>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search by email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Role Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {ROLE_FILTER_OPTIONS.map((option) => (
          <Button
            key={option.value}
            variant={roleFilter === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => handleRoleFilterClick(option.value)}
            className={
              roleFilter === option.value
                ? "bg-turf hover:bg-turf/90 text-white"
                : "hover:bg-turf/10"
            }
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Users List */}
      {users.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="p-8 text-center">
            <UserCog className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              {debouncedSearch || roleFilter !== "ALL"
                ? `No users found${debouncedSearch ? ` matching "${debouncedSearch}"` : ""}${
                    roleFilter !== "ALL"
                      ? ` with role ${ROLES.find((r) => r.value === roleFilter)?.label}`
                      : ""
                  }`
                : "No users found"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Showing {users.length} of {total} users
          </p>
          {users.map((user: User) => {
            const isCurrentUser = user.id === currentUser?.id;
            const isUpdating = updatingUserId === user.id;

            return (
              <Card
                key={user.id}
                className={`hover:shadow-md transition-shadow duration-200 ${
                  isCurrentUser ? "border-turf border-2" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    {/* User Info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-turf/10">
                        <Mail className="h-5 w-5 text-turf" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-charcoal truncate">
                            {user.email}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              You
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Role Selector and Edit Button */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Edit Player Profile Button - SUPER_ADMIN only */}
                      {isSuperAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditPlayerProfile(user.id, user.email)}
                          title="Edit player profile"
                        >
                          <Pencil className="h-4 w-4 text-charcoal/70" />
                        </Button>
                      )}

                      {isCurrentUser ? (
                        <Badge className={`${getRoleBadgeColor(user.role)} border`}>
                          <Shield className="h-3 w-3 mr-1" />
                          {ROLES.find((r) => r.value === user.role)?.label || user.role}
                        </Badge>
                      ) : (
                        <Select
                          value={user.role}
                          onValueChange={(value: UserRole) => handleRoleChange(user.id, value)}
                          disabled={isUpdating}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((role) => (
                              <SelectItem key={role.value} value={role.value}>
                                {role.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* Load More Trigger / Loading Indicator */}
          <div ref={loadMoreRef} className="py-4 flex justify-center">
            {isFetchingNextPage ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="text-sm">Loading more...</span>
              </div>
            ) : hasNextPage ? (
              <div className="h-4" /> // Spacer for intersection observer
            ) : users.length > 0 ? (
              <p className="text-sm text-gray-400">All users loaded</p>
            ) : null}
          </div>
        </div>
      )}

      {/* Role Descriptions */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-4">
          <h3 className="font-semibold text-charcoal mb-2">Role Descriptions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {ROLES.map((role) => (
              <div key={role.value} className="flex items-center gap-2 text-sm">
                <Badge className={`${getRoleBadgeColor(role.value)} border text-xs`}>
                  {role.label}
                </Badge>
                <span className="text-gray-600">{role.description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Player Profile Dialog */}
      <EditPlayerProfileDialog
        userId={selectedUserForEdit?.id ?? null}
        userEmail={selectedUserForEdit?.email ?? ""}
        open={editProfileDialogOpen}
        onOpenChange={setEditProfileDialogOpen}
      />
    </div>
  );
}

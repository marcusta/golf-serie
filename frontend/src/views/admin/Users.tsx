import { useState } from "react";
import { useUsers, useUpdateUserRole, type UserRole } from "@/api/users";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { UserCog, Mail, Calendar, Shield, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: "SUPER_ADMIN", label: "Super Admin", description: "Full system access" },
  { value: "ORGANIZER", label: "Organizer", description: "Can create tours/series/competitions" },
  { value: "ADMIN", label: "Admin", description: "Manage assigned resources only" },
  { value: "PLAYER", label: "Player", description: "Player access only" },
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

export default function Users() {
  const { data: users, isLoading, error } = useUsers();
  const updateRole = useUpdateUserRole();
  const { user: currentUser } = useAuth();
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "ALL">("ALL");

  const handleRoleChange = async (userId: number, newRole: UserRole) => {
    setUpdatingUserId(userId);
    try {
      await updateRole.mutateAsync({ userId, role: newRole });
    } catch (err) {
      console.error("Failed to update role:", err);
      alert(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setUpdatingUserId(null);
    }
  };

  // Filter users based on search query and/or role filter
  const hasActiveFilter = searchQuery.length >= 2 || roleFilter !== "ALL";
  const filteredUsers = hasActiveFilter
    ? users?.filter(user => {
        const matchesEmail = searchQuery.length < 2 ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
        return matchesEmail && matchesRole;
      })
    : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2 mb-6">
          <UserCog className="h-8 w-8 text-turf" />
          <h2 className="text-3xl font-bold text-charcoal font-['Inter']">Users</h2>
        </div>
        <Skeleton className="h-10 w-full" />
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
          <h2 className="text-3xl font-bold text-charcoal font-['Inter']">Users</h2>
        </div>
        <Badge variant="secondary" className="text-sm">
          {users?.length || 0} {users?.length === 1 ? "user" : "users"}
        </Badge>
      </div>

      {/* Search Bar and Role Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={roleFilter}
          onValueChange={(value: UserRole | "ALL") => setRoleFilter(value)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Roles</SelectItem>
            {ROLES.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Search Results */}
      {!hasActiveFilter ? (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="p-8 text-center">
            <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              Search by email or select a role to filter users
            </p>
          </CardContent>
        </Card>
      ) : filteredUsers && filteredUsers.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="p-8 text-center">
            <UserCog className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">
              No users found
              {searchQuery.length >= 2 && ` matching "${searchQuery}"`}
              {roleFilter !== "ALL" && ` with role ${ROLES.find(r => r.value === roleFilter)?.label}`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Showing {filteredUsers?.length} result{filteredUsers?.length !== 1 ? "s" : ""}
          </p>
          {filteredUsers?.map((user) => {
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

                    {/* Role Selector */}
                    <div className="flex-shrink-0">
                      {isCurrentUser ? (
                        <Badge className={`${getRoleBadgeColor(user.role)} border`}>
                          <Shield className="h-3 w-3 mr-1" />
                          {ROLES.find(r => r.value === user.role)?.label || user.role}
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
    </div>
  );
}

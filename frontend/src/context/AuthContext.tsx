import { createContext, useContext, type ReactNode } from "react";
import {
  useCurrentUser,
  useLogin,
  useLogout,
  useRegister,
  type User,
  type LoginCredentials,
  type RegisterCredentials,
} from "../api/auth";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useCurrentUser();
  const loginMutation = useLogin();
  const logoutMutation = useLogout();
  const registerMutation = useRegister();

  const handleLogin = async (credentials: LoginCredentials): Promise<User> => {
    return loginMutation.mutateAsync(credentials);
  };

  const handleLogout = async (): Promise<void> => {
    return logoutMutation.mutateAsync();
  };

  const handleRegister = async (
    credentials: RegisterCredentials
  ): Promise<User> => {
    return registerMutation.mutateAsync(credentials);
  };

  const value: AuthContextType = {
    user: user ?? null,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === "ADMIN" || user?.role === "SUPER_ADMIN",
    login: handleLogin,
    logout: handleLogout,
    register: handleRegister,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { AuthContext };

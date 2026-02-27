"use client";

import { createContext, useContext } from "react";

interface AuthUser {
  username: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  canManage: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  canManage: false,
});

export function AuthProvider({
  user,
  children,
}: {
  user: AuthUser | null;
  children: React.ReactNode;
}) {
  const canManage = user?.role === "ADMIN" || user?.role === "COORDINATOR";

  return (
    <AuthContext.Provider value={{ user, canManage }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

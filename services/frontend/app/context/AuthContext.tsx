"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type UserRole = "IO" | "SHO" | "Magistrate" | "Admin";

export interface AuthUser {
  badgeId: string;
  role: UserRole;
  stationCode: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (userData: AuthUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("securevault_auth_user");
      if (stored) {
        setUser(JSON.parse(stored));
      }
    } catch {
      // Fallback if localStorage unavailable
    }
  }, []);

  const login = (userData: AuthUser) => {
    setUser(userData);
    try {
      localStorage.setItem("securevault_auth_user", JSON.stringify(userData));
    } catch {
      // Fallback
    }
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem("securevault_auth_user");
    } catch {
      // Fallback
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

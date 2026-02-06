"use client";

import React, { createContext, useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  username: string;
  email: string;
  role: string;
  image?: string;
};

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password?: string) => Promise<void>; // Added this
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function fetchSession(): Promise<User | null> {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("token");
  if (!token) return null; // Save a network request if no token exists

  const res = await fetch(`${API_BASE}/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    localStorage.removeItem("token"); // Clean up expired tokens
    return null;
  }
  if (!res.ok) throw new Error("Failed to fetch session");
  return (await res.json()) as User;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user, isLoading, refetch } = useQuery<User | null>({
    queryKey: ["session"],
    queryFn: fetchSession,
    staleTime: 60_000, // 1 minute
  });

  // Handle successful auth (Login or Register)
  const handleAuthSuccess = async (token: string) => {
    localStorage.setItem("token", token);
    await queryClient.invalidateQueries({ queryKey: ["session"] });
  };

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error("Login failed");
    const { access_token } = await res.json();
    await handleAuthSuccess(access_token);
  };

  // NEW: Register function integrated into Context
  const register = async (username: string, email: string, password?: string) => {
    const res = await fetch(`${API_BASE}/users/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Registration failed");
    }
    const { access_token } = await res.json();
    await handleAuthSuccess(access_token);
  };

  const logout = () => {
    localStorage.removeItem("token");
    queryClient.setQueryData(["session"], null); // Instant UI update
    queryClient.invalidateQueries({ queryKey: ["session"] });
    router.push("/");
  };

  const refresh = async () => {
    await refetch();
  };

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
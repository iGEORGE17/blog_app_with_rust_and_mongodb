"use client";

import { signIn, signOut, useSession } from "next-auth/react"; 
import { createContext, useContext, ReactNode, useEffect } from "react";
import { User, AuthContextValue } from "@/types/auth";
import { toaster } from "@/components/ui/toaster";



const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  // status can be "loading", "authenticated", or "unauthenticated"
  const isLoading = status === "loading"
  const user = session?.user || null
  const isAuthenticated = !!user


// Inside AuthProvider
useEffect(() => {
  if (session?.error === "RefreshAccessTokenError") {
    // Force logout if the token is dead
    logout();
    toaster.create({ 
      title: "Session Expired", 
      description: "Please log in again.", 
      type: "info" 
    });
  }
}, [session]);



  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const register = async (username: string, email: string, password?: string) => {
  const res = await fetch(`${API_BASE}/users/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: "Registration failed" }));
    throw new Error(errorData.message || "Registration failed");
  }

  return { email }; // Return the email so the UI knows what to log in with
};


const login = async (email: string, password: string) => {
  try {
    const result = await signIn("credentials", {
      email: email.toLowerCase().trim(), // Sanitize input
      password,
      redirect: false, 
    });
    
    if (result?.error) {
      // Mapping NextAuth internal error codes to user-friendly messages
      switch (result.error) {
        case "CredentialsSignin":
          throw new Error("Invalid email or password. Please try again.");
        case "Configuration":
          throw new Error("Server configuration error. Contact support.");
        default:
          throw new Error("An unexpected error occurred.");
      }
    }

    // Success! NextAuth automatically updates useSession()
    toaster.create({ title: "Welcome back!", type: "success" });
    
  } catch (err: any) {
    // Re-throw so the UI component (Modal) can catch it and show an error state
    throw err;
  }
};

  const logout = () => {
    signOut({ callbackUrl: "/" });
  };

  const value: AuthContextValue = {
  user: session?.user as User | null, 
  isLoading: status === "loading",
  isAuthenticated: !!session,
  login,
  register,
  logout
};

  return (
    <AuthContext.Provider 
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook for easy access in your Navbar/Modal
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
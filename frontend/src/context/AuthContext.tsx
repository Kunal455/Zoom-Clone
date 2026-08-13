"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import api from "@/lib/api";

interface User {
  user_id: string;
  name: string;
  email: string;
  photo_url?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const res = await api.get("/users/profile");
          setUser(res.data);
        } catch (err) {
          console.error("Failed to authenticate token");
          localStorage.removeItem("token");
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  useEffect(() => {
    // Protected routes logic
    if (!loading) {
      const isAuthRoute = pathname === "/login" || pathname === "/signup";
      const isPublicRoute = pathname.startsWith("/join"); // /join is public

      if (!user && !isAuthRoute && !isPublicRoute) {
        router.push("/login");
      } else if (user && isAuthRoute) {
        router.push("/");
      }
    }
  }, [user, loading, pathname, router]);

  const login = (token: string) => {
    localStorage.setItem("token", token);
    // Reload to trigger checkAuth and context updates naturally
    window.location.href = "/";
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    router.push("/login");
  };

  const isAuthRoute = pathname === "/login" || pathname === "/signup";
  const isPublicRoute = pathname?.startsWith("/join");

  // Show a loading state or nothing while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080B11]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Prevent rendering protected routes if not authenticated
  if (!user && !isAuthRoute && !isPublicRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080B11]">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

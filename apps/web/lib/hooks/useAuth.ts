"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "./redux";
import { checkAuth } from "@/store/authSlice";
import { authApi } from "@/lib/api/auth";

/**
 * Hook to automatically refresh token and check auth status
 */
export function useAuth() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Check auth status on mount
    dispatch(checkAuth());
  }, [dispatch]);

  // Auto-refresh token before it expires (every 10 minutes)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      try {
        await authApi.refresh();
      } catch (error) {
        // If refresh fails, user will be logged out on next request
        console.error("Token refresh failed:", error);
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  return {
    isAuthenticated,
    isLoading,
  };
}

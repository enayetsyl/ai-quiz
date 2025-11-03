"use client";

import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/lib/hooks/redux";
import { logoutUser } from "@/store/authSlice";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

interface LogoutButtonProps {
  variant?:
    | "default"
    | "outline"
    | "ghost"
    | "destructive"
    | "secondary"
    | "link";
  size?: "default" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg";
  className?: string;
}

export function LogoutButton({
  variant = "outline",
  size,
  className,
}: LogoutButtonProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser()).unwrap();
      toast.success("Logged out", "You have been successfully logged out");
      router.push("/login");
    } catch (error) {
      // Even if logout fails, redirect to login
      const errorMessage = typeof error === "string" ? error : "Logout failed";
      console.error("Logout error:", errorMessage);
      router.push("/login");
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLogout}
      className={className}
    >
      Logout
    </Button>
  );
}

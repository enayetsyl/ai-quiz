"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppSelector } from "@/lib/hooks/redux";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Home,
  LogIn,
  Upload as UploadIcon,
  FileQuestion,
  Database,
  Settings,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  const navItems = [
    { href: "/", label: "Home", icon: Home, requireAuth: true },
    { href: "/taxonomy", label: "Taxonomy", icon: BookOpen, requireAuth: true },
    { href: "/uploads", label: "Uploads", icon: UploadIcon, requireAuth: true },
    {
      href: "/questions",
      label: "Questions",
      icon: FileQuestion,
      requireAuth: true,
    },
    {
      href: "/question-bank",
      label: "Question Bank",
      icon: Database,
      requireAuth: true,
    },
    {
      href: "/admin",
      label: "Admin",
      icon: Settings,
      requireAuth: true,
      requireAdmin: true,
    },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (!isAuthenticated) return false;
    if (item.requireAdmin && user?.role !== "admin") return false;
    return !item.requireAuth || isAuthenticated;
  });

  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold">
            Quiz Tuition
          </Link>
          {isAuthenticated && (
            <div className="flex items-center gap-2">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={cn("gap-2", isActive && "bg-primary")}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <LogoutButton variant="ghost" />
          ) : (
            <Link href="/login">
              <Button variant="outline" className="gap-2">
                <LogIn className="h-4 w-4" />
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

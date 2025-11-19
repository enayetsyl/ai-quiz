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
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    <nav className="border-b bg-background relative z-50">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-xl font-bold">
            Quiz Tuition
          </Link>
          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-2">
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
          <div className="hidden md:block">
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
          
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-background border-b shadow-lg p-4 flex flex-col gap-4 animate-in slide-in-from-top-5">
          {isAuthenticated && (
            <div className="flex flex-col gap-2">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link 
                    key={item.href} 
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={cn("w-full justify-start gap-2", isActive && "bg-primary")}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>
          )}
          <div className="pt-4 border-t">
            {isAuthenticated ? (
              <div className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                 <LogoutButton variant="ghost" className="w-full justify-start" />
              </div>
            ) : (
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full gap-2 justify-start">
                  <LogIn className="h-4 w-4" />
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

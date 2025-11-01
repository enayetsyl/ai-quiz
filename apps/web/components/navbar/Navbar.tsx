"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppSelector } from "@/lib/hooks/redux";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { cn } from "@/lib/utils";
import { BookOpen, Settings, Home, LogIn } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const navItems = [
    { href: "/", label: "Home", icon: Home, requireAuth: true },
    { href: "/taxonomy", label: "Taxonomy", icon: BookOpen, requireAuth: true },
    // Add more routes here as they're created
  ];

  const filteredNavItems = navItems.filter(
    (item) => !item.requireAuth || isAuthenticated
  );

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

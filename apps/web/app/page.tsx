"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAppSelector } from "@/lib/hooks/redux";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Upload as UploadIcon,
  FileQuestion,
  Database,
  Settings,
} from "lucide-react";

interface NavigationCard {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requireAdmin?: boolean;
}

export default function Home() {
  useAuth(); // Initialize auth check
  const { user } = useAppSelector((state) => state.auth);

  const navigationCards: NavigationCard[] = [
    {
      title: "Taxonomy Management",
      description: "Manage class levels, subjects, and chapters",
      href: "/taxonomy",
      icon: BookOpen,
    },
    {
      title: "Uploads",
      description: "Upload PDFs and manage page generation jobs",
      href: "/uploads",
      icon: UploadIcon,
    },
    {
      title: "Questions Review",
      description: "Review, edit, and approve generated questions",
      href: "/questions",
      icon: FileQuestion,
    },
    {
      title: "Question Bank",
      description: "View published questions ready for use",
      href: "/question-bank",
      icon: Database,
    },
    {
      title: "Admin Dashboard",
      description: "Monitor system activity and generation statistics",
      href: "/admin",
      icon: Settings,
      requireAdmin: true,
    },
  ];

  const visibleCards = navigationCards.filter(
    (card) => !card.requireAdmin || user?.role === "admin"
  );

  return (
    <ProtectedRoute requireAuth={true}>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-6xl">
          <h1 className="text-3xl font-bold mb-4">
            Welcome{user?.email ? `, ${user.email}` : ""}!
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            You are successfully authenticated. This is a protected route.
          </p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visibleCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.href}
                  className="rounded-lg border p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Icon className="h-6 w-6 text-primary" />
                    <h2 className="text-xl font-semibold">{card.title}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {card.description}
                  </p>
                  <Link href={card.href}>
                    <Button className="w-full">
                      Go to{" "}
                      {card.title
                        .replace(" Management", "")
                        .replace(" Dashboard", "")
                        .replace(" Review", "")}
                    </Button>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

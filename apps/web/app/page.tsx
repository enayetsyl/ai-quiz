"use client";

import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useAppSelector } from "@/lib/hooks/redux";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function Home() {
  useAuth(); // Initialize auth check
  const { user } = useAppSelector((state) => state.auth);

  return (
    <ProtectedRoute requireAuth={true}>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl">
          <h1 className="text-3xl font-bold mb-4">
            Welcome{user?.email ? `, ${user.email}` : ""}!
          </h1>
          <p className="text-lg text-muted-foreground mb-6">
            You are successfully authenticated. This is a protected route.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-2">
                Taxonomy Management
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Manage class levels, subjects, and chapters
              </p>
              <Link href="/taxonomy">
                <Button>Go to Taxonomy</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { useAppSelector } from "@/lib/hooks/redux";
import { useAuth } from "@/lib/hooks/useAuth";

export default function Home() {
  useAuth(); // Initialize auth check
  const { user } = useAppSelector((state) => state.auth);

  return (
    <ProtectedRoute requireAuth={true}>
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
          <div className="flex w-full items-center justify-between">
            <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
              Welcome{user?.email ? `, ${user.email}` : ""}!
            </h1>
            <LogoutButton />
          </div>
          <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
            <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              You are successfully authenticated. This is a protected route.
            </p>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

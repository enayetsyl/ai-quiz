"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export default function AdminPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Monitor system events, usage statistics, and manage resources
          </p>
        </div>
        <AdminDashboard />
      </div>
    </ProtectedRoute>
  );
}

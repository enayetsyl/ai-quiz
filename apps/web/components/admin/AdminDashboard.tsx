"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardStats } from "./DashboardStats";
import { PageGenerationAttempts } from "./PageGenerationAttempts";
import { LlmUsageEvents } from "./LlmUsageEvents";
import { PagesInfo } from "./PagesInfo";

export function AdminDashboard() {
  return (
    <Tabs defaultValue="stats" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="stats">Dashboard</TabsTrigger>
        <TabsTrigger value="attempts">Generation Attempts</TabsTrigger>
        <TabsTrigger value="llm">LLM Usage</TabsTrigger>
        <TabsTrigger value="pages">Pages</TabsTrigger>
      </TabsList>

      <TabsContent value="stats" className="mt-6">
        <DashboardStats />
      </TabsContent>

      <TabsContent value="attempts" className="mt-6">
        <PageGenerationAttempts />
      </TabsContent>

      <TabsContent value="llm" className="mt-6">
        <LlmUsageEvents />
      </TabsContent>

      <TabsContent value="pages" className="mt-6">
        <PagesInfo />
      </TabsContent>
    </Tabs>
  );
}

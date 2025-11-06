"use client";

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ClassesManager } from "@/components/taxonomy/ClassesManager";
import { SubjectsManager } from "@/components/taxonomy/SubjectsManager";
import { ChaptersManager } from "@/components/taxonomy/ChaptersManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function TaxonomyPage() {
  return (
    <ProtectedRoute requireAuth={true}>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Taxonomy Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage class levels, subjects, and chapters
          </p>
        </div>

        <Tabs defaultValue="classes" className="space-y-6">
          <TabsList>
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="chapters">Chapters</TabsTrigger>
          </TabsList>

          <TabsContent value="classes">
            <Card>
              <CardHeader>
                <CardTitle>Class Levels</CardTitle>
                <CardDescription>
                  Manage class levels (grades 1-10)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ClassesManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subjects">
            <Card>
              <CardHeader>
                <CardTitle>Subjects</CardTitle>
                <CardDescription>
                  Manage subjects for each class level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SubjectsManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chapters">
            <Card>
              <CardHeader>
                <CardTitle>Chapters</CardTitle>
                <CardDescription>
                  Manage chapters for each subject
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChaptersManager />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProtectedRoute>
  );
}

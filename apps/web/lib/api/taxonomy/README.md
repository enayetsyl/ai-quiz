# Taxonomy API Integration

This directory contains the frontend integration for the Taxonomy module, which manages Class Levels, Subjects, and Chapters.

## API Functions

Located in `@/lib/api/taxonomy/taxonomy.ts`:

- **Classes**: `getClasses()`, `createClass()`, `updateClass()`, `deleteClass()`
- **Subjects**: `getSubjects(classId?)`, `createSubject()`, `updateSubject()`, `deleteSubject()`
- **Chapters**: `getChapters(subjectId?)`, `createChapter()`, `updateChapter()`, `deleteChapter()`

## React Hooks

Located in `@/lib/hooks/useTaxonomy.ts`:

### Classes

- `useClasses()` - Get all class levels
- `useCreateClass()` - Create a new class level
- `useUpdateClass()` - Update a class level
- `useDeleteClass()` - Delete a class level

### Subjects

- `useSubjects(classId?)` - Get subjects (optionally filtered by classId)
- `useCreateSubject()` - Create a new subject
- `useUpdateSubject()` - Update a subject
- `useDeleteSubject()` - Delete a subject

### Chapters

- `useChapters(subjectId?)` - Get chapters (optionally filtered by subjectId)
- `useCreateChapter()` - Create a new chapter
- `useUpdateChapter()` - Update a chapter
- `useDeleteChapter()` - Delete a chapter

## Usage Examples

### Fetching Classes

```typescript
import { useClasses } from "@/lib/hooks/useTaxonomy";

function ClassesList() {
  const { data: classes, isLoading, error } = useClasses();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading classes</div>;

  return (
    <div>
      {classes?.map((classLevel) => (
        <div key={classLevel.id}>{classLevel.displayName}</div>
      ))}
    </div>
  );
}
```

### Create Subject

```typescript
import { useCreateSubject } from "@/lib/hooks/useTaxonomy";

function CreateSubjectForm() {
  const createSubject = useCreateSubject();

  const handleSubmit = (data: {
    classId: number;
    name: string;
    code?: string;
  }) => {
    createSubject.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button disabled={createSubject.isPending}>
        {createSubject.isPending ? "Creating..." : "Create Subject"}
      </button>
    </form>
  );
}
```

### Filtered Queries

```typescript
import { useSubjects } from "@/lib/hooks/useTaxonomy";

function SubjectsByClass({ classId }: { classId: number }) {
  const { data: subjects } = useSubjects(classId);

  return (
    <div>
      {subjects?.map((subject) => (
        <div key={subject.id}>{subject.name}</div>
      ))}
    </div>
  );
}
```

## Type Definitions

All types are exported from `@/lib/api/taxonomy/taxonomy`:

- `ClassLevel`
- `Subject`
- `Chapter`
- `CreateClassData`, `UpdateClassData`
- `CreateSubjectData`, `UpdateSubjectData`
- `CreateChapterData`, `UpdateChapterData`

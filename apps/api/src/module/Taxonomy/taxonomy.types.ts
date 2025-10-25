export interface ClassLevelDto {
  id: number;
  displayName: string;
}

export interface SubjectDto {
  id: string;
  classId: number;
  name: string;
  code?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterDto {
  id: string;
  subjectId: string;
  name: string;
  ordinal: number;
  createdAt: string;
  updatedAt: string;
}

import { apiClient, extractApiData, type ApiResponse } from "../axios";

export interface ClassLevel {
  id: number;
  displayName: string;
}

export interface Subject {
  id: string;
  classId: number;
  name: string;
  code?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Chapter {
  id: string;
  subjectId: string;
  name: string;
  ordinal: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClassData {
  id: number;
  displayName: string;
}

export interface UpdateClassData {
  displayName?: string;
}

export interface CreateSubjectData {
  classId: number;
  name: string;
  code?: string | null;
}

export interface UpdateSubjectData {
  name?: string;
  code?: string | null;
}

export interface CreateChapterData {
  subjectId: string;
  name: string;
  ordinal: number;
}

export interface UpdateChapterData {
  name?: string;
  ordinal?: number;
}

export const taxonomyApi = {
  // Classes
  getClasses: async (): Promise<ClassLevel[]> => {
    const response = await apiClient.get<ApiResponse<ClassLevel[]>>(
      "/taxonomy/classes"
    );
    return extractApiData<ClassLevel[]>(response);
  },

  createClass: async (data: CreateClassData): Promise<ClassLevel> => {
    const response = await apiClient.post<ApiResponse<ClassLevel>>(
      "/taxonomy/classes",
      data
    );
    return extractApiData<ClassLevel>(response);
  },

  updateClass: async (
    id: number,
    data: UpdateClassData
  ): Promise<ClassLevel> => {
    const response = await apiClient.put<ApiResponse<ClassLevel>>(
      `/taxonomy/classes/${id}`,
      data
    );
    return extractApiData<ClassLevel>(response);
  },

  deleteClass: async (id: number): Promise<void> => {
    await apiClient.delete(`/taxonomy/classes/${id}`);
  },

  // Subjects
  getSubjects: async (classId?: number): Promise<Subject[]> => {
    const params = classId ? { classId: classId.toString() } : {};
    const response = await apiClient.get<ApiResponse<Subject[]>>(
      "/taxonomy/subjects",
      { params }
    );
    return extractApiData<Subject[]>(response);
  },

  createSubject: async (data: CreateSubjectData): Promise<Subject> => {
    const response = await apiClient.post<ApiResponse<Subject>>(
      "/taxonomy/subjects",
      data
    );
    return extractApiData<Subject>(response);
  },

  updateSubject: async (
    id: string,
    data: UpdateSubjectData
  ): Promise<Subject> => {
    const response = await apiClient.put<ApiResponse<Subject>>(
      `/taxonomy/subjects/${id}`,
      data
    );
    return extractApiData<Subject>(response);
  },

  deleteSubject: async (id: string): Promise<void> => {
    await apiClient.delete(`/taxonomy/subjects/${id}`);
  },

  // Chapters
  getChapters: async (subjectId?: string): Promise<Chapter[]> => {
    const params = subjectId ? { subjectId } : {};
    const response = await apiClient.get<ApiResponse<Chapter[]>>(
      "/taxonomy/chapters",
      { params }
    );
    return extractApiData<Chapter[]>(response);
  },

  createChapter: async (data: CreateChapterData): Promise<Chapter> => {
    const response = await apiClient.post<ApiResponse<Chapter>>(
      "/taxonomy/chapters",
      data
    );
    return extractApiData<Chapter>(response);
  },

  updateChapter: async (
    id: string,
    data: UpdateChapterData
  ): Promise<Chapter> => {
    const response = await apiClient.put<ApiResponse<Chapter>>(
      `/taxonomy/chapters/${id}`,
      data
    );
    return extractApiData<Chapter>(response);
  },

  deleteChapter: async (id: string): Promise<void> => {
    await apiClient.delete(`/taxonomy/chapters/${id}`);
  },
};

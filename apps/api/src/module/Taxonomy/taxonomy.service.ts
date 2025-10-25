import prisma from "../../lib";

export const listClasses = async () => {
  return await prisma.classLevel.findMany({ orderBy: { id: "asc" } });
};

export const createClass = async (payload: {
  id: number;
  displayName: string;
}) => {
  return await prisma.classLevel.create({ data: payload });
};

export const updateClass = async (
  id: number,
  data: { displayName?: string }
) => {
  return await prisma.classLevel.update({ where: { id }, data });
};

export const deleteClass = async (id: number) => {
  return await prisma.classLevel.delete({ where: { id } });
};

export const listSubjects = async (classId?: number) => {
  const where = classId ? { where: { classId } } : undefined;
  return await prisma.subject.findMany({
    ...(where || {}),
    orderBy: { name: "asc" },
  });
};

export const createSubject = async (payload: {
  classId: number;
  name: string;
  code?: string | null;
}) => {
  return await prisma.subject.create({ data: payload });
};

export const updateSubject = async (
  id: string,
  data: { name?: string; code?: string | null }
) => {
  return await prisma.subject.update({ where: { id }, data });
};

export const deleteSubject = async (id: string) => {
  return await prisma.subject.delete({ where: { id } });
};

export const listChapters = async (subjectId?: string) => {
  const where = subjectId ? { where: { subjectId } } : undefined;
  return await prisma.chapter.findMany({
    ...(where || {}),
    orderBy: { ordinal: "asc" },
  });
};

export const createChapter = async (payload: {
  subjectId: string;
  name: string;
  ordinal: number;
}) => {
  // rely on DB unique constraint for ordinal per subject
  return await prisma.chapter.create({ data: payload });
};

export const updateChapter = async (
  id: string,
  data: { name?: string; ordinal?: number }
) => {
  return await prisma.chapter.update({ where: { id }, data });
};

export const deleteChapter = async (id: string) => {
  return await prisma.chapter.delete({ where: { id } });
};

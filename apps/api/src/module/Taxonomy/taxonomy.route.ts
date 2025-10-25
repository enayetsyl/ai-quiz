import { Router } from "express";
import * as ctrl from "./taxonomy.controller";
import requireAuth from "../../middleware/auth";
import catchAsync from "../../utils/catchAsync";
import validateZod from "../../middleware/validateZod";
import validation from "./taxonomy.validation";

const router = Router();

// Classes
router.get("/classes", requireAuth, catchAsync(ctrl.getClasses));
router.post(
  "/classes",
  requireAuth,
  validateZod({ body: validation.createClassSchema }),
  catchAsync(ctrl.postClass)
);
router.put(
  "/classes/:id",
  requireAuth,
  validateZod({ body: validation.updateClassSchema }),
  catchAsync(ctrl.putClass)
);
router.delete("/classes/:id", requireAuth, catchAsync(ctrl.delClass));

// Subjects
router.get("/subjects", requireAuth, catchAsync(ctrl.getSubjects));
router.post(
  "/subjects",
  requireAuth,
  validateZod({ body: validation.createSubjectSchema }),
  catchAsync(ctrl.postSubject)
);
router.put(
  "/subjects/:id",
  requireAuth,
  validateZod({ body: validation.updateSubjectSchema }),
  catchAsync(ctrl.putSubject)
);
router.delete("/subjects/:id", requireAuth, catchAsync(ctrl.delSubject));

// Chapters
router.get("/chapters", requireAuth, catchAsync(ctrl.getChapters));
router.post(
  "/chapters",
  requireAuth,
  validateZod({ body: validation.createChapterSchema }),
  catchAsync(ctrl.postChapter)
);
router.put(
  "/chapters/:id",
  requireAuth,
  validateZod({ body: validation.updateChapterSchema }),
  catchAsync(ctrl.putChapter)
);
router.delete("/chapters/:id", requireAuth, catchAsync(ctrl.delChapter));

export const TaxonomyRoutes = router;

import { Router } from "express";
import { UserRoutes } from "../module/User/user.route";
import { SettingsRoutes } from "../module/Settings/settings.route";
import { TaxonomyRoutes } from "../module/Taxonomy/taxonomy.route";
import { UploadRoutes } from "../module/Upload/upload.route";
import { GenerationRoutes } from "../module/Generation/generation.route";
import QuestionRoutes from "../module/Question/question.route";
import QuestionBankRoutes from "../module/QuestionBank/questionbank.route";
import { AdminRoutes } from "../module/Admin/admin.route";

const router = Router();

const moduleRoutes = [
  {
    path: "/users",
    route: UserRoutes,
  }, // This is a sample — replace with your actual path and route.
  {
    path: "/admin/settings",
    route: SettingsRoutes,
  },
  {
    path: "/taxonomy",
    route: TaxonomyRoutes,
  },
  {
    path: "/uploads",
    route: UploadRoutes,
  },
  {
    path: "/generation",
    route: GenerationRoutes,
  },
  {
    path: "/questions",
    route: QuestionRoutes,
  },
  {
    path: "/question-bank",
    route: QuestionBankRoutes,
  },
  {
    path: "/admin",
    route: AdminRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;

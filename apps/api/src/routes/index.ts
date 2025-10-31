import { Router } from "express";
import { UserRoutes } from "../module/User/user.route";
import { SettingsRoutes } from "../module/Settings/settings.route";
import { TaxonomyRoutes } from "../module/Taxonomy/taxonomy.route";
import { UploadRoutes } from "../module/Upload/upload.route";
import { GenerationRoutes } from "../module/Generation/generation.route";

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
  // TODO: add necessary path and route entries to this array
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;

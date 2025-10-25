import { Router } from "express";
import { UserRoutes } from "../module/User/user.route";
import { SettingsRoutes } from "../module/Settings/settings.route";

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
  // TODO: add necessary path and route entries to this array
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;

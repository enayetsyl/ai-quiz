import { Request, Response } from "express";
import * as service from "./settings.service";

export async function getSettings(_req: Request, res: Response) {
  const settings = await service.getAppSettings();
  res.json(settings);
}

export async function patchSettings(req: Request, res: Response) {
  const payload = req.body;
  const updated = await service.updateAppSettings(payload);
  res.json(updated);
}

export default {
  getSettings,
  patchSettings,
};

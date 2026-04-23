import type { Request, Response, NextFunction } from "express";
import * as settingsService from "../services/settings.service.js";

export async function getSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await settingsService.getSettings(req.userId!);
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await settingsService.updateSettings(req.userId!, req.body);
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
}

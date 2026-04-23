import type { Request, Response, NextFunction } from "express";
import * as recurringService from "../services/recurring.service.js";

export async function getRecurringPatterns(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await recurringService.getRecurringPatterns(req.userId!);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function dismissPattern(req: Request, res: Response, next: NextFunction) {
  try {
    await recurringService.dismissPattern(req.userId!, req.params.id);
    res.json({ success: true, data: { message: "Pattern dismissed" } });
  } catch (error) {
    next(error);
  }
}

export async function togglePatternActive(req: Request, res: Response, next: NextFunction) {
  try {
    const pattern = await recurringService.togglePatternActive(req.userId!, req.params.id);
    res.json({ success: true, data: pattern });
  } catch (error) {
    next(error);
  }
}

export async function updateFrequency(req: Request, res: Response, next: NextFunction) {
  try {
    const pattern = await recurringService.updatePatternFrequency(
      req.userId!,
      req.params.id,
      req.body.frequency,
    );
    res.json({ success: true, data: pattern });
  } catch (error) {
    next(error);
  }
}

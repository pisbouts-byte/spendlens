import type { Request, Response, NextFunction } from "express";
import * as fiftyThirtyTwentyService from "../services/fiftyThirtyTwenty.service.js";
import type { FiftyThirtyTwentyCategory } from "@spendlens/shared";

export async function getItems(req: Request, res: Response, next: NextFunction) {
  try {
    const category = req.query.category as FiftyThirtyTwentyCategory | undefined;
    const items = await fiftyThirtyTwentyService.getItems(req.userId!, category);
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
}

export async function createItem(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await fiftyThirtyTwentyService.createItem(req.userId!, req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

export async function updateItem(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await fiftyThirtyTwentyService.updateItem(req.userId!, req.params.id as string, req.body);
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

export async function deleteItem(req: Request, res: Response, next: NextFunction) {
  try {
    await fiftyThirtyTwentyService.deleteItem(req.userId!, req.params.id as string);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
}

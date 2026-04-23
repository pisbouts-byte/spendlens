import type { Request, Response, NextFunction } from "express";
import * as categoryService from "../services/category.service.js";

export async function getCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await categoryService.getCategories(req.userId!);
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await categoryService.createCategory(req.userId!, req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const category = await categoryService.updateCategory(
      req.userId!,
      req.params.id as string,
      req.body,
    );
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction) {
  try {
    const reassignTo = req.query.reassignTo as string | undefined;
    await categoryService.deleteCategory(req.userId!, req.params.id as string, reassignTo);
    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    next(error);
  }
}

export async function mergeCategories(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await categoryService.mergeCategories(req.userId!, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

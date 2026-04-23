import type { Request, Response, NextFunction } from "express";
import * as budgetService from "../services/budget.service.js";

export async function getBudgets(req: Request, res: Response, next: NextFunction) {
  try {
    const budgets = await budgetService.getBudgets(req.userId!);
    res.json({ success: true, data: budgets });
  } catch (error) {
    next(error);
  }
}

export async function createBudget(req: Request, res: Response, next: NextFunction) {
  try {
    const budget = await budgetService.createBudget(req.userId!, req.body);
    res.status(201).json({ success: true, data: budget });
  } catch (error) {
    next(error);
  }
}

export async function updateBudget(req: Request, res: Response, next: NextFunction) {
  try {
    const budget = await budgetService.updateBudget(
      req.userId!,
      req.params.id as string,
      req.body,
    );
    res.json({ success: true, data: budget });
  } catch (error) {
    next(error);
  }
}

export async function deleteBudget(req: Request, res: Response, next: NextFunction) {
  try {
    await budgetService.deleteBudget(req.userId!, req.params.id as string);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
}

export async function getBudgetProgress(req: Request, res: Response, next: NextFunction) {
  try {
    const progress = await budgetService.getBudgetProgress(
      req.userId!,
      req.query as never,
    );
    res.json({ success: true, data: progress });
  } catch (error) {
    next(error);
  }
}

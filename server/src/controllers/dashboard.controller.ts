import type { Request, Response, NextFunction } from "express";
import * as dashboardService from "../services/dashboard.service.js";

export async function getSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate } = req.query as {
      startDate?: string;
      endDate?: string;
    };
    const summary = await dashboardService.getDashboardSummary(
      req.userId!,
      startDate,
      endDate,
    );
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
}

export async function getSpendingByCategory(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { startDate, endDate } = req.query as {
      startDate?: string;
      endDate?: string;
    };
    const data = await dashboardService.getSpendingByCategory(
      req.userId!,
      startDate,
      endDate,
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getSpendingOverTime(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { startDate, endDate, granularity } = req.query as {
      startDate?: string;
      endDate?: string;
      granularity?: "daily" | "weekly" | "monthly";
    };
    const data = await dashboardService.getSpendingOverTime(
      req.userId!,
      startDate,
      endDate,
      granularity,
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getTopMerchants(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { startDate, endDate, limit } = req.query as {
      startDate?: string;
      endDate?: string;
      limit?: string;
    };
    const data = await dashboardService.getTopMerchants(
      req.userId!,
      startDate,
      endDate,
      limit ? parseInt(limit, 10) : undefined,
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getRecentTransactions(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { limit } = req.query as { limit?: string };
    const data = await dashboardService.getRecentTransactions(
      req.userId!,
      limit ? parseInt(limit, 10) : undefined,
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

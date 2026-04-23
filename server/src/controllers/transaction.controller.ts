import type { Request, Response, NextFunction } from "express";
import * as transactionService from "../services/transaction.service.js";
import * as categorizationService from "../services/categorization.service.js";

export async function getTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await transactionService.getTransactions(req.userId!, req.query as never);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getTransaction(req: Request, res: Response, next: NextFunction) {
  try {
    const transaction = await transactionService.getTransaction(
      req.userId!,
      req.params.id as string,
    );
    res.json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
}

export async function updateTransaction(req: Request, res: Response, next: NextFunction) {
  try {
    const transaction = await transactionService.updateTransaction(
      req.userId!,
      req.params.id as string,
      req.body,
    );
    res.json({ success: true, data: transaction });
  } catch (error) {
    next(error);
  }
}

export async function bulkUpdate(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await transactionService.bulkUpdateTransactions(req.userId!, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function deleteTransaction(req: Request, res: Response, next: NextFunction) {
  try {
    await transactionService.deleteTransaction(req.userId!, req.params.id as string);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function bulkDelete(req: Request, res: Response, next: NextFunction) {
  try {
    const { transactionIds } = req.body;
    const result = await transactionService.bulkDeleteTransactions(req.userId!, transactionIds);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function categorize(req: Request, res: Response, next: NextFunction) {
  try {
    const { transactionIds } = req.body;
    const results = await categorizationService.categorizeTransactions(
      req.userId!,
      transactionIds,
    );
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
}

export async function categorizeAll(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await categorizationService.categorizeAllUncategorized(req.userId!);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function exportTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const csv = await transactionService.exportTransactions(req.userId!, req.query as never);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=transactions.csv");
    res.send(csv);
  } catch (error) {
    next(error);
  }
}

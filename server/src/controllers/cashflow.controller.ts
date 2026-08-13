import type { Request, Response, NextFunction } from "express";
import * as cashflowService from "../services/cashflow.service.js";
import type { CashFlowType } from "@spendlens/shared";

export async function getItems(req: Request, res: Response, next: NextFunction) {
  try {
    const type = req.query.type as CashFlowType | undefined;
    const items = await cashflowService.getItems(req.userId!, type);
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
}

export async function createItem(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await cashflowService.createItem(req.userId!, req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

export async function updateItem(req: Request, res: Response, next: NextFunction) {
  try {
    const item = await cashflowService.updateItem(req.userId!, req.params.id as string, req.body);
    res.json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

export async function deleteItem(req: Request, res: Response, next: NextFunction) {
  try {
    await cashflowService.deleteItem(req.userId!, req.params.id as string);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
}

export async function upsertOverride(req: Request, res: Response, next: NextFunction) {
  try {
    const override = await cashflowService.upsertOverride(req.userId!, req.params.id as string, req.body);
    res.json({ success: true, data: override });
  } catch (error) {
    next(error);
  }
}

export async function deleteOverride(req: Request, res: Response, next: NextFunction) {
  try {
    await cashflowService.deleteOverride(req.userId!, req.params.id as string, req.params.periodKey as string);
    res.json({ success: true, data: null });
  } catch (error) {
    next(error);
  }
}

export async function getBalance(req: Request, res: Response, next: NextFunction) {
  try {
    const balance = await cashflowService.getBalance(req.userId!);
    res.json({ success: true, data: balance });
  } catch (error) {
    next(error);
  }
}

export async function updateBalance(req: Request, res: Response, next: NextFunction) {
  try {
    const balance = await cashflowService.updateBalance(req.userId!, req.body);
    res.json({ success: true, data: balance });
  } catch (error) {
    next(error);
  }
}

export async function getForecast(req: Request, res: Response, next: NextFunction) {
  try {
    const months = req.query.months as number | undefined;
    const forecast = await cashflowService.getForecast(req.userId!, months);
    res.json({ success: true, data: forecast });
  } catch (error) {
    next(error);
  }
}

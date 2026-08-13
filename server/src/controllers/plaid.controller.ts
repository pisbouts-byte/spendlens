import type { Request, Response, NextFunction } from "express";
import * as plaidService from "../services/plaid.service.js";
import { prisma } from "../config/prisma.js";

export async function createLinkToken(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await plaidService.createLinkToken(req.userId!);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function createUpdateLinkToken(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await plaidService.createUpdateLinkToken(req.userId!, req.params.itemId as string);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function reconnectItem(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await plaidService.reconnectItem(req.userId!, req.params.itemId as string);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function exchangeToken(req: Request, res: Response, next: NextFunction) {
  try {
    const { publicToken, institutionId, institutionName } = req.body;
    const result = await plaidService.exchangeToken(
      req.userId!,
      publicToken,
      institutionId,
      institutionName,
    );
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function syncTransactions(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await plaidService.syncTransactions(
      req.userId!,
      req.params.itemId as string,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function syncAll(req: Request, res: Response, next: NextFunction) {
  try {
    const results = await plaidService.syncAllItems(req.userId!);
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
}

export async function getAccounts(req: Request, res: Response, next: NextFunction) {
  try {
    const items = await plaidService.getAccounts(req.userId!);
    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
}

export async function updateAccountSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await plaidService.updateAccountSettings(
      req.userId!,
      req.params.id as string,
      req.body,
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function removeItem(req: Request, res: Response, next: NextFunction) {
  try {
    await plaidService.removeItem(req.userId!, req.params.itemId as string);
    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    next(error);
  }
}

export async function getSyncLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const logs = await prisma.syncLog.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { plaidItem: { select: { institutionName: true } } },
    });
    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
}

export async function handleWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    await plaidService.handleWebhook(req.body);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

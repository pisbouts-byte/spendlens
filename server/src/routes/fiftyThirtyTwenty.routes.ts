import { Router, type Router as RouterType } from "express";
import {
  CreateFiftyThirtyTwentyItemSchema,
  UpdateFiftyThirtyTwentyItemSchema,
} from "@spendlens/shared";
import { validateRequest } from "../middleware/validateRequest.js";
import { requireAuth } from "../middleware/auth.js";
import * as fiftyThirtyTwentyController from "../controllers/fiftyThirtyTwenty.controller.js";

const router: RouterType = Router();

router.use(requireAuth);

router.get("/items", fiftyThirtyTwentyController.getItems);

router.post(
  "/items",
  validateRequest({ body: CreateFiftyThirtyTwentyItemSchema }),
  fiftyThirtyTwentyController.createItem,
);

router.patch(
  "/items/:id",
  validateRequest({ body: UpdateFiftyThirtyTwentyItemSchema }),
  fiftyThirtyTwentyController.updateItem,
);

router.delete("/items/:id", fiftyThirtyTwentyController.deleteItem);

export default router;

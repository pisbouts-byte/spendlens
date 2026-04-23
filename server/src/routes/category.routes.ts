import { Router, type Router as RouterType } from "express";
import {
  CreateCategorySchema,
  UpdateCategorySchema,
  MergeCategoriesSchema,
} from "@spendlens/shared";
import { validateRequest } from "../middleware/validateRequest.js";
import { requireAuth } from "../middleware/auth.js";
import * as categoryController from "../controllers/category.controller.js";

const router: RouterType = Router();

router.use(requireAuth);

router.get("/", categoryController.getCategories);

router.post(
  "/",
  validateRequest({ body: CreateCategorySchema }),
  categoryController.createCategory,
);

router.patch(
  "/:id",
  validateRequest({ body: UpdateCategorySchema }),
  categoryController.updateCategory,
);

router.delete("/:id", categoryController.deleteCategory);

router.post(
  "/merge",
  validateRequest({ body: MergeCategoriesSchema }),
  categoryController.mergeCategories,
);

export default router;

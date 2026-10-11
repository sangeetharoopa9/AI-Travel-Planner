
import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { requireAdmin } from "../middleware/admin.middleware.js";

import {
    getAdminSummary,
    listCatalogItems,
    createCatalogItem,
    updateCatalogItem,
    deleteCatalogItem,
    listUsers,
    updateUser,
} from "../controllers/admin.controller.js";

import {
    listAdminDeals,
    createDeal,
    updateDeal,
    deleteDeal,
} from "../controllers/deal.controller.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/summary", getAdminSummary);

router.get("/catalog", listCatalogItems);
router.post("/catalog", createCatalogItem);
router.put("/catalog/:id", updateCatalogItem);
router.delete("/catalog/:id", deleteCatalogItem);

router.get("/users", listUsers);
router.patch("/users/:id", updateUser);

router.get("/deals", listAdminDeals);
router.post("/deals", createDeal);
router.put("/deals/:id", updateDeal);
router.delete("/deals/:id", deleteDeal);

export default router;

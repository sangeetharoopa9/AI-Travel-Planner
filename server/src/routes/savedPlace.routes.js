import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
    addSavedPlace,
    getSavedPlaces,
    removeSavedPlace,
} from "../controllers/savedPlace.controller.js";

const router = Router();

router.use(requireAuth);

router.get("/", getSavedPlaces);
router.post("/", addSavedPlace);
router.delete("/:destinationId", removeSavedPlace);

export default router;
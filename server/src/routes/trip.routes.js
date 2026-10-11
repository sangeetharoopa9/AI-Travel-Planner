import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
    createTrip,
    getMyTrips,
    getTripById,
    deleteTrip,
} from "../controllers/trip.controller.js";

const router = Router();

router.use(requireAuth);

router.post("/generate", createTrip);
router.get("/my", getMyTrips);
router.get("/:id", getTripById);
router.delete("/:id", deleteTrip);

export default router;
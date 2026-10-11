import { Router } from "express";
import {
    getPublicDestinations,
    getPublicHotels,
} from "../controllers/catalog.controller.js";

const router = Router();

router.get("/destinations", getPublicDestinations);
router.get("/hotels", getPublicHotels);

export default router;
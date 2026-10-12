import { Router } from "express";
import {
    getPublicDestinations,
    getPublicHotels,
    searchLiveHotels,
} from "../controllers/catalog.controller.js";

const router = Router();

router.get("/destinations", getPublicDestinations);
router.get("/hotels", getPublicHotels);
router.get("/hotels/search", searchLiveHotels);

export default router;
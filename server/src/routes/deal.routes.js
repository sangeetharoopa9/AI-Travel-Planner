import express from "express";
import { getPublicDeals } from "../controllers/deal.controller.js";

const router = express.Router();

router.get("/", getPublicDeals);

export default router;
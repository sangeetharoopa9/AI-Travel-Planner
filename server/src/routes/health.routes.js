
import { Router } from "express";
import { getDatabaseStatus } from "../config/db.js";

const router = Router();

router.get("/", (req, res) => {
    const database = getDatabaseStatus();

    res.status(200).json({
        success: true,
        message: "Roamwise API is running.",
        data: {
            server: "healthy",
            database,
            timestamp: new Date().toISOString(),
        },
    });
});

export default router;

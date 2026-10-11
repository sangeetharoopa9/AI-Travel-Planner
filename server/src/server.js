import mongoose from "mongoose";
import app from "../src/app.js";
import { connectDB } from "../src/config/db.js";

const allowedOrigins = [
    process.env.CLIENT_URL,
    "https://roamwise-client.vercel.app",
    "http://localhost:5173",
]
    .filter(Boolean)
    .map((origin) => origin.replace(/\/$/, ""));

let connecting = null;

async function ensureDatabase() {
    if (mongoose.connection.readyState === 1) return;
    if (!connecting) {
        connecting = connectDB().finally(() => {
            connecting = null;
        });
    }
    await connecting;
}

export default async function handler(req, res) {
    // 1) CORS headers first, so even error responses carry them
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
        res.setHeader(
            "Access-Control-Allow-Methods",
            "GET,POST,PUT,PATCH,DELETE,OPTIONS"
        );
        res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization"
        );
    }

    // 2) Answer the browser preflight without touching the database
    if (req.method === "OPTIONS") {
        res.statusCode = 204;
        return res.end();
    }

    // 3) Normal requests: connect to MongoDB, then hand over to Express
    try {
        await ensureDatabase();
        return app(req, res);
    } catch (error) {
        console.error("Roamwise API initialization failed:", error.message);
        return res.status(500).json({
            success: false,
            error: {
                code: "SERVER_INITIALIZATION_FAILED",
                message:
                    "The API could not initialize. Check server environment variables and database connectivity.",
            },
        });
    }
}

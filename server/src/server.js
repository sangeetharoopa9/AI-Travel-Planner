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
    const origin = req.headers.origin;
    
    // 1) Set CORS headers dynamically based on the origin
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true"); // CRITICAL: Added this missing header
        res.setHeader("Vary", "Origin");
        res.setHeader(
            "Access-Control-Allow-Methods",
            "GET,POST,PUT,PATCH,DELETE,OPTIONS"
        );
        res.setHeader(
            "Access-Control-Allow-Headers",
            "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
        );
    }

    // 2) Handle the preflight OPTIONS request immediately
    if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
    }

    // 3) Connect DB and pass to Express
    try {
        await ensureDatabase();
        return app(req, res);
    } catch (error) {
        console.error("Roamwise API initialization failed:", error.message);
        return res.status(500).json({
            success: false,
            error: {
                code: "SERVER_INITIALIZATION_FAILED",
                message: "The API could not initialize. Check server environment variables and database connectivity.",
            },
        });
    }
}

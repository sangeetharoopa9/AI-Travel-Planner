import mongoose from "mongoose";
import app from "../src/app.js";
import { connectDB } from "../src/config/db.js";

const allowedOrigins = [
    process.env.CLIENT_URL,
    "https://roamwise-client.vercel.app",
    "http://localhost:5173",
]
    .filter(Boolean)
    .map((o) => o.replace(/\/$/, ""));

export default async function handler(req, res) {
    // CORS headers + preflight, handled before the database or Express
    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    if (req.method === "OPTIONS") {
        res.statusCode = 204;
        return res.end();
    }

    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }
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

import mongoose from "mongoose";
import app from "../src/app.js";
import { connectDB } from "../src/config/db.js";

export default async function handler(req, res) {
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

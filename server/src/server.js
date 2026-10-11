
import "dotenv/config";
import app from "./app.js";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";

import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
const PORT = Number(process.env.PORT) || 5000;

async function startServer() {
    try {
        await connectDB();

        const server = app.listen(PORT, () => {
            console.log(`Roamwise API running at http://localhost:${PORT}`);
            console.log(`Health check: http://localhost:${PORT}/api/health`);
        });

        async function shutdown(signal) {
            console.log(`${signal} received. Shutting down...`);

            server.close(async () => {
                try {
                    await mongoose.disconnect();
                    process.exit(0);
                } catch (error) {
                    console.error("Error while disconnecting MongoDB:", error);
                    process.exit(1);
                }
            });
        }

        process.on("SIGINT", () => shutdown("SIGINT"));
        process.on("SIGTERM", () => shutdown("SIGTERM"));
    } catch (error) {
        console.error("Failed to start Roamwise API:", error.message);
        process.exit(1);
    }
}

startServer();

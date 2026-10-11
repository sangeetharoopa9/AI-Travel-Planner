
import mongoose from "mongoose";

export async function connectDB() {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
        throw new Error("MONGODB_URI is missing from the environment variables.");
    }

    await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 10000,
    });

    console.log(`MongoDB connected: ${mongoose.connection.name}`);
}

export function getDatabaseStatus() {
    const states = {
        0: "disconnected",
        1: "connected",
        2: "connecting",
        3: "disconnecting",
    };

    return states[mongoose.connection.readyState] ?? "unknown";
}

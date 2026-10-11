import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";

export async function requireAuth(req, res, next) {
    try {
        const authorization = req.headers.authorization;

        if (!authorization?.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication required. Please log in.",
            });
        }

        const token = authorization.slice(7).trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication token is missing.",
            });
        }

        const secret = process.env.JWT_SECRET;

        if (!secret || secret === "replace_this_with_a_long_random_secret") {
            return res.status(500).json({
                success: false,
                message: "Authentication is not configured on the server.",
            });
        }

        const decoded = jwt.verify(token, secret);

        if (
            typeof decoded.sub !== "string" ||
            !mongoose.isValidObjectId(decoded.sub)
        ) {
            return res.status(401).json({
                success: false,
                message: "Invalid authentication token.",
            });
        }

        const user = await User.findById(decoded.sub);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "This account no longer exists.",
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Your account has been disabled.",
            });
        }

        req.user = user;
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({
                success: false,
                message: "Your session is invalid. Please log in again.",
            });
        }

        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({
                success: false,
                message: "Your session has expired. Please log in again.",
            });
        }

        next(error);
    }
}
import jwt from "jsonwebtoken";

export function generateToken(userId) {
    const secret = process.env.JWT_SECRET;

    if (!secret || secret === "replace_this_with_a_long_random_secret") {
        throw new Error("Configure a secure JWT_SECRET in server/.env.");
    }

    return jwt.sign(
        { sub: userId.toString() },
        secret,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "7d",
        }
    );
}
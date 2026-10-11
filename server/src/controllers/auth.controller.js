import User from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";

function sendAuthResponse(res, user, statusCode = 200) {
    const token = generateToken(user._id);

    return res.status(statusCode).json({
        success: true,
        message:
            statusCode === 201
                ? "Account created successfully."
                : "Login successful.",
        data: {
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role || "user",
                isActive: user.isActive !== false,
            },
        },
    });
}

export async function register(req, res, next) {
    try {
        const { name, email, password } = req.body;

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, email, and password are required.",
            });
        }

        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (cleanName.length < 2 || cleanName.length > 60) {
            return res.status(400).json({
                success: false,
                message: "Name must contain between 2 and 60 characters.",
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid email address.",
            });
        }

        if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
            return res.status(400).json({
                success: false,
                message:
                    "Password must be at least 8 characters and no more than 72 UTF-8 bytes.",
            });
        }

        const existingUser = await User.findOne({ email: cleanEmail });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists.",
            });
        }

        // Do not accept role or account status from the registration request.
        const user = await User.create({
            name: cleanName,
            email: cleanEmail,
            password,
        });

        return sendAuthResponse(res, user, 201);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists.",
            });
        }

        next(error);
    }
}

export async function login(req, res, next) {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required.",
            });
        }

        const user = await User.findOne({
            email: email.trim().toLowerCase(),
        }).select("+password");

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: "Your account has been disabled.",
            });
        }

        return sendAuthResponse(res, user);
    } catch (error) {
        next(error);
    }
}

export async function getCurrentUser(req, res) {
    return res.status(200).json({
        success: true,
        data: {
            user: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                role: req.user.role || "user",
                isActive: req.user.isActive !== false,
            },
        },
    });
}

import User from "../models/User.js";

const ALLOWED_BUDGETS = ["budget", "moderate", "luxury", "flexible"];
const ALLOWED_STYLES = [
    "adventure",
    "relaxation",
    "culture",
    "nature",
    "food",
    "mixed",
];
const ALLOWED_CURRENCIES = ["USD", "INR", "EUR", "GBP"];

function serializeUser(user) {
    return {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        preferences: user.preferences,
        createdAt: user.createdAt,
    };
}

export async function getSettings(req, res) {
    return res.status(200).json({
        success: true,
        data: { user: serializeUser(req.user) },
    });
}

export async function updateSettings(req, res, next) {
    try {
        const { name, preferences } = req.body;
        const user = req.user;

        if (name !== undefined) {
            if (typeof name !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Name must be text.",
                });
            }

            const cleanName = name.trim();

            if (cleanName.length < 2 || cleanName.length > 60) {
                return res.status(400).json({
                    success: false,
                    message: "Name must contain between 2 and 60 characters.",
                });
            }

            user.name = cleanName;
        }

        if (
            preferences !== undefined &&
            (!preferences || typeof preferences !== "object" ||
                Array.isArray(preferences))
        ) {
            return res.status(400).json({
                success: false,
                message: "Preferences must be a valid object.",
            });
        }

        if (preferences) {
            const current = user.preferences?.toObject
                ? user.preferences.toObject()
                : user.preferences || {};

            const nextPreferences = {
                budget: current.budget || "moderate",
                travelStyle: current.travelStyle || "mixed",
                currency: current.currency || "USD",
                notifications: {
                    dealAlerts: current.notifications?.dealAlerts ?? true,
                    tripReminders: current.notifications?.tripReminders ?? true,
                    productUpdates: current.notifications?.productUpdates ?? false,
                },
            };

            if (preferences.budget !== undefined) {
                if (!ALLOWED_BUDGETS.includes(preferences.budget)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid travel budget preference.",
                    });
                }
                nextPreferences.budget = preferences.budget;
            }

            if (preferences.travelStyle !== undefined) {
                if (!ALLOWED_STYLES.includes(preferences.travelStyle)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid travel style preference.",
                    });
                }
                nextPreferences.travelStyle = preferences.travelStyle;
            }

            if (preferences.currency !== undefined) {
                if (!ALLOWED_CURRENCIES.includes(preferences.currency)) {
                    return res.status(400).json({
                        success: false,
                        message: "Invalid currency preference.",
                    });
                }
                nextPreferences.currency = preferences.currency;
            }

            if (preferences.notifications !== undefined) {
                const notifications = preferences.notifications;

                if (
                    !notifications ||
                    typeof notifications !== "object" ||
                    Array.isArray(notifications)
                ) {
                    return res.status(400).json({
                        success: false,
                        message: "Notification preferences must be an object.",
                    });
                }

                for (const key of [
                    "dealAlerts",
                    "tripReminders",
                    "productUpdates",
                ]) {
                    if (
                        notifications[key] !== undefined &&
                        typeof notifications[key] !== "boolean"
                    ) {
                        return res.status(400).json({
                            success: false,
                            message: `${key} must be true or false.`,
                        });
                    }

                    if (notifications[key] !== undefined) {
                        nextPreferences.notifications[key] = notifications[key];
                    }
                }
            }

            user.preferences = nextPreferences;
        }

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Settings saved successfully.",
            data: { user: serializeUser(user) },
        });
    } catch (error) {
        next(error);
    }
}

export async function changePassword(req, res, next) {
    try {
        const { currentPassword, newPassword } = req.body;

        if (
            typeof currentPassword !== "string" ||
            typeof newPassword !== "string" ||
            !currentPassword ||
            !newPassword
        ) {
            return res.status(400).json({
                success: false,
                message: "Current password and new password are required.",
            });
        }

        if (
            newPassword.length < 8 ||
            Buffer.byteLength(newPassword, "utf8") > 72
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "New password must be at least 8 characters and no more than 72 UTF-8 bytes.",
            });
        }

        const user = await User.findById(req.user._id).select("+password");

        if (!user || !(await user.comparePassword(currentPassword))) {
            return res.status(400).json({
                success: false,
                message: "Your current password is incorrect.",
            });
        }

        user.password = newPassword;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password changed successfully.",
        });
    } catch (error) {
        next(error);
    }
}

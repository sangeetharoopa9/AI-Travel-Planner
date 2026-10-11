import mongoose from "mongoose";
import CatalogItem from "../models/CatalogItem.js";
import User from "../models/User.js";

const CATALOG_TYPES = [
    "destination",
    "hotel",
    "attraction",
    "transportation",
];

const EDITABLE_FIELDS = [
    "name",
    "country",
    "city",
    "category",
    "image",
    "rating",
    "price",
    "duration",
    "description",
    "tag",
    "address",
    "contact",
    "website",
    "amenities",
    "transportType",
    "isActive",
];

function validateCatalogInput(body, requireType = true) {
    if (
        requireType &&
        (typeof body.type !== "string" || !CATALOG_TYPES.includes(body.type))
    ) {
        return "Select a valid catalog type.";
    }

    if (typeof body.name !== "string" || !body.name.trim()) {
        return "Name is required.";
    }

    if (body.name.trim().length > 150) {
        return "Name cannot exceed 150 characters.";
    }

    if (
        body.rating !== undefined &&
        (!Number.isFinite(Number(body.rating)) ||
            Number(body.rating) < 0 ||
            Number(body.rating) > 5)
    ) {
        return "Rating must be between 0 and 5.";
    }

    if (
        body.price !== undefined &&
        (!Number.isFinite(Number(body.price)) || Number(body.price) < 0)
    ) {
        return "Price must be zero or greater.";
    }

    if (
        body.isActive !== undefined &&
        typeof body.isActive !== "boolean"
    ) {
        return "isActive must be true or false.";
    }

    if (
        body.amenities !== undefined &&
        (!Array.isArray(body.amenities) ||
            body.amenities.some((item) => typeof item !== "string"))
    ) {
        return "Amenities must be an array of strings.";
    }

    return null;
}

function sanitizeCatalogInput(body) {
    const clean = {};

    for (const field of EDITABLE_FIELDS) {
        if (body[field] !== undefined) {
            clean[field] = body[field];
        }
    }

    const stringFields = [
        "name",
        "country",
        "city",
        "category",
        "image",
        "duration",
        "description",
        "tag",
        "address",
        "contact",
        "website",
        "transportType",
    ];

    for (const field of stringFields) {
        if (typeof clean[field] === "string") {
            clean[field] = clean[field].trim();
        }
    }

    if (clean.rating !== undefined) {
        clean.rating = Number(clean.rating);
    }

    if (clean.price !== undefined) {
        clean.price = Number(clean.price);
    }

    if (Array.isArray(clean.amenities)) {
        clean.amenities = clean.amenities
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, 30);
    }

    return clean;
}

export async function getAdminSummary(req, res, next) {
    try {
        const [
            users,
            activeUsers,
            admins,
            destinations,
            hotels,
            attractions,
            transportation,
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ isActive: { $ne: false } }),
            User.countDocuments({ role: "admin" }),
            CatalogItem.countDocuments({ type: "destination" }),
            CatalogItem.countDocuments({ type: "hotel" }),
            CatalogItem.countDocuments({ type: "attraction" }),
            CatalogItem.countDocuments({ type: "transportation" }),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                users,
                activeUsers,
                admins,
                destinations,
                hotels,
                attractions,
                transportation,
                catalogTotal:
                    destinations + hotels + attractions + transportation,
            },
        });
    } catch (error) {
        next(error);
    }
}

export async function listCatalogItems(req, res, next) {
    try {
        const { type } = req.query;

        if (type && !CATALOG_TYPES.includes(type)) {
            return res.status(400).json({
                success: false,
                message: "Invalid catalog type.",
            });
        }

        const items = await CatalogItem.find(type ? { type } : {})
            .sort({ updatedAt: -1 })
            .select("-__v")
            .lean();

        return res.status(200).json({
            success: true,
            count: items.length,
            data: { items },
        });
    } catch (error) {
        next(error);
    }
}

export async function createCatalogItem(req, res, next) {
    try {
        const validationError = validateCatalogInput(req.body);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError,
            });
        }

        const payload = sanitizeCatalogInput(req.body);

        const item = await CatalogItem.create({
            ...payload,
            type: req.body.type,
            createdBy: req.user._id,
            updatedBy: req.user._id,
        });

        return res.status(201).json({
            success: true,
            message: "Catalog item created successfully.",
            data: { item },
        });
    } catch (error) {
        next(error);
    }
}

export async function updateCatalogItem(req, res, next) {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid catalog item ID.",
            });
        }

        const item = await CatalogItem.findById(id);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Catalog item not found.",
            });
        }

        const payload = sanitizeCatalogInput(req.body);

        // Catalog type cannot be changed through the edit endpoint.
        delete payload.type;

        const validationError = validateCatalogInput(
            { ...item.toObject(), ...payload, type: item.type },
            false
        );

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError,
            });
        }

        Object.assign(item, payload, { updatedBy: req.user._id });
        await item.save();

        return res.status(200).json({
            success: true,
            message: "Catalog item updated successfully.",
            data: { item },
        });
    } catch (error) {
        next(error);
    }
}

export async function deleteCatalogItem(req, res, next) {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid catalog item ID.",
            });
        }

        const item = await CatalogItem.findByIdAndDelete(id);

        if (!item) {
            return res.status(404).json({
                success: false,
                message: "Catalog item not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Catalog item deleted successfully.",
        });
    } catch (error) {
        next(error);
    }
}

export async function listUsers(req, res, next) {
    try {
        const users = await User.find()
            .select("name email role isActive createdAt updatedAt")
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({
            success: true,
            count: users.length,
            data: { users },
        });
    } catch (error) {
        next(error);
    }
}

export async function updateUser(req, res, next) {
    try {
        const { id } = req.params;
        const { role, isActive } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid user ID.",
            });
        }

        if (role !== undefined && !["user", "admin"].includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Role must be user or admin.",
            });
        }

        if (isActive !== undefined && typeof isActive !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "Account status must be true or false.",
            });
        }

        if (id === String(req.user._id)) {
            if (role === "user") {
                return res.status(400).json({
                    success: false,
                    message: "You cannot remove your own administrator role.",
                });
            }

            if (isActive === false) {
                return res.status(400).json({
                    success: false,
                    message: "You cannot disable your own account.",
                });
            }
        }

        const update = {};

        if (role !== undefined) update.role = role;
        if (isActive !== undefined) update.isActive = isActive;

        if (!Object.keys(update).length) {
            return res.status(400).json({
                success: false,
                message: "Provide a role or account status to update.",
            });
        }

        const user = await User.findByIdAndUpdate(id, update, {
            new: true,
            runValidators: true,
        }).select("name email role isActive createdAt updatedAt");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "User updated successfully.",
            data: { user },
        });
    } catch (error) {
        next(error);
    }
}
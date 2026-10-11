
import mongoose from "mongoose";
import Deal from "../models/Deal.js";
import CatalogItem from "../models/CatalogItem.js";

function validateDealInput(body, partial = false) {
    const requiredFields = [
        "title",
        "description",
        "destinationName",
        "originalPrice",
        "discountedPrice",
        "validUntil",
    ];

    if (!partial) {
        for (const field of requiredFields) {
            if (
                body[field] === undefined ||
                body[field] === null ||
                String(body[field]).trim() === ""
            ) {
                return `${field} is required.`;
            }
        }
    }

    for (const field of ["originalPrice", "discountedPrice"]) {
        if (body[field] !== undefined) {
            const value = Number(body[field]);

            if (!Number.isFinite(value) || value < 0) {
                return `${field} must be a valid non-negative number.`;
            }
        }
    }

    if (
        body.originalPrice !== undefined &&
        body.discountedPrice !== undefined &&
        Number(body.discountedPrice) > Number(body.originalPrice)
    ) {
        return "Discounted price cannot exceed the original price.";
    }

    if (body.validUntil !== undefined) {
        const date = new Date(body.validUntil);

        if (Number.isNaN(date.getTime())) {
            return "Enter a valid deal expiry date.";
        }
    }

    if (
        body.destination !== undefined &&
        body.destination !== null &&
        body.destination !== "" &&
        !mongoose.isValidObjectId(body.destination)
    ) {
        return "Invalid destination reference.";
    }

    for (const field of ["isActive", "isFeatured"]) {
        if (
            body[field] !== undefined &&
            typeof body[field] !== "boolean"
        ) {
            return `${field} must be true or false.`;
        }
    }

    return null;
}

async function buildDealPayload(body) {
    const payload = {};

    const stringFields = [
        "title",
        "description",
        "destinationName",
        "country",
        "category",
        "image",
        "bookingUrl",
    ];

    for (const field of stringFields) {
        if (body[field] !== undefined) {
            payload[field] =
                typeof body[field] === "string" ? body[field].trim() : "";
        }
    }

    for (const field of [
        "originalPrice",
        "discountedPrice",
    ]) {
        if (body[field] !== undefined) {
            payload[field] = Number(body[field]);
        }
    }

    for (const field of ["isActive", "isFeatured"]) {
        if (body[field] !== undefined) {
            payload[field] = body[field];
        }
    }

    if (body.validUntil !== undefined) {
        payload.validUntil = new Date(body.validUntil);
    }

    if (body.destination !== undefined) {
        if (!body.destination) {
            payload.destination = null;
        } else {
            const destination = await CatalogItem.findOne({
                _id: body.destination,
                type: "destination",
            }).select("_id name country city image");

            if (!destination) {
                const error = new Error(
                    "The selected destination does not exist."
                );
                error.statusCode = 400;
                throw error;
            }

            payload.destination = destination._id;

            if (!body.destinationName) {
                payload.destinationName = destination.name;
            }

            if (!body.country) {
                payload.country = destination.country || "";
            }

            if (!body.image) {
                payload.image = destination.image || "";
            }
        }
    }

    return payload;
}

export async function getPublicDeals(req, res, next) {
    try {
        const now = new Date();
        const { search = "", category = "all", sort = "featured" } =
            req.query;

        const filter = {
            isActive: true,
            validUntil: { $gte: now },
        };

        if (
            typeof category === "string" &&
            category.trim() &&
            category.toLowerCase() !== "all"
        ) {
            filter.category = new RegExp(
                `^${category.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
                "i"
            );
        }

        if (typeof search === "string" && search.trim()) {
            const escapedSearch = search
                .trim()
                .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

            filter.$or = [
                { title: new RegExp(escapedSearch, "i") },
                { description: new RegExp(escapedSearch, "i") },
                { destinationName: new RegExp(escapedSearch, "i") },
                { country: new RegExp(escapedSearch, "i") },
                { category: new RegExp(escapedSearch, "i") },
            ];
        }

        let sortOption = { isFeatured: -1, createdAt: -1 };

        if (sort === "discount") {
            sortOption = { discountPercentage: -1, createdAt: -1 };
        } else if (sort === "price-low") {
            sortOption = { discountedPrice: 1 };
        } else if (sort === "price-high") {
            sortOption = { discountedPrice: -1 };
        } else if (sort === "expiry") {
            sortOption = { validUntil: 1 };
        }

        const deals = await Deal.find(filter)
            .sort(sortOption)
            .select("-createdBy -updatedBy -__v")
            .lean();

        const categoryRecords = await Deal.distinct("category", {
            isActive: true,
            validUntil: { $gte: now },
        });

        return res.status(200).json({
            success: true,
            count: deals.length,
            data: {
                deals,
                categories: categoryRecords
                    .filter(Boolean)
                    .sort((a, b) => a.localeCompare(b)),
            },
        });
    } catch (error) {
        next(error);
    }
}

export async function listAdminDeals(req, res, next) {
    try {
        const deals = await Deal.find()
            .sort({ createdAt: -1 })
            .select("-__v")
            .lean();

        return res.status(200).json({
            success: true,
            count: deals.length,
            data: { deals },
        });
    } catch (error) {
        next(error);
    }
}

export async function createDeal(req, res, next) {
    try {
        const validationError = validateDealInput(req.body);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError,
            });
        }

        const payload = await buildDealPayload(req.body);

        const deal = await Deal.create({
            ...payload,
            createdBy: req.user._id,
            updatedBy: req.user._id,
        });

        return res.status(201).json({
            success: true,
            message: "Travel deal created successfully.",
            data: { deal },
        });
    } catch (error) {
        next(error);
    }
}

export async function updateDeal(req, res, next) {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid deal ID.",
            });
        }

        const deal = await Deal.findById(id);

        if (!deal) {
            return res.status(404).json({
                success: false,
                message: "Travel deal not found.",
            });
        }

        const validationError = validateDealInput(req.body, true);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError,
            });
        }

        const payload = await buildDealPayload(req.body);

        const combinedOriginal =
            payload.originalPrice ?? deal.originalPrice;
        const combinedDiscounted =
            payload.discountedPrice ?? deal.discountedPrice;

        if (combinedDiscounted > combinedOriginal) {
            return res.status(400).json({
                success: false,
                message: "Discounted price cannot exceed the original price.",
            });
        }

        Object.assign(deal, payload, {
            updatedBy: req.user._id,
        });

        await deal.save();

        return res.status(200).json({
            success: true,
            message: "Travel deal updated successfully.",
            data: { deal },
        });
    } catch (error) {
        next(error);
    }
}

export async function deleteDeal(req, res, next) {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid deal ID.",
            });
        }

        const deal = await Deal.findByIdAndDelete(id);

        if (!deal) {
            return res.status(404).json({
                success: false,
                message: "Travel deal not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Travel deal deleted successfully.",
        });
    } catch (error) {
        next(error);
    }
}

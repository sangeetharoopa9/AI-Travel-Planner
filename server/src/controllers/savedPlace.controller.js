import mongoose from "mongoose";
import CatalogItem from "../models/CatalogItem.js";
import SavedPlace from "../models/SavedPlace.js";

const DESTINATION_FIELDS =
    "name country city category image rating price duration description tag";

export async function getSavedPlaces(req, res, next) {
    try {
        const records = await SavedPlace.find({ user: req.user._id })
            .populate({
                path: "destination",
                match: { type: "destination", isActive: true },
                select: DESTINATION_FIELDS,
            })
            .sort({ createdAt: -1 })
            .lean();

        const savedPlaces = records
            .filter((record) => record.destination)
            .map((record) => ({
                _id: String(record._id),
                savedAt: record.createdAt,
                destination: record.destination,
            }));

        return res.status(200).json({
            success: true,
            count: savedPlaces.length,
            data: { savedPlaces },
        });
    } catch (error) {
        next(error);
    }
}

export async function addSavedPlace(req, res, next) {
    try {
        const { destinationId } = req.body;

        if (!mongoose.isValidObjectId(destinationId)) {
            return res.status(400).json({
                success: false,
                message: "A valid destination ID is required.",
            });
        }

        const destination = await CatalogItem.findOne({
            _id: destinationId,
            type: "destination",
            isActive: true,
        }).select("_id");

        if (!destination) {
            return res.status(404).json({
                success: false,
                message: "Destination was not found or is no longer active.",
            });
        }

        const savedPlace = await SavedPlace.findOneAndUpdate(
            { user: req.user._id, destination: destination._id },
            { $setOnInsert: { user: req.user._id, destination: destination._id } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        return res.status(200).json({
            success: true,
            message: "Destination saved successfully.",
            data: { savedPlace },
        });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(200).json({
                success: true,
                message: "Destination is already saved.",
            });
        }
        next(error);
    }
}

export async function removeSavedPlace(req, res, next) {
    try {
        const { destinationId } = req.params;

        if (!mongoose.isValidObjectId(destinationId)) {
            return res.status(400).json({
                success: false,
                message: "A valid destination ID is required.",
            });
        }

        await SavedPlace.deleteOne({
            user: req.user._id,
            destination: destinationId,
        });

        return res.status(200).json({
            success: true,
            message: "Destination removed from Saved Places.",
        });
    } catch (error) {
        next(error);
    }
}
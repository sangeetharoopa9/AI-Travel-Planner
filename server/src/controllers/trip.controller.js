import mongoose from "mongoose";
import Trip from "../models/Trip.js";
import CatalogItem from "../models/CatalogItem.js";
import { generateItinerary } from "../services/itinerary.service.js";

const ALLOWED_STYLES = [
    "Relaxation",
    "Adventure",
    "Culture",
    "Food",
    "Nature",
    "Luxury",
    "Balanced",
];

const ALLOWED_INTERESTS = [
    "Beaches",
    "Mountains",
    "Food",
    "History",
    "Culture",
    "Adventure",
    "Nature",
    "Shopping",
    "Photography",
    "Nightlife",
    "Architecture",
    "Wildlife",
];

function escapeRegex(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function createTrip(req, res, next) {
    try {
        const {
            destination,
            startDate,
            endDate,
            travelers,
            budget,
            travelStyle,
            interests,
            destinationCity,
            destinationCountry,
            hotelId,
        } = req.body;

        if (
            typeof destination !== "string" ||
            !destination.trim()
        ) {
            return res.status(400).json({
                success: false,
                message: "Enter a destination.",
            });
        }

        if (destination.trim().length > 120) {
            return res.status(400).json({
                success: false,
                message: "Destination cannot exceed 120 characters.",
            });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);

        if (
            !startDate ||
            !endDate ||
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime())
        ) {
            return res.status(400).json({
                success: false,
                message: "Select valid start and end dates.",
            });
        }

        start.setUTCHours(0, 0, 0, 0);
        end.setUTCHours(0, 0, 0, 0);

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        if (start < today) {
            return res.status(400).json({
                success: false,
                message: "The start date cannot be in the past.",
            });
        }

        if (end < start) {
            return res.status(400).json({
                success: false,
                message: "The end date must be on or after the start date.",
            });
        }

        const duration =
            Math.round((end.getTime() - start.getTime()) / 86400000) + 1;

        if (duration > 30) {
            return res.status(400).json({
                success: false,
                message: "Trips can be planned for a maximum of 30 days.",
            });
        }

        const parsedTravelers = Number(travelers);
        const parsedBudget = Number(budget);

        if (
            !Number.isInteger(parsedTravelers) ||
            parsedTravelers < 1 ||
            parsedTravelers > 20
        ) {
            return res.status(400).json({
                success: false,
                message: "Travelers must be between 1 and 20.",
            });
        }

        if (
            !Number.isFinite(parsedBudget) ||
            parsedBudget < 100 ||
            parsedBudget > 100000000
        ) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid total budget between ₹100 and ₹10 crore.",
            });
        }

        const style = ALLOWED_STYLES.includes(travelStyle)
            ? travelStyle
            : "Balanced";

        const cleanCity =
            typeof destinationCity === "string"
                ? destinationCity.trim().slice(0, 100)
                : "";

        const cleanCountry =
            typeof destinationCountry === "string"
                ? destinationCountry.trim().slice(0, 100)
                : "";

        let selectedHotel = null;

        if (hotelId) {
            if (!mongoose.isValidObjectId(hotelId)) {
                return res.status(400).json({
                    success: false,
                    message: "The selected hotel is invalid. Please choose it again.",
                });
            }

            const nights = Math.max(duration - 1, 1);
            const maxNightlyPrice = Math.floor(
                (parsedBudget * 0.35) / nights
            );

            const locationTerms = [
                ...new Set([cleanCity, destination.trim()].filter(Boolean)),
            ];

            const locationRegexes = locationTerms.map(
                (term) => new RegExp(`^${escapeRegex(term)}$`, "i")
            );

            const hotelQuery = {
                _id: hotelId,
                type: "hotel",
                isActive: true,
                price: {
                    $gt: 0,
                    $lte: maxNightlyPrice,
                },
                $or: [
                    { city: { $in: locationRegexes } },
                    { name: { $in: locationRegexes } },
                ],
            };

            if (cleanCountry) {
                hotelQuery.country = new RegExp(
                    `^${escapeRegex(cleanCountry)}$`,
                    "i"
                );
            }

            const hotelRecord = await CatalogItem.findOne(
                hotelQuery
            ).lean();

            if (!hotelRecord) {
                return res.status(400).json({
                    success: false,
                    message:
                        "The selected hotel is no longer available for this destination or budget. Please select another hotel.",
                });
            }

            selectedHotel = {
                catalogId: hotelRecord._id,
                name: hotelRecord.name,
                city: hotelRecord.city || "",
                country: hotelRecord.country || "",
                pricePerNight: Number(hotelRecord.price) || 0,
                rating: Number(hotelRecord.rating) || 0,
                image: hotelRecord.image || "",
                address: hotelRecord.address || "",
                website: hotelRecord.website || "",
                amenities: Array.isArray(hotelRecord.amenities)
                    ? hotelRecord.amenities
                    : [],
            };
        }

        const cleanInterests = Array.isArray(interests)
            ? [
                ...new Set(
                    interests.filter((item) =>
                        ALLOWED_INTERESTS.includes(item)
                    )
                ),
            ].slice(0, 8)
            : [];

        const tripInput = {
            user: req.user._id,
            destination: destination.trim(),
            destinationCity: cleanCity,
            destinationCountry: cleanCountry,
            hotel: selectedHotel,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            duration,
            travelers: parsedTravelers,
            budget: parsedBudget,
            currency: "INR",
            travelStyle: style,
            interests: cleanInterests,
        };

        const generated = await generateItinerary(tripInput);

        const trip = await Trip.create({
            ...tripInput,
            ...generated,
        });

        return res.status(201).json({
            success: true,
            message: generated.aiGenerated
                ? "Your AI itinerary has been created and saved."
                : "Your sample itinerary has been created and saved. Add a Gemini API key for AI-generated plans.",
            data: { trip },
        });
    } catch (error) {
        next(error);
    }
}

export async function getMyTrips(req, res, next) {
    try {
        const trips = await Trip.find({
            user: req.user._id,
        })
            .sort({ createdAt: -1 })
            .select("-__v");

        return res.status(200).json({
            success: true,
            count: trips.length,
            data: { trips },
        });
    } catch (error) {
        next(error);
    }
}

export async function getTripById(req, res, next) {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid trip ID.",
            });
        }

        const trip = await Trip.findOne({
            _id: id,
            user: req.user._id,
        }).select("-__v");

        if (!trip) {
            return res.status(404).json({
                success: false,
                message: "Trip not found.",
            });
        }

        return res.status(200).json({
            success: true,
            data: { trip },
        });
    } catch (error) {
        next(error);
    }
}

export async function deleteTrip(req, res, next) {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid trip ID.",
            });
        }

        const trip = await Trip.findOneAndDelete({
            _id: id,
            user: req.user._id,
        });

        if (!trip) {
            return res.status(404).json({
                success: false,
                message: "Trip not found.",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Trip deleted successfully.",
        });
    } catch (error) {
        next(error);
    }
}
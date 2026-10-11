import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
    {
        time: {
            type: String,
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        estimatedCost: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    { _id: false }
);

const selectedHotelSchema = new mongoose.Schema(
    {
        catalogId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CatalogItem",
            default: null,
        },
        name: {
            type: String,
            required: true,
            maxlength: 150,
        },
        city: {
            type: String,
            default: "",
            maxlength: 100,
        },
        country: {
            type: String,
            default: "",
            maxlength: 100,
        },
        pricePerNight: {
            type: Number,
            required: true,
            min: 0,
        },
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },
        image: {
            type: String,
            default: "",
            maxlength: 2000,
        },
        address: {
            type: String,
            default: "",
            maxlength: 300,
        },
        website: {
            type: String,
            default: "",
            maxlength: 2000,
        },
        amenities: {
            type: [String],
            default: [],
        },
    },
    { _id: false }
);

const daySchema = new mongoose.Schema(
    {
        day: {
            type: Number,
            required: true,
        },
        title: {
            type: String,
            required: true,
        },
        activities: {
            type: [activitySchema],
            default: [],
        },
    },
    { _id: false }
);

const tripSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        destination: {
            type: String,
            required: true,
            trim: true,
            maxlength: 120,
        },
        destinationCity: {
            type: String,
            default: "",
            maxlength: 100,
        },
        destinationCountry: {
            type: String,
            default: "",
            maxlength: 100,
        },
        hotel: {
            type: selectedHotelSchema,
            default: null,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        duration: {
            type: Number,
            required: true,
            min: 1,
            max: 30,
        },
        travelers: {
            type: Number,
            required: true,
            min: 1,
            max: 20,
        },
        budget: {
            type: Number,
            required: true,
            min: 1,
        },
        currency: {
            type: String,
            default: "INR",
        },
        travelStyle: {
            type: String,
            enum: [
                "Relaxation",
                "Adventure",
                "Culture",
                "Food",
                "Nature",
                "Luxury",
                "Balanced",
            ],
            default: "Balanced",
        },
        interests: {
            type: [String],
            default: [],
        },
        itinerary: {
            type: [daySchema],
            default: [],
        },
        estimatedBudget: {
            type: Number,
            default: 0,
            min: 0,
        },
        tips: {
            type: [String],
            default: [],
        },
        aiGenerated: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

tripSchema.index({ user: 1, createdAt: -1 });

const Trip = mongoose.model("Trip", tripSchema);

export default Trip;
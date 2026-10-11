import mongoose from "mongoose";

const catalogItemSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ["destination", "hotel", "attraction", "transportation"],
            required: true,
            index: true,
        },

        name: {
            type: String,
            required: [true, "Name is required."],
            trim: true,
            maxlength: 150,
        },

        country: {
            type: String,
            trim: true,
            default: "",
            maxlength: 100,
        },

        city: {
            type: String,
            trim: true,
            default: "",
            maxlength: 100,
        },

        category: {
            type: String,
            trim: true,
            default: "",
            maxlength: 80,
        },

        image: {
            type: String,
            trim: true,
            default: "",
            maxlength: 2000,
        },

        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },

        price: {
            type: Number,
            default: 0,
            min: 0,
        },

        duration: {
            type: String,
            trim: true,
            default: "",
            maxlength: 100,
        },

        description: {
            type: String,
            trim: true,
            default: "",
            maxlength: 2000,
        },

        tag: {
            type: String,
            trim: true,
            default: "",
            maxlength: 50,
        },

        address: {
            type: String,
            trim: true,
            default: "",
            maxlength: 300,
        },

        contact: {
            type: String,
            trim: true,
            default: "",
            maxlength: 100,
        },

        website: {
            type: String,
            trim: true,
            default: "",
            maxlength: 2000,
        },

        amenities: {
            type: [String],
            default: [],
        },

        transportType: {
            type: String,
            trim: true,
            default: "",
            maxlength: 80,
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

catalogItemSchema.index({ type: 1, name: 1 });
catalogItemSchema.index({ type: 1, isActive: 1 });

const CatalogItem = mongoose.model("CatalogItem", catalogItemSchema);

export default CatalogItem;
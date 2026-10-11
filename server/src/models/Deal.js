
import mongoose from "mongoose";

const dealSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Deal title is required."],
            trim: true,
            maxlength: 150,
        },
        description: {
            type: String,
            required: [true, "Deal description is required."],
            trim: true,
            maxlength: 2000,
        },
        destination: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CatalogItem",
            default: null,
        },
        destinationName: {
            type: String,
            required: [true, "Destination name is required."],
            trim: true,
            maxlength: 150,
        },
        country: {
            type: String,
            trim: true,
            default: "",
            maxlength: 100,
        },
        category: {
            type: String,
            trim: true,
            default: "General",
            maxlength: 80,
        },
        image: {
            type: String,
            trim: true,
            default: "",
            maxlength: 2000,
        },
        originalPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        discountedPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        discountPercentage: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
        },
        validUntil: {
            type: Date,
            required: [true, "Deal expiry date is required."],
        },
        bookingUrl: {
            type: String,
            trim: true,
            default: "",
            maxlength: 2000,
        },
        isFeatured: {
            type: Boolean,
            default: false,
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
    { timestamps: true }
);

dealSchema.pre("validate", function () {
    if (
        Number.isFinite(this.originalPrice) &&
        Number.isFinite(this.discountedPrice) &&
        this.originalPrice > 0
    ) {
        this.discountPercentage = Math.round(
            ((this.originalPrice - this.discountedPrice) /
                this.originalPrice) *
            100
        );
    } else if (this.originalPrice === 0) {
        this.discountPercentage = 0;
    }
});

dealSchema.index({ isActive: 1, validUntil: 1, isFeatured: -1 });

const Deal = mongoose.model("Deal", dealSchema);

export default Deal;

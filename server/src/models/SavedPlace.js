import mongoose from "mongoose";

const savedPlaceSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        destination: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CatalogItem",
            required: true,
        },
    },
    { timestamps: true }
);

savedPlaceSchema.index({ user: 1, destination: 1 }, { unique: true });

const SavedPlace = mongoose.model("SavedPlace", savedPlaceSchema);

export default SavedPlace;
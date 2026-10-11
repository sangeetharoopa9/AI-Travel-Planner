
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Name is required."],
            trim: true,
            minlength: [2, "Name must contain at least 2 characters."],
            maxlength: [60, "Name cannot exceed 60 characters."],
        },

        email: {
            type: String,
            required: [true, "Email is required."],
            unique: true,
            lowercase: true,
            trim: true,
            maxlength: 254,
            match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address."],
        },

        password: {
            type: String,
            required: [true, "Password is required."],
            minlength: [8, "Password must contain at least 8 characters."],
            select: false,
        },

        role: {
            type: String,
            enum: ["user", "admin"],
            default: "user",
            index: true,
        },

        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },

        preferences: {
            budget: {
                type: String,
                enum: ["budget", "moderate", "luxury", "flexible"],
                default: "moderate",
            },
            travelStyle: {
                type: String,
                enum: [
                    "adventure",
                    "relaxation",
                    "culture",
                    "nature",
                    "food",
                    "mixed",
                ],
                default: "mixed",
            },
            currency: {
                type: String,
                enum: ["USD", "INR", "EUR", "GBP"],
                default: "USD",
            },
            notifications: {
                dealAlerts: { type: Boolean, default: true },
                tripReminders: { type: Boolean, default: true },
                productUpdates: { type: Boolean, default: false },
            },
        },
    },
    {
        timestamps: true,
        toJSON: {
            transform(doc, ret) {
                delete ret.password;
                delete ret.__v;
                return ret;
            },
        },
    }
);

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;

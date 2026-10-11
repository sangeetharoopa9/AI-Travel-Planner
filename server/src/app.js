
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import healthRoutes from "./routes/health.routes.js";
import tripRoutes from "./routes/trip.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import catalogRoutes from "./routes/catalog.routes.js";
import savedPlaceRoutes from "./routes/savedPlace.routes.js";
import dealRoutes from "./routes/deal.routes.js";
import settingsRoutes from "./routes/settings.routes.js";

import {
  errorHandler,
  notFoundHandler,
} from "./middleware/errorHandler.js";

const app = express();

app.disable("x-powered-by");

const allowedOrigins = [
  process.env.CLIENT_URL,
  "https://roamwise-client.vercel.app",
  "http://localhost:5173",
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests without an Origin header, such as server-to-server requests.
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`CORS blocked origin: ${origin}`);
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to the Roamwise API.",
  });
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/saved-places", savedPlaceRoutes);
app.use("/api/deals", dealRoutes);
app.use("/api/settings", settingsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

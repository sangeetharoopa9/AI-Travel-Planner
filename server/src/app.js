
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

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  })
);

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

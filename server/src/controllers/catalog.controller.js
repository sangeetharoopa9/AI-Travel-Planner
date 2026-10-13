import CatalogItem from "../models/CatalogItem.js";

export async function getPublicDestinations(req, res, next) {
  try {
    const destinations = await CatalogItem.find({
      type: "destination",
      isActive: true,
    })
      .select(
        "name country city category image rating price duration description tag"
      )
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: destinations.length,
      data: { destinations },
    });
  } catch (error) {
    next(error);
  }
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function getPublicHotels(req, res, next) {
  try {
    const destination = String(req.query.destination || "").trim();
    const city = String(req.query.city || "").trim();
    const country = String(req.query.country || "").trim();
    const maxNightlyPrice = Number(req.query.maxNightlyPrice);

    if (!destination) {
      return res.status(400).json({
        success: false,
        message: "A destination is required to find hotels.",
      });
    }

    if (
      !Number.isFinite(maxNightlyPrice) ||
      maxNightlyPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid maximum nightly hotel budget is required.",
      });
    }

    const locationTerms = [
      ...new Set([city, destination].filter(Boolean)),
    ];

    const locationRegexes = locationTerms.map(
      (term) => new RegExp(`^${escapeRegex(term)}$`, "i")
    );

    const filter = {
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

    if (country) {
      filter.country = new RegExp(
        `^${escapeRegex(country)}$`,
        "i"
      );
    }

    const hotels = await CatalogItem.find(filter)
      .select(
        "name country city category image rating price description address contact website amenities"
      )
      .sort({ price: 1, rating: -1, name: 1 })
      .limit(60)
      .lean();

    return res.status(200).json({
      success: true,
      count: hotels.length,
      data: {
        hotels,
        maxNightlyPrice,
      },
    });
  } catch (error) {
    next(error);
  }
}
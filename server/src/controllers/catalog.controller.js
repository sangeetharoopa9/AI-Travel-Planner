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

// Free community-sourced hotel search using OpenStreetMap Nominatim + Overpass.
// No API key or paid billing is required. Results and details depend on OSM coverage.
function hotelFromOsm(element, destination, center) {
  const tags = element.tags || {};
  const name = String(tags.name || tags["name:en"] || "").trim();
  if (!name) return null;
  const lat = Number(element.lat ?? element.center?.lat);
  const lon = Number(element.lon ?? element.center?.lon);
  const addressParts = [
    tags["addr:housenumber"], tags["addr:street"], tags["addr:suburb"],
    tags["addr:city"], tags["addr:state"], tags["addr:postcode"], tags["addr:country"],
  ].filter(Boolean);
  const kind = tags.tourism || tags.amenity || "accommodation";
  const osmType = element.type || "node";
  const placeId = `osm-${osmType}-${element.id}`;
  const mapsUri = Number.isFinite(lat) && Number.isFinite(lon)
    ? `https://www.openstreetmap.org/${osmType}/${element.id}`
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent(name + " " + destination)}`;
  const distanceKm = Number.isFinite(lat) && Number.isFinite(lon)
    ? Math.round(Math.sqrt(Math.pow((lat - center.lat) * 111, 2) + Math.pow((lon - center.lon) * 111 * Math.cos(center.lat * Math.PI / 180), 2)) * 10) / 10
    : null;
  return {
    placeId,
    osmType,
    osmId: String(element.id),
    name: name.slice(0, 150),
    city: tags["addr:city"] || destination,
    country: tags["addr:country"] || "",
    address: addressParts.join(", ") || [tags["addr:suburb"], tags["addr:city"], tags["addr:state"]].filter(Boolean).join(", ") || destination,
    rating: 0,
    reviewCount: 0,
    category: String(kind).replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase()),
    image: tags.image || "",
    price: null,
    website: tags.website || tags["contact:website"] || "",
    mapsUri,
    phone: tags.phone || tags["contact:phone"] || "",
    amenities: [],
    distanceKm,
    source: "OpenStreetMap",
    priceAvailable: false,
  };
}

export async function searchLiveHotels(req, res, next) {
  try {
    const destination = String(req.query.destination || "").trim();
    if (!destination) return res.status(400).json({ success: false, message: "Enter a destination to find hotels." });
    if (destination.length > 120) return res.status(400).json({ success: false, message: "Destination is too long." });

    const headers = {
      "User-Agent": "RoamwiseTravelPlanner/1.0 (hotel search; contact: support@roamwise.app)",
      "Accept-Language": "en",
    };
    const geoUrl = new URL("https://nominatim.openstreetmap.org/search");
    geoUrl.searchParams.set("q", destination);
    geoUrl.searchParams.set("format", "jsonv2");
    geoUrl.searchParams.set("limit", "1");
    geoUrl.searchParams.set("addressdetails", "1");

    const geoResponse = await fetch(geoUrl, { headers, signal: AbortSignal.timeout(10000) });
    if (!geoResponse.ok) throw new Error(`Location lookup failed (${geoResponse.status}).`);
    const geoResults = await geoResponse.json();
    if (!Array.isArray(geoResults) || !geoResults.length) {
      return res.status(200).json({ success: true, count: 0, data: { hotels: [], source: "OpenStreetMap", destination, message: "We couldn't find that location. Try adding the city and country." } });
    }

    const location = geoResults[0];
    const lat = Number(location.lat);
    const lon = Number(location.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error("The location could not be resolved to coordinates.");

    // Query accommodation mapped within roughly 12 km of the destination centre.
    // A bounded radius keeps results useful and limits the Overpass query size.
    const radius = 12000;
    const query = `[out:json][timeout:20];(node["tourism"~"^(hotel|hostel|guest_house|motel|apartment|chalet|alpine_hut|camp_site)$"](around:${radius},${lat},${lon});way["tourism"~"^(hotel|hostel|guest_house|motel|apartment|chalet|alpine_hut|camp_site)$"](around:${radius},${lat},${lon});relation["tourism"~"^(hotel|hostel|guest_house|motel|apartment|chalet|alpine_hut|camp_site)$"](around:${radius},${lat},${lon});node["amenity"~"^(hotel|hostel|guest_house|motel)$"](around:${radius},${lat},${lon});way["amenity"~"^(hotel|hostel|guest_house|motel)$"](around:${radius},${lat},${lon});relation["amenity"~"^(hotel|hostel|guest_house|motel)$"](around:${radius},${lat},${lon}););out center tags 80;`;
    const endpoints = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
    let overpassResult = null;
    let lastStatus = 0;
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
          body: new URLSearchParams({ data: query }),
          signal: AbortSignal.timeout(25000),
        });
        lastStatus = response.status;
        if (response.ok) { overpassResult = await response.json(); break; }
      } catch (error) {
        if (error.name !== "TimeoutError" && error.name !== "AbortError") console.warn("Overpass endpoint unavailable:", error.message);
      }
    }
    if (!overpassResult) {
      return res.status(503).json({ success: false, message: `The free hotel data service is temporarily busy${lastStatus ? ` (HTTP ${lastStatus})` : ""}. Please try again in a moment.` });
    }

    const center = { lat, lon };
    const hotels = (Array.isArray(overpassResult.elements) ? overpassResult.elements : [])
      .map(element => hotelFromOsm(element, destination, center))
      .filter(Boolean)
      .filter((hotel, index, all) => all.findIndex(other => other.name.toLowerCase() === hotel.name.toLowerCase() && other.address === hotel.address) === index)
      .sort((a, b) => {
        const aCompleteness = Number(Boolean(a.address)) + Number(Boolean(a.website)) + Number(Boolean(a.phone)) + Number(Boolean(a.image));
        const bCompleteness = Number(Boolean(b.address)) + Number(Boolean(b.website)) + Number(Boolean(b.phone)) + Number(Boolean(b.image));
        return bCompleteness - aCompleteness || (a.distanceKm ?? 999) - (b.distanceKm ?? 999) || a.name.localeCompare(b.name);
      })
      .slice(0, 10);

    return res.status(200).json({
      success: true,
      count: hotels.length,
      data: { hotels, source: "OpenStreetMap", destination, location: { lat, lon, displayName: location.display_name || destination } },
    });
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return res.status(504).json({ success: false, message: "The free hotel search took too long. Please try again." });
    }
    if (error.message?.includes("Location lookup failed")) {
      return res.status(503).json({ success: false, message: "The free location service is temporarily unavailable. Please try again." });
    }
    next(error);
  }
}

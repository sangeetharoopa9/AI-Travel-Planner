
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

        if (!Number.isFinite(maxNightlyPrice) || maxNightlyPrice < 0) {
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



const HOTEL_CATEGORIES = [
    "accommodation.hotel",
    "accommodation.guest_house",
    "accommodation.hostel",
    "accommodation.motel",
    "accommodation.apartment",
].join(",");

const HOTEL_TIMEOUT_MS = 10000;

function makeMapsUrl(lat, lon, name, destination) {
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
        return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    }

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        `${name} ${destination}`
    )}`;
}

function normalizeGeoapifyHotel(feature, destination) {
    const properties = feature?.properties || {};
    const coordinates = feature?.geometry?.coordinates || [];

    const name = String(
        properties.name || properties.address_line1 || ""
    ).trim();

    if (!name) return null;

    const lon = Number(coordinates[0]);
    const lat = Number(coordinates[1]);

    const validCoordinates =
        Number.isFinite(lat) && Number.isFinite(lon);

    return {
        placeId:
            properties.place_id ||
            `geoapify-${validCoordinates ? `${lat}-${lon}` : name}`,
        name: name.slice(0, 150),
        city: properties.city || properties.county || destination,
        country: properties.country || "",
        address:
            properties.formatted ||
            [
                properties.address_line1,
                properties.address_line2,
            ]
                .filter(Boolean)
                .join(", ") ||
            destination,
        rating: 0,
        reviewCount: 0,
        category:
            (properties.categories || []).find((category) =>
                category.startsWith("accommodation.")
            ) || "accommodation.hotel",
        image: "",
        price: null,
        priceAvailable: false,
        website:
            properties.website ||
            properties.datasource?.raw?.website ||
            "",
        phone:
            properties.datasource?.raw?.phone ||
            properties.datasource?.raw?.["contact:phone"] ||
            "",
        mapsUri: makeMapsUrl(
            validCoordinates ? lat : NaN,
            validCoordinates ? lon : NaN,
            name,
            destination
        ),
        latitude: validCoordinates ? lat : null,
        longitude: validCoordinates ? lon : null,
        amenities: [],
        distanceKm: null,
        source: "Geoapify",
    };
}

function normalizeOsmHotel(element, destination, center) {
    const tags = element.tags || {};

    const name = String(
        tags.name || tags["name:en"] || ""
    ).trim();

    if (!name) return null;

    const lat = Number(element.lat ?? element.center?.lat);
    const lon = Number(element.lon ?? element.center?.lon);

    const validCoordinates =
        Number.isFinite(lat) && Number.isFinite(lon);

    const addressParts = [
        tags["addr:housenumber"],
        tags["addr:street"],
        tags["addr:suburb"],
        tags["addr:city"],
        tags["addr:state"],
        tags["addr:postcode"],
        tags["addr:country"],
    ].filter(Boolean);

    let distanceKm = null;

    if (validCoordinates) {
        const latitudeDistance = (lat - center.lat) * 111;
        const longitudeDistance =
            (lon - center.lon) *
            111 *
            Math.cos((center.lat * Math.PI) / 180);

        distanceKm =
            Math.round(
                Math.sqrt(
                    latitudeDistance ** 2 +
                        longitudeDistance ** 2
                ) * 10
            ) / 10;
    }

    const osmType = element.type || "node";

    return {
        placeId: `osm-${osmType}-${element.id}`,
        osmType,
        osmId: String(element.id),
        name: name.slice(0, 150),
        city: tags["addr:city"] || destination,
        country: tags["addr:country"] || "",
        address:
            addressParts.join(", ") ||
            [
                tags["addr:suburb"],
                tags["addr:city"],
                tags["addr:state"],
            ]
                .filter(Boolean)
                .join(", ") ||
            destination,
        rating: 0,
        reviewCount: 0,
        category: String(
            tags.tourism || tags.amenity || "accommodation"
        )
            .replaceAll("_", " ")
            .replace(/\b\w/g, (character) => character.toUpperCase()),
        image: tags.image || "",
        price: null,
        priceAvailable: false,
        website: tags.website || tags["contact:website"] || "",
        phone: tags.phone || tags["contact:phone"] || "",
        mapsUri: validCoordinates
            ? `https://www.openstreetmap.org/${osmType}/${element.id}`
            : `https://www.openstreetmap.org/search?query=${encodeURIComponent(
                  `${name} ${destination}`
              )}`,
        latitude: validCoordinates ? lat : null,
        longitude: validCoordinates ? lon : null,
        amenities: [],
        distanceKm,
        source: "OpenStreetMap",
    };
}

function rankHotels(hotels) {
    const uniqueHotels = hotels.filter(
        (hotel, index, all) =>
            all.findIndex(
                (other) =>
                    other.name.toLowerCase() ===
                        hotel.name.toLowerCase() &&
                    other.address === hotel.address
            ) === index
    );

    return uniqueHotels
        .sort((a, b) => {
            const completeness = (hotel) =>
                Number(Boolean(hotel.address)) +
                Number(Boolean(hotel.website)) +
                Number(Boolean(hotel.phone)) +
                Number(Boolean(hotel.image));

            return (
                completeness(b) - completeness(a) ||
                (a.distanceKm ?? Infinity) -
                    (b.distanceKm ?? Infinity) ||
                a.name.localeCompare(b.name)
            );
        })
        .slice(0, 10);
}



async function searchGeoapifyHotels(destination, apiKey) {
    const geocodeUrl = new URL(
        "https://api.geoapify.com/v1/geocode/search"
    );

    geocodeUrl.searchParams.set("text", destination);
    geocodeUrl.searchParams.set("format", "json");
    geocodeUrl.searchParams.set("limit", "1");
    geocodeUrl.searchParams.set("apiKey", apiKey);

    const geocodeResponse = await fetch(geocodeUrl, {
        signal: AbortSignal.timeout(8000),
    });

    if (!geocodeResponse.ok) {
        throw new Error(
            `Geoapify geocoding returned HTTP ${geocodeResponse.status}`
        );
    }

    const geocodeData = await geocodeResponse.json();
    const location = geocodeData.results?.[0];

    if (!location) return [];

    const lat = Number(location.lat);
    const lon = Number(location.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new Error("Geoapify returned invalid coordinates.");
    }

    const placesUrl = new URL(
        "https://api.geoapify.com/v2/places"
    );

    placesUrl.searchParams.set("categories", HOTEL_CATEGORIES);
    placesUrl.searchParams.set(
        "filter",
        `circle:${lon},${lat},20000`
    );
    placesUrl.searchParams.set(
        "bias",
        `proximity:${lon},${lat}`
    );
    placesUrl.searchParams.set("limit", "50");
    placesUrl.searchParams.set("lang", "en");
    placesUrl.searchParams.set("apiKey", apiKey);

    const placesResponse = await fetch(placesUrl, {
        signal: AbortSignal.timeout(HOTEL_TIMEOUT_MS),
    });

    if (!placesResponse.ok) {
        throw new Error(
            `Geoapify Places returned HTTP ${placesResponse.status}`
        );
    }

    const placesData = await placesResponse.json();

    return rankHotels(
        (placesData.features || [])
            .map((feature) =>
                normalizeGeoapifyHotel(feature, destination)
            )
            .filter(Boolean)
    );
}


async function searchOsmHotels(destination) {
    const headers = {
        "User-Agent": "RoamwiseTravelPlanner/1.0",
        "Accept-Language": "en",
    };

    const geocodeUrl = new URL(
        "https://nominatim.openstreetmap.org/search"
    );

    geocodeUrl.searchParams.set("q", destination);
    geocodeUrl.searchParams.set("format", "jsonv2");
    geocodeUrl.searchParams.set("limit", "1");
    geocodeUrl.searchParams.set("addressdetails", "1");

    const geocodeResponse = await fetch(geocodeUrl, {
        headers,
        signal: AbortSignal.timeout(8000),
    });

    if (!geocodeResponse.ok) {
        throw new Error(
            `OpenStreetMap geocoding returned HTTP ${geocodeResponse.status}`
        );
    }

    const locations = await geocodeResponse.json();
    const location = locations[0];

    if (!location) return [];

    const lat = Number(location.lat);
    const lon = Number(location.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new Error("OpenStreetMap returned invalid coordinates.");
    }

    const radius = 12000;

    const query = `
[out:json][timeout:20];
(
  node["tourism"~"^(hotel|hostel|guest_house|motel|apartment|chalet|alpine_hut|camp_site)$"](around:${radius},${lat},${lon});
  way["tourism"~"^(hotel|hostel|guest_house|motel|apartment|chalet|alpine_hut|camp_site)$"](around:${radius},${lat},${lon});
  relation["tourism"~"^(hotel|hostel|guest_house|motel|apartment|chalet|alpine_hut|camp_site)$"](around:${radius},${lat},${lon});
  node["amenity"~"^(hotel|hostel|guest_house|motel)$"](around:${radius},${lat},${lon});
  way["amenity"~"^(hotel|hostel|guest_house|motel)$"](around:${radius},${lat},${lon});
  relation["amenity"~"^(hotel|hostel|guest_house|motel)$"](around:${radius},${lat},${lon});
);
out center tags 80;
`;

    const endpoints = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
    ];

    let result = null;
    let lastStatus = null;

    for (const endpoint of endpoints) {
        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    ...headers,
                    "Content-Type":
                        "application/x-www-form-urlencoded;charset=UTF-8",
                },
                body: new URLSearchParams({ data: query }),
                signal: AbortSignal.timeout(15000),
            });

            lastStatus = response.status;

            if (!response.ok) continue;

            result = await response.json();
            break;
        } catch (error) {
            console.warn(
                "Overpass endpoint failed:",
                error.message
            );
        }
    }

    if (!result) {
        throw new Error(
            `All Overpass endpoints failed${
                lastStatus ? ` (HTTP ${lastStatus})` : ""
            }`
        );
    }

    const center = { lat, lon };

    return rankHotels(
        (result.elements || [])
            .map((element) =>
                normalizeOsmHotel(element, destination, center)
            )
            .filter(Boolean)
    );
}



export async function searchLiveHotels(req, res, next) {
    try {
        const destination = String(
            req.query.destination || ""
        ).trim();

        if (!destination) {
            return res.status(400).json({
                success: false,
                message: "Enter a destination to find hotels.",
            });
        }

        if (destination.length > 120) {
            return res.status(400).json({
                success: false,
                message: "Destination is too long.",
            });
        }

        if (process.env.GEOAPIFY_API_KEY) {
            try {
                const hotels = await searchGeoapifyHotels(
                    destination,
                    process.env.GEOAPIFY_API_KEY
                );

                if (hotels.length > 0) {
                    return res.status(200).json({
                        success: true,
                        count: hotels.length,
                        data: {
                            hotels,
                            source: "Geoapify",
                            destination,
                        },
                    });
                }
            } catch (error) {
                console.warn(
                    "Geoapify search failed; trying OpenStreetMap:",
                    error.message
                );
            }
        }

        try {
            const hotels = await searchOsmHotels(destination);

            return res.status(200).json({
                success: true,
                count: hotels.length,
                data: {
                    hotels,
                    source: "OpenStreetMap",
                    destination,
                },
            });
        } catch (error) {
            console.error(
                "OpenStreetMap hotel search failed:",
                error.message
            );

            return res.status(503).json({
                success: false,
                message:
                    "Hotel search is temporarily unavailable. Please try again shortly.",
            });
        }
    } catch (error) {
        next(error);
    }
}

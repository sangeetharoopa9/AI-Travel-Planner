import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ArrowRight,
    Heart,
    MapPin,
    RefreshCw,
    Search,
    Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "../services/api";
import { formatCurrency } from "../utils/currency";
import "./Explore.css";
import "./SavedPlaces.css";

const FALLBACK_IMAGE =
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=900&q=85";

function normalizeSavedPlace(record) {
    const item = record?.destination || {};

    return {
        savedRecordId: String(record?._id || ""),
        id: String(item._id || item.id || ""),
        name: item.name || "Unnamed destination",
        country: item.country || "",
        city: item.city || "",
        category: item.category || "Other",
        image: item.image || FALLBACK_IMAGE,
        rating: Number(item.rating) || 0,
        price: Number(item.price) || 0,
        duration: item.duration || "",
        description: item.description || "",
        tag: item.tag || "",
        savedAt: record?.savedAt || record?.createdAt || null,
    };
}

function SavedPlaceCard({ destination, removing, onRemove }) {
    return (
        <article className="destination-card saved-place-card">
            <div className="destination-image-wrap">
                <img
                    src={destination.image}
                    alt={`${destination.name}${destination.country ? `, ${destination.country}` : ""
                        }`}
                    className="destination-image"
                    loading="lazy"
                    onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = FALLBACK_IMAGE;
                    }}
                />

                {destination.tag && (
                    <span className="destination-tag">{destination.tag}</span>
                )}

                <button
                    type="button"
                    className="save-button is-saved"
                    onClick={() => onRemove(destination.id)}
                    disabled={removing}
                    aria-label={`Remove ${destination.name} from Saved Places`}
                    title="Remove saved place"
                >
                    <Heart size={17} fill="currentColor" />
                </button>

                <div className="image-rating">
                    <span>★</span>
                    <span>{destination.rating.toFixed(1)}</span>
                </div>
            </div>

            <div className="destination-card-body">
                <div className="destination-title-row">
                    <div>
                        <h3>{destination.name}</h3>
                        <p className="destination-country">
                            <MapPin size={12} />
                            {destination.city
                                ? `${destination.city}${destination.country ? `, ${destination.country}` : ""
                                }`
                                : destination.country || "Location not specified"}
                        </p>
                    </div>

                    <span className="destination-category">
                        {destination.category}
                    </span>
                </div>

                <p className="destination-description">
                    {destination.description ||
                        "Discover this destination with Roamwise."}
                </p>

                <div className="destination-card-footer">
                    <div className="destination-price">
                        <span>From</span>
                        <strong>
                            {formatCurrency(destination.price)}
                        </strong>
                        <small>/ person</small>
                    </div>

                    <span className="destination-duration">
                        {destination.duration}
                    </span>
                </div>

                <button
                    type="button"
                    className="saved-place-remove"
                    onClick={() => onRemove(destination.id)}
                    disabled={removing}
                >
                    <Trash2 size={15} />
                    {removing ? "Removing..." : "Remove from saved places"}
                </button>
            </div>
        </article>
    );
}

export default function SavedPlaces() {
    const [savedPlaces, setSavedPlaces] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCategory, setActiveCategory] = useState("All places");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [removingIds, setRemovingIds] = useState([]);

    const loadSavedPlaces = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await api.get("/saved-places");
            const records = response.data?.data?.savedPlaces;

            if (!Array.isArray(records)) {
                throw new Error(
                    "The Saved Places API returned an unexpected response."
                );
            }

            setSavedPlaces(
                records.map(normalizeSavedPlace).filter((place) => place.id)
            );
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                requestError.message ||
                "Unable to load your saved places. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSavedPlaces();
    }, [loadSavedPlaces]);

    const categories = useMemo(() => {
        const unique = [
            ...new Set(
                savedPlaces.map((place) => place.category).filter(Boolean)
            ),
        ];

        return [
            "All places",
            ...unique.sort((a, b) => a.localeCompare(b)),
        ];
    }, [savedPlaces]);

    const filteredPlaces = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();

        return savedPlaces.filter((place) => {
            const matchesSearch =
                !query ||
                [
                    place.name,
                    place.country,
                    place.city,
                    place.category,
                    place.description,
                ].some((value) =>
                    String(value || "").toLowerCase().includes(query)
                );

            const matchesCategory =
                activeCategory === "All places" ||
                place.category.toLowerCase() ===
                activeCategory.toLowerCase();

            return matchesSearch && matchesCategory;
        });
    }, [savedPlaces, searchTerm, activeCategory]);

    async function removePlace(destinationId) {
        if (removingIds.includes(destinationId)) return;

        setRemovingIds((current) => [...current, destinationId]);
        setError("");
        setNotice("");

        try {
            await api.delete(`/saved-places/${destinationId}`);

            setSavedPlaces((current) =>
                current.filter((place) => place.id !== destinationId)
            );

            setNotice("Destination removed from your saved places.");
        } catch (requestError) {
            setError(
                requestError.response?.data?.message ||
                "Could not remove this destination. Please try again."
            );
        } finally {
            setRemovingIds((current) =>
                current.filter((id) => id !== destinationId)
            );
        }
    }

    return (
        <main className="saved-places-page">
            <section className="saved-places-hero">
                <div className="saved-places-hero-copy">
                    <span className="saved-places-eyebrow">
                        <Heart size={13} fill="currentColor" />
                        YOUR PERSONAL COLLECTION
                    </span>

                    <h1>
                        Saved <span>Places</span>
                    </h1>

                    <p>
                        Keep the destinations that inspire you close. Your next
                        adventure might be waiting here.
                    </p>

                    <Link
                        to="/explore"
                        className="saved-places-explore-link"
                    >
                        Discover more places <ArrowRight size={16} />
                    </Link>
                </div>

                <div
                    className="saved-places-hero-art"
                    aria-hidden="true"
                >
                    <Heart size={74} strokeWidth={1.15} />
                </div>
            </section>

            <section className="saved-places-content">
                <div className="saved-places-heading-row">
                    <div>
                        <span className="saved-places-kicker">
                            YOUR WISHLIST
                        </span>

                        <h2>Places you want to explore</h2>

                        <p>
                            {savedPlaces.length}{" "}
                            {savedPlaces.length === 1
                                ? "destination"
                                : "destinations"}{" "}
                            saved
                        </p>
                    </div>

                    <button
                        type="button"
                        className="saved-places-refresh"
                        onClick={loadSavedPlaces}
                        disabled={loading}
                    >
                        <RefreshCw size={15} />
                        Refresh
                    </button>
                </div>

                <div className="saved-places-toolbar">
                    <label className="saved-places-search">
                        <Search size={17} />

                        <input
                            type="search"
                            placeholder="Search your saved places..."
                            value={searchTerm}
                            onChange={(event) =>
                                setSearchTerm(event.target.value)
                            }
                            aria-label="Search saved places"
                        />
                    </label>

                    {categories.length > 1 && (
                        <div
                            className="saved-places-categories"
                            aria-label="Filter saved places by category"
                        >
                            {categories.map((category) => (
                                <button
                                    type="button"
                                    key={category}
                                    className={
                                        activeCategory === category ? "selected" : ""
                                    }
                                    onClick={() => setActiveCategory(category)}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {error && (
                    <div
                        className="saved-places-message error"
                        role="alert"
                    >
                        {error}
                    </div>
                )}

                {notice && (
                    <div
                        className="saved-places-message success"
                        role="status"
                    >
                        {notice}
                    </div>
                )}

                {loading ? (
                    <div className="saved-places-state">
                        <div className="saved-places-spinner" />
                        <h3>Loading your collection...</h3>
                        <p>
                            Gathering the destinations you have bookmarked.
                        </p>
                    </div>
                ) : error && savedPlaces.length === 0 ? (
                    <div className="saved-places-state">
                        <Heart size={28} />
                        <h3>We couldn't load your saved places</h3>
                        <p>Check your connection and try again.</p>

                        <button
                            type="button"
                            onClick={loadSavedPlaces}
                        >
                            Try again
                        </button>
                    </div>
                ) : filteredPlaces.length > 0 ? (
                    <div className="destination-grid saved-places-grid">
                        {filteredPlaces.map((place) => (
                            <SavedPlaceCard
                                key={place.id}
                                destination={place}
                                removing={removingIds.includes(place.id)}
                                onRemove={removePlace}
                            />
                        ))}
                    </div>
                ) : savedPlaces.length === 0 ? (
                    <div className="saved-places-empty">
                        <div className="saved-places-empty-icon">
                            <Heart size={30} />
                        </div>

                        <h3>Your collection starts here</h3>

                        <p>
                            Tap the heart on any destination in Explore to save
                            it here. Your list will stay with your account.
                        </p>

                        <Link
                            to="/explore"
                            className="saved-places-empty-link"
                        >
                            Explore destinations <ArrowRight size={16} />
                        </Link>
                    </div>
                ) : (
                    <div className="saved-places-state">
                        <Search size={26} />
                        <h3>No matching destinations</h3>
                        <p>
                            Try another search or select a different category.
                        </p>

                        <button
                            type="button"
                            onClick={() => {
                                setSearchTerm("");
                                setActiveCategory("All places");
                            }}
                        >
                            Clear filters
                        </button>
                    </div>
                )}
            </section>
        </main>
    );
}
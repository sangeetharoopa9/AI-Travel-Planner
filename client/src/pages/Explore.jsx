import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronDown,
  Compass,
  Heart,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Wallet,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import "./Explore.css";

const categories = [
  "All places",
  "Beach",
  "Nature",
  "Culture",
  "Adventure",
  "City",
];

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=900&q=85";

function normalizeDestination(item) {
  return {
    id: String(item._id || item.id),
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
  };
}

function DestinationCard({
  destination,
  saved,
  saving,
  onToggleSave,
  onSelectDestination,
}) {
  return (
    <article
      className="destination-card destination-card-clickable"
      role="button"
      tabIndex={0}
      aria-label={`Plan a trip to ${destination.name}`}
      onClick={() => onSelectDestination(destination)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelectDestination(destination);
        }
      }}
    >
      <div className="destination-image-wrap">
        <img
          src={destination.image}
          alt={`${destination.name}, ${destination.country}`}
          className="destination-image"
          loading="lazy"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = FALLBACK_IMAGE;
          }}
        />

        {destination.tag && (
          <span className="destination-tag">
            {destination.tag}
          </span>
        )}

        <button
          type="button"
          className={`save-button ${saved ? "is-saved" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            onToggleSave(destination.id);
          }}
          disabled={saving}
          aria-label={
            saved ? "Remove saved destination" : "Save destination"
          }
          title={saved ? "Remove saved place" : "Save place"}
        >
          <Heart
            size={17}
            fill={saved ? "currentColor" : "none"}
          />
        </button>

        <div className="image-rating">
          <Star size={12} fill="currentColor" />
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
                ? `${destination.city}${destination.country
                  ? `, ${destination.country}`
                  : ""
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
              ${destination.price.toLocaleString("en-US")}
            </strong>

            <small>/ person</small>
          </div>

          <span className="destination-duration">
            {destination.duration}
          </span>
        </div>
      </div>
    </article>
  );
}

function Explore() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] =
    useState("All places");

  const [sortBy, setSortBy] = useState("recommended");
  const [showSortOptions, setShowSortOptions] = useState(false);

  const [savedIds, setSavedIds] = useState([]);
  const [savingIds, setSavingIds] = useState([]);
  const [saveError, setSaveError] = useState("");

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [destinations, setDestinations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDestinations() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get("/catalog/destinations");
        const items = response.data?.data?.destinations;

        if (!Array.isArray(items)) {
          throw new Error(
            "The destinations API returned an unexpected response."
          );
        }

        if (!cancelled) {
          setDestinations(items.map(normalizeDestination));
        }
      } catch (requestError) {
        if (!cancelled) {
          setDestinations([]);

          setError(
            requestError.response?.data?.message ||
            requestError.message ||
            "Unable to load destinations. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    async function loadSavedPlaces() {
      if (!isAuthenticated) {
        setSavedIds([]);
        return;
      }

      try {
        const response = await api.get("/saved-places");
        const records = response.data?.data?.savedPlaces;

        if (!Array.isArray(records)) {
          throw new Error(
            "The Saved Places API returned an unexpected response."
          );
        }

        if (!cancelled) {
          setSavedIds(
            records
              .map(
                (record) =>
                  record.destination?._id ||
                  record.destination?.id
              )
              .filter(Boolean)
              .map(String)
          );
        }
      } catch (requestError) {
        if (!cancelled) {
          setSaveError(
            requestError.response?.data?.message ||
            "Could not load your saved places. Try refreshing the page."
          );
        }
      }
    }

    loadDestinations();
    loadSavedPlaces();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const filteredDestinations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    const result = destinations.filter((destination) => {
      const matchesSearch =
        !query ||
        [
          destination.name,
          destination.country,
          destination.city,
          destination.category,
          destination.description,
        ].some((value) =>
          String(value || "").toLowerCase().includes(query)
        );

      const matchesCategory =
        activeCategory === "All places" ||
        destination.category.toLowerCase() ===
        activeCategory.toLowerCase();

      return matchesSearch && matchesCategory;
    });

    if (sortBy === "price-low") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-high") {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === "rating") {
      result.sort((a, b) => b.rating - a.rating);
    }

    return result;
  }, [destinations, searchTerm, activeCategory, sortBy]);

  async function toggleSave(id) {
    if (!isAuthenticated) {
      navigate("/login", {
        state: { from: "/explore" },
      });
      return;
    }

    if (savingIds.includes(id)) return;

    setSavingIds((current) => [...current, id]);
    setSaveError("");

    try {
      if (savedIds.includes(id)) {
        await api.delete(`/saved-places/${id}`);

        setSavedIds((current) =>
          current.filter((savedId) => savedId !== id)
        );
      } else {
        await api.post("/saved-places", {
          destinationId: id,
        });

        setSavedIds((current) =>
          current.includes(id) ? current : [...current, id]
        );
      }
    } catch (requestError) {
      setSaveError(
        requestError.response?.data?.message ||
        "Could not update Saved Places. Please try again."
      );
    } finally {
      setSavingIds((current) =>
        current.filter((savingId) => savingId !== id)
      );
    }
  }

  async function retryLoading() {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/catalog/destinations");
      const items = response.data?.data?.destinations;

      if (!Array.isArray(items)) {
        throw new Error("Unexpected destinations API response.");
      }

      setDestinations(items.map(normalizeDestination));
    } catch (requestError) {
      setDestinations([]);

      setError(
        requestError.response?.data?.message ||
        requestError.message ||
        "Unable to load destinations."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSelectDestination(destination) {
    const params = new URLSearchParams({
      destination: destination.name,
      city: destination.city || "",
      country: destination.country || "",
      destinationId: destination.id,
    });

    navigate(`/planner?${params.toString()}`);
  }

  return (
    <div className="explore-page">
      <section className="explore-hero">
        <div className="hero-background" />

        <div className="hero-content">
          <span className="hero-eyebrow">
            <Sparkles size={14} />
            YOUR NEXT CHAPTER STARTS HERE
          </span>

          <h1>
            The world is
            <br />
            <span>closer than you think.</span>
          </h1>

          <p className="hero-description">
            Find places that move you. Discover experiences you'll
            remember long after the journey ends.
          </p>

          <div className="hero-search">
            <Search size={20} />

            <input
              id="destination-search"
              type="search"
              placeholder="Where do you want to go?"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              aria-label="Search destinations"
            />

            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("destinations-section")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Explore <ArrowRight size={16} />
            </button>
          </div>

          <div className="hero-social-proof">
            <div className="avatar-stack" aria-hidden="true">
              <span>J</span>
              <span>A</span>
              <span>M</span>
              <span>S</span>
            </div>

            <p>
              <strong>12k+ travelers</strong> found their next
              adventure
            </p>
          </div>
        </div>

        <div className="hero-image-credit">
          <MapPin size={12} />
          Find your own paradise
        </div>
      </section>

      <section
        className="quick-stats"
        aria-label="Travel inspiration"
      >
        <div className="quick-stat">
          <span className="quick-stat-icon green">
            <Compass size={19} />
          </span>

          <div>
            <strong>120+</strong>
            <span>Countries to explore</span>
          </div>
        </div>

        <div className="quick-stat-divider" />

        <div className="quick-stat">
          <span className="quick-stat-icon orange">
            <Wallet size={19} />
          </span>

          <div>
            <strong>Every budget</strong>
            <span>Trips that fit your plans</span>
          </div>
        </div>

        <div className="quick-stat-divider" />

        <div className="quick-stat">
          <span className="quick-stat-icon purple">
            <Sparkles size={19} />
          </span>

          <div>
            <strong>AI-powered</strong>
            <span>Personalized trip ideas</span>
          </div>
        </div>
      </section>

      <section
        className="destinations-section"
        id="destinations-section"
      >
        <div className="section-heading">
          <div>
            <div className="section-kicker">
              <Compass size={14} />
              HANDPICKED FOR YOU
            </div>

            <h2>Places worth the journey</h2>

            <p>
              From hidden gems to iconic escapes, find your kind of
              wonder.
            </p>
          </div>

          <Link className="text-link" to="/planner">
            Plan with AI <ArrowRight size={15} />
          </Link>
        </div>

        <div className="discovery-toolbar">
          <div
            className="category-filters"
            aria-label="Filter by category"
          >
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`category-chip ${activeCategory === category ? "selected" : ""
                  }`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="sort-wrapper">
            <button
              type="button"
              className="sort-button"
              onClick={() =>
                setShowSortOptions((value) => !value)
              }
              aria-expanded={showSortOptions}
            >
              <SlidersHorizontal size={15} />
              <span>Sort</span>
              <ChevronDown size={14} />
            </button>

            {showSortOptions && (
              <div className="sort-menu">
                {[
                  ["recommended", "Recommended"],
                  ["rating", "Highest rated"],
                  ["price-low", "Price: low to high"],
                  ["price-high", "Price: high to low"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setSortBy(value);
                      setShowSortOptions(false);
                    }}
                  >
                    {label}
                    {sortBy === value && <Check size={15} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="results-summary">
          <span>
            Showing{" "}
            <strong>{filteredDestinations.length}</strong>{" "}
            destinations
          </span>

          {savedIds.length > 0 && (
            <span className="saved-count">
              <Bookmark size={13} />
              {savedIds.length} saved
            </span>
          )}
        </div>

        {saveError && (
          <div className="saved-action-error" role="alert">
            <span>{saveError}</span>

            <button
              type="button"
              onClick={() => setSaveError("")}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        {loading ? (
          <div className="empty-results">
            <Compass size={25} />
            <h3>Loading destinations...</h3>

            <p>
              Getting the latest destinations from the Roamwise
              catalog.
            </p>
          </div>
        ) : error ? (
          <div className="empty-results">
            <Search size={24} />
            <h3>Could not load destinations</h3>
            <p>{error}</p>

            <button type="button" onClick={retryLoading}>
              Try again
            </button>
          </div>
        ) : filteredDestinations.length > 0 ? (
          <div className="destination-grid">
            {filteredDestinations.map((destination) => (
              <DestinationCard
                key={destination.id}
                destination={destination}
                saved={savedIds.includes(destination.id)}
                saving={savingIds.includes(destination.id)}
                onToggleSave={toggleSave}
                onSelectDestination={handleSelectDestination}
              />
            ))}
          </div>
        ) : (
          <div className="empty-results">
            <span className="empty-results-icon">
              <Search size={24} />
            </span>

            <h3>
              {destinations.length === 0
                ? "No destinations in the catalog yet"
                : "No destinations found"}
            </h3>

            <p>
              {destinations.length === 0
                ? "Add an active destination from the Admin Panel to display it here."
                : "Try another search term or choose a different category."}
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

      <section className="ai-banner">
        <div className="ai-banner-icon">
          <Sparkles size={23} />
        </div>

        <div className="ai-banner-copy">
          <span>TRAVEL, REIMAGINED</span>

          <h2>
            Your trip. Your pace. Your kind of adventure.
          </h2>

          <p>
            Tell us your budget, dates and travel style. We'll help
            you build a trip around what matters to you.
          </p>
        </div>

        <Link to="/planner" className="ai-banner-button">
          Create my itinerary <ArrowRight size={16} />
        </Link>
      </section>

      <footer className="explore-footer">
        <span>© 2026 Roamwise</span>
        <span>Made for the curious.</span>
      </footer>
    </div>
  );
}

export default Explore;
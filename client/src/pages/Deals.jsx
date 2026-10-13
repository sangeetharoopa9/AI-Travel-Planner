import { useEffect, useMemo, useState } from "react";
import {
    ArrowDownRight,
    ArrowRight,
    CalendarDays,
    Clock3,
    Flame,
    Search,
    Sparkles,
    Tag,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { formatCurrency } from "../utils/currency";
import "./Deals.css";

const FALLBACK_IMAGE =
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1000&q=85";


function daysRemaining(value) {
    if (!value) return null;

    const expiry = new Date(value);
    const now = new Date();

    if (Number.isNaN(expiry.getTime())) return null;

    const today = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );

    const finalDay = new Date(
        expiry.getFullYear(),
        expiry.getMonth(),
        expiry.getDate()
    );

    return Math.ceil((finalDay - today) / 86400000);
}

function formatExpiry(value) {
    if (!value) return "Expiry date unavailable";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Expiry date unavailable";
    }

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function DealCard({ deal }) {
    const navigate = useNavigate();

    const remaining = daysRemaining(deal.validUntil);
    const hasDiscount = Number(deal.discountPercentage) > 0;

    const bookingUrl = String(deal.bookingUrl || "").trim();
    const safeExternalUrl = /^https?:\/\//i.test(bookingUrl);

    const handlePlanTrip = () => {
        const destination = String(deal.destinationName || "").trim();

        const params = new URLSearchParams();

        // Destination details
        if (destination) {
            params.set("destination", destination);
        }

        if (deal.country) {
            params.set("country", deal.country);
        }

        // Selected deal details
        if (deal._id) {
            params.set("dealId", deal._id);
        }

        if (deal.title) {
            params.set("dealTitle", deal.title);
        }

        if (deal.description) {
            params.set("dealDescription", deal.description);
        }

        if (deal.image) {
            params.set("dealImage", deal.image);
        }

        if (deal.category) {
            params.set("category", deal.category);
        }

        if (deal.discountedPrice != null) {
            params.set("dealPrice", String(deal.discountedPrice));

            // Use the deal's discounted price as the initial planner budget.
            params.set("budget", String(deal.discountedPrice));
        }

        if (deal.originalPrice != null) {
            params.set("originalPrice", String(deal.originalPrice));
        }

        if (deal.discountPercentage != null) {
            params.set(
                "discountPercentage",
                String(deal.discountPercentage)
            );
        }

        if (deal.validUntil) {
            params.set("validUntil", String(deal.validUntil));
        }

        navigate(`/planner?${params.toString()}`);
    };

    return (
        <article className="deal-card">
            <div className="deal-card-image-wrap">
                <img
                    className="deal-card-image"
                    src={deal.image || FALLBACK_IMAGE}
                    alt={deal.destinationName || deal.title || "Travel deal"}
                    loading="lazy"
                    onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = FALLBACK_IMAGE;
                    }}
                />

                {hasDiscount && (
                    <span className="deal-discount-badge">
                        <ArrowDownRight size={14} />
                        {deal.discountPercentage}% OFF
                    </span>
                )}

                {deal.isFeatured && (
                    <span className="deal-featured-badge">
                        <Flame size={13} />
                        Featured
                    </span>
                )}
            </div>

            <div className="deal-card-content">
                <div className="deal-card-meta">
                    <span className="deal-category">
                        <Tag size={12} />
                        {deal.category || "Travel"}
                    </span>

                    {deal.country && (
                        <span className="deal-country">
                            {deal.country}
                        </span>
                    )}
                </div>

                <h2>{deal.title}</h2>
                <h3>{deal.destinationName}</h3>

                <p className="deal-description">
                    {deal.description}
                </p>

                <div className="deal-price-row">
                    <div>
                        <strong className="deal-current-price">
                            {formatCurrency(deal.discountedPrice)}
                        </strong>

                        {hasDiscount && (
                            <span className="deal-original-price">
                                {formatCurrency(deal.originalPrice)}
                            </span>
                        )}
                    </div>

                    {hasDiscount && (
                        <span className="deal-savings">
                            Save{" "}
                            {formatCurrency(
                                Number(deal.originalPrice) -
                                Number(deal.discountedPrice)
                            )}
                        </span>
                    )}
                </div>

                <div className="deal-expiry">
                    <CalendarDays size={14} />

                    <span>
                        Valid until {formatExpiry(deal.validUntil)}
                    </span>

                    {remaining !== null &&
                        remaining >= 0 &&
                        remaining <= 7 && (
                            <span className="deal-ending-soon">
                                <Clock3 size={12} />
                                {remaining === 0
                                    ? "Last day"
                                    : `${remaining}d left`}
                            </span>
                        )}
                </div>

                <div className="deal-card-actions">
                    <button
                        type="button"
                        className="deal-card-action"
                        onClick={handlePlanTrip}
                    >
                        Plan this trip
                        <ArrowRight size={15} />
                    </button>

                    {safeExternalUrl && (
                        <a
                            className="deal-external-link"
                            href={bookingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            View original offer
                        </a>
                    )}
                </div>
            </div>
        </article>
    );
}

export default function Deals() {
    const [deals, setDeals] = useState([]);
    const [categories, setCategories] = useState([]);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("all");
    const [sort, setSort] = useState("featured");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        async function loadDeals() {
            setLoading(true);
            setError("");

            try {
                const response = await api.get("/deals", {
                    params: {
                        search,
                        category,
                        sort,
                    },
                });

                if (!active) return;

                setDeals(response.data?.data?.deals || []);
                setCategories(response.data?.data?.categories || []);
            } catch (requestError) {
                if (!active) return;

                setError(
                    requestError.response?.data?.message ||
                    "Unable to load travel deals. Please try again."
                );
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadDeals();

        return () => {
            active = false;
        };
    }, [search, category, sort]);

    const visibleDeals = useMemo(() => deals, [deals]);

    return (
        <div className="deals-page">
            <section className="deals-hero">
                <div className="deals-hero-copy">
                    <span className="deals-eyebrow">
                        <Sparkles size={14} />
                        TRAVEL MORE, SPEND SMARTER
                    </span>

                    <h1>
                        Your next escape,
                        <br />
                        <span>for a little less.</span>
                    </h1>

                    <p>
                        Explore current travel offers and discover new ways
                        to make your next journey happen.
                    </p>

                    <a className="deals-hero-link" href="#deal-list">
                        Explore deals <ArrowRight size={16} />
                    </a>
                </div>

                <div className="deals-hero-art" aria-hidden="true">
                    <Tag size={76} strokeWidth={1.2} />
                    <span className="deals-hero-spark">✦</span>
                </div>
            </section>

            <section className="deals-content" id="deal-list">
                <div className="deals-section-heading">
                    <div>
                        <span className="deals-section-kicker">
                            HANDPICKED OFFERS
                        </span>

                        <h2>Deals worth discovering</h2>

                        <p>
                            Browse offers currently available in your travel
                            collection.
                        </p>
                    </div>

                    <Link to="/planner" className="deals-plan-link">
                        <Sparkles size={15} />
                        Plan with AI
                    </Link>
                </div>

                <div className="deals-toolbar">
                    <label className="deals-search">
                        <Search size={17} />

                        <input
                            type="search"
                            placeholder="Search deals or destinations..."
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            aria-label="Search travel deals"
                        />
                    </label>

                    <label className="deals-sort">
                        <span>Sort by</span>

                        <select
                            value={sort}
                            onChange={(event) => setSort(event.target.value)}
                        >
                            <option value="featured">Featured</option>
                            <option value="discount">Biggest discount</option>
                            <option value="price-low">
                                Price: low to high
                            </option>
                            <option value="price-high">
                                Price: high to low
                            </option>
                            <option value="expiry">Expiring soon</option>
                        </select>
                    </label>
                </div>

                <div className="deals-categories">
                    {["all", ...categories].map((item) => (
                        <button
                            type="button"
                            key={item}
                            className={category === item ? "active" : ""}
                            onClick={() => setCategory(item)}
                        >
                            {item === "all" ? "All deals" : item}
                        </button>
                    ))}
                </div>

                {error && (
                    <div
                        className="deals-message deals-error"
                        role="alert"
                    >
                        <span>{error}</span>

                        <button
                            type="button"
                            onClick={() => setError("")}
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="deals-state">
                        <span className="deals-spinner" />
                        <h3>Finding current offers...</h3>
                        <p>Loading available travel deals.</p>
                    </div>
                ) : visibleDeals.length > 0 ? (
                    <>
                        <div className="deals-results-count">
                            {visibleDeals.length}{" "}
                            {visibleDeals.length === 1 ? "deal" : "deals"}{" "}
                            available
                        </div>

                        <div className="deals-grid">
                            {visibleDeals.map((deal) => (
                                <DealCard
                                    key={deal._id}
                                    deal={deal}
                                />
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="deals-state deals-empty">
                        <span className="deals-empty-icon">
                            <Tag size={27} />
                        </span>

                        <h3>No deals available right now</h3>

                        <p>
                            Try a different search or category. New offers
                            can be added by the Roamwise administrator.
                        </p>

                        <button
                            type="button"
                            onClick={() => {
                                setSearch("");
                                setCategory("all");
                                setSort("featured");
                            }}
                        >
                            Clear filters
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
}
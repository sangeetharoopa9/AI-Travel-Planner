import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    CalendarDays,
    Clock,
    MapPin,
    Users,
    IndianRupee,
    Trash2,
    ArrowRight,
    Compass,
    RefreshCw,
} from "lucide-react";
import api from "../services/api";
import "./MyTrips.css";

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function formatMoney(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(Number(amount) || 0);
}

export default function MyTrips() {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [deletingId, setDeletingId] = useState("");

    const loadTrips = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await api.get("/trips/my");
            setTrips(response.data.data.trips || []);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to load your trips. Please try again."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTrips();
    }, [loadTrips]);

    async function handleDelete(tripId) {
        const confirmed = window.confirm(
            "Are you sure you want to permanently delete this trip?"
        );

        if (!confirmed) return;

        setDeletingId(tripId);
        setError("");

        try {
            await api.delete(`/trips/${tripId}`);
            setTrips((previous) =>
                previous.filter((trip) => trip._id !== tripId)
            );
        } catch (err) {
            setError(
                err.response?.data?.message || "Unable to delete this trip."
            );
        } finally {
            setDeletingId("");
        }
    }

    return (
        <main className="my-trips-page">
            <section className="my-trips-hero">
                <div>
                    <span className="my-trips-eyebrow">YOUR TRAVEL COLLECTION</span>
                    <h1>My Trips</h1>
                    <p>
                        Every adventure you've planned, all in one place.
                        Your saved itineraries are ready whenever you are.
                    </p>
                </div>

                <div className="my-trips-hero-icon">
                    <Compass size={66} strokeWidth={1.2} />
                </div>
            </section>

            <div className="my-trips-toolbar">
                <div>
                    <h2>Your adventures</h2>
                    <p>
                        {trips.length} {trips.length === 1 ? "trip" : "trips"} saved
                    </p>
                </div>

                <div className="my-trips-actions">
                    <button
                        type="button"
                        className="my-trips-refresh"
                        onClick={loadTrips}
                        disabled={loading}
                    >
                        <RefreshCw size={15} />
                        Refresh
                    </button>

                    <Link to="/planner" className="my-trips-create">
                        Plan a trip <ArrowRight size={16} />
                    </Link>
                </div>
            </div>

            {error && (
                <div className="my-trips-error" role="alert">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="my-trips-state">
                    <div className="my-trips-spinner" />
                    <p>Loading your saved trips...</p>
                </div>
            ) : trips.length === 0 ? (
                <div className="my-trips-empty">
                    <div className="my-trips-empty-icon">
                        <MapPin size={32} />
                    </div>
                    <h3>No trips yet</h3>
                    <p>
                        Your generated itineraries will appear here automatically.
                        Start planning your next adventure.
                    </p>
                    <Link to="/planner" className="my-trips-create">
                        Create your first trip <ArrowRight size={16} />
                    </Link>
                </div>
            ) : (
                <div className="my-trips-grid">
                    {trips.map((trip) => (
                        <article className="my-trip-card" key={trip._id}>
                            <div className="my-trip-cover">
                                <div className="my-trip-cover-icon">
                                    <Compass size={39} strokeWidth={1.3} />
                                </div>

                                <span className="my-trip-style">
                                    {trip.travelStyle || "Balanced"}
                                </span>

                                <button
                                    type="button"
                                    className="my-trip-delete"
                                    aria-label={`Delete trip to ${trip.destination}`}
                                    title="Delete trip"
                                    onClick={() => handleDelete(trip._id)}
                                    disabled={deletingId === trip._id}
                                >
                                    <Trash2 size={17} />
                                </button>
                            </div>

                            <div className="my-trip-card-body">
                                <span className="my-trip-date">
                                    <CalendarDays size={14} />
                                    {formatDate(trip.startDate)} – {formatDate(trip.endDate)}
                                </span>

                                <h3>{trip.destination}</h3>

                                <div className="my-trip-meta">
                                    <span>
                                        <Clock size={14} /> {trip.duration} days
                                    </span>
                                    <span>
                                        <Users size={14} /> {trip.travelers} travelers
                                    </span>
                                </div>

                                <div className="my-trip-budget">
                                    <span>Planned budget</span>
                                    <strong>{formatMoney(trip.budget)}</strong>
                                </div>

                                <Link
                                    to={`/trips/${trip._id}`}
                                    className="my-trip-view"
                                >
                                    View itinerary <ArrowRight size={16} />
                                </Link>
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </main>
    );
}
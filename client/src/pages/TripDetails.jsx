import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
    ArrowLeft,
    CalendarDays,
    Clock,
    IndianRupee,
    MapPin,
    Users,
    Sparkles,
} from "lucide-react";
import api from "../services/api";
import "./TripDetails.css";

function money(value) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);
}

function dateLabel(value) {
    return new Date(value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export default function TripDetails() {
    const { id } = useParams();
    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        async function loadTrip() {
            setLoading(true);
            setError("");

            try {
                const response = await api.get(`/trips/${id}`);

                if (active) {
                    setTrip(response.data.data.trip);
                }
            } catch (err) {
                if (active) {
                    setError(
                        err.response?.data?.message || "Unable to load this itinerary."
                    );
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        loadTrip();

        return () => {
            active = false;
        };
    }, [id]);

    if (loading) {
        return (
            <main className="trip-details-page">
                <div className="trip-details-state">Loading your itinerary...</div>
            </main>
        );
    }

    if (error || !trip) {
        return (
            <main className="trip-details-page">
                <Link to="/trips" className="trip-details-back">
                    <ArrowLeft size={16} /> Back to My Trips
                </Link>
                <div className="trip-details-error">{error || "Trip not found."}</div>
            </main>
        );
    }

    return (
        <main className="trip-details-page">
            <Link to="/trips" className="trip-details-back">
                <ArrowLeft size={16} /> Back to My Trips
            </Link>

            <header className="trip-details-hero">
                <span className="trip-details-eyebrow">
                    <Sparkles size={14} /> YOUR TRAVEL ITINERARY
                </span>
                <h1>{trip.destination}</h1>
                <p>
                    <CalendarDays size={15} />
                    {dateLabel(trip.startDate)} – {dateLabel(trip.endDate)}
                </p>
            </header>

            <section className="trip-details-summary">
                <div>
                    <Clock size={19} />
                    <span>Duration</span>
                    <strong>{trip.duration} days</strong>
                </div>
                <div>
                    <Users size={19} />
                    <span>Travelers</span>
                    <strong>{trip.travelers}</strong>
                </div>
                <div>
                    <IndianRupee size={19} />
                    <span>Budget</span>
                    <strong>{money(trip.budget)}</strong>
                </div>
                <div>
                    <MapPin size={19} />
                    <span>Travel style</span>
                    <strong>{trip.travelStyle}</strong>
                </div>
            </section>

            <div className="trip-details-days">
                {trip.itinerary.map((day) => (
                    <article className="trip-details-day" key={day.day}>
                        <div className="trip-details-day-number">
                            <span>DAY</span>
                            <strong>{day.day}</strong>
                        </div>

                        <div className="trip-details-day-content">
                            <h2>{day.title}</h2>

                            {day.activities.map((activity, index) => (
                                <div
                                    className="trip-details-activity"
                                    key={`${day.day}-${index}`}
                                >
                                    <span className="trip-details-time">{activity.time}</span>
                                    <div>
                                        <h3>{activity.title}</h3>
                                        <p>{activity.description}</p>
                                        {activity.estimatedCost > 0 && (
                                            <span className="trip-details-cost">
                                                Approx. {money(activity.estimatedCost)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </article>
                ))}
            </div>

            {trip.tips?.length > 0 && (
                <section className="trip-details-tips">
                    <h2>Travel tips</h2>
                    <ul>
                        {trip.tips.map((tip, index) => (
                            <li key={index}>{tip}</li>
                        ))}
                    </ul>
                </section>
            )}

            <button
                type="button"
                className="trip-details-print"
                onClick={() => window.print()}
            >
                Print itinerary
            </button>
        </main>
    );
}
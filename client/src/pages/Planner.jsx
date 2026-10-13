import { useEffect, useState } from "react";

import { useSearchParams } from "react-router-dom";

import {
    ArrowDown, ArrowRight, CalendarDays, Check, Clock3, Compass, IndianRupee, MapPin, Sparkles, Users, Star, Hotel as HotelIcon, ExternalLink,

} from "lucide-react";

import api from "../services/api";

import { formatCurrency, getPreferredCurrency } from "../utils/currency";

import "./Planner.css";



const TRAVEL_STYLES = [
    "Balanced", "Relaxation", "Adventure", "Culture", "Food", "Nature", "Luxury",

];



const INTERESTS = [
    "Beaches", "Mountains", "Food", "History", "Culture", "Adventure", "Nature", "Shopping", "Photography", "Nightlife", "Architecture", "Wildlife",

];



function getLocalDate(offsetDays = 0) {

    const date = new Date();

    date.setDate(date.getDate() + offsetDays);



    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, "0");

    const day = String(date.getDate()).padStart(2, "0");



    return `${year}-${month}-${day}`;

}



function formatDate(dateString) {

    return new Date(`${dateString}T00:00:00`).toLocaleDateString(
        "en-IN",
        {
            day: "numeric",
            month: "short",
            year: "numeric",
        }
    );

}



function formatMoney(value) {

    return formatCurrency(value);

}



export default function Planner() {

    const [searchParams] = useSearchParams();



    const [selectedDestination, setSelectedDestination] = useState({
        city: searchParams.get("city") || "",
        country: searchParams.get("country") || "",
        id: searchParams.get("destinationId") || "",
    });



    const [form, setForm] = useState({
        destination: searchParams.get("destination") || "",
        startDate: getLocalDate(1),
        endDate: getLocalDate(4),
        travelers: "2",
        budget: "30000",
        travelStyle: "Balanced",
        interests: ["Culture", "Food", "Nature"],
    });



    const [trip, setTrip] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);



    const [hotels, setHotels] = useState([]);
    const [hotelLoading, setHotelLoading] = useState(false);
    const [hotelError, setHotelError] = useState("");
    const [selectedHotelId, setSelectedHotelId] = useState("");


    const duration = form.startDate && form.endDate ? Math.round((new Date(`${form.endDate}T00:00:00`) - new Date(`${form.startDate}T00:00:00`)) / 86400000) + 1 : 0;





    useEffect(() => {
        const destination = String(form.destination || "").trim();
        if (!destination) {
            setHotels([]);
            setHotelError("");
            setHotelLoading(false);
            setSelectedHotelId("");
            return;

        } let cancelled = false;
        const timer = setTimeout(async () => {
            setHotelLoading(true);
            setHotelError("");
            try {
                const response = await api.get("/catalog/hotels/search", { params: { destination }, timeout: 30000, });
                if (cancelled) return;
                const availableHotels = response.data?.data?.hotels || [];
                setHotels(availableHotels);
                setSelectedHotelId((currentId) => availableHotels.some((hotel) => String(hotel.placeId) === currentId) ? currentId : "");
            } catch (error) {
                if (cancelled) return;
                setHotels([]);
                setHotelError(error.response?.data?.message || "Hotel search is temporarily unavailable. Please try again.");

            } finally {
                if (!cancelled) setHotelLoading(false);

            }
        }, 800);
        return () => {
            cancelled = true;
            clearTimeout(timer);

        };

    }, [form.destination]);
    function updateField(event) {
        const { name, value } = event.target;
        if (name === "destination") {
            setSelectedDestination({ city: "", country: "", id: "", });
            setSelectedHotelId("");
        } setForm((previous) => ({ ...previous, [name]: value, }));
    } function toggleInterest(interest) {
        setForm((previous) => ({ ...previous, interests: previous.interests.includes(interest) ? previous.interests.filter((item) => item !== interest) : previous.interests.length < 8 ? [...previous.interests, interest] : previous.interests, }));
    } async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setTrip(null);
        if (!form.destination.trim()) {
            setError("Enter the destination you want to explore.");
            return;

        } if (duration < 1 || duration > 30) {
            setError("Choose dates for a trip lasting between 1 and 30 days.");
            return;

        } if (Number(form.budget) < 100 || Number(form.travelers) < 1) {
            setError("Enter a valid budget and traveler count.");
            return;

        } if (hotels.length > 0 && !selectedHotelId) {
            setError("Choose one of the hotels shown for your destination and budget.");
            return;

        } try {
            setLoading(true);




            const response = await api.post(
                "/trips/generate",
                {
                    destination: form.destination.trim(),
                    startDate: form.startDate,
                    endDate: form.endDate,
                    travelers: Number(form.travelers),
                    budget: Number(form.budget),
                    currency: getPreferredCurrency(),
                    travelStyle: form.travelStyle,
                    interests: form.interests,
                    destinationCity: selectedDestination.city || "",
                    destinationCountry: selectedDestination.country || "",
                    hotel:
                        hotels.find((item) => String(item.placeId) === selectedHotelId) || null,
                },
                { timeout: 90000 }
            );




            setTrip(response.data.data.trip);



            window.setTimeout(() => {
                document
                    .getElementById("planner-results")
                    ?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                    });
            }, 100);
        } catch (requestError) {
            console.error("Itinerary generation request failed:", {
                message: requestError.message,
                code: requestError.code,
                status: requestError.response?.status,
                response: requestError.response?.data,
            });

            if (requestError.response?.status === 401) {
                setError("Your session has expired. Please sign in again.");
            } else if (
                requestError.code === "ECONNABORTED" ||
                requestError.code === "ETIMEDOUT"
            ) {
                setError(
                    "Itinerary generation is taking longer than expected. Please try again."
                );
            } else if (requestError.code === "ERR_CANCELED") {
                setError("The itinerary request was cancelled. Please try again.");
            } else {
                setError(
                    requestError.response?.data?.message ||
                    "We couldn't generate your itinerary. Please try again."
                );
            }
        } finally {

            setLoading(false);

        }

    }



    return (

        <main className="planner-page">
            <section className="planner-hero">
                <div className="planner-hero-content">
                    <div className="planner-eyebrow">
                        <Sparkles size={15} />
                        YOUR PERSONAL TRAVEL ASSISTANT
                    </div>
                    <h1>
                        Your next adventure,
                        <br />
                        <span>planned beautifully.</span>
                    </h1>
                    <p>
                        Tell us where you want to go. Get a personalized itinerary
                        built around your dates, budget, and travel style.
                    </p>
                    <div className="planner-hero-points">
                        <span>
                            <Check size={15} /> Day-by-day itinerary
                        </span>
                        <span>
                            <Check size={15} /> Budget-aware planning
                        </span>
                        <span>
                            <Check size={15} /> Personalized experiences
                        </span>
                    </div>
                </div>
                <div className="planner-hero-art" aria-hidden="true">
                    <div className="planner-orbit planner-orbit-one" />
                    <div className="planner-orbit planner-orbit-two" />
                    <div className="planner-globe">
                        <Compass size={94} strokeWidth={1} />
                    </div>
                    <span className="planner-float planner-float-one">
                        ✦ Discover
                    </span>
                    <span className="planner-float planner-float-two">
                        ↗ Explore
                    </span>
                </div>
            </section>
            <section className="planner-builder">
                <div className="planner-section-heading">
                    <div>
                        <span className="planner-section-label">LET'S PLAN</span>
                        <h2>Design your trip</h2>
                        <p>
                            Give us a few details and we'll take it from there.
                        </p>
                    </div>
                    <div className="planner-step-badge">
                        <Sparkles size={15} />
                        Personalized planning
                    </div>
                </div>
                {error && (
                    <div className="planner-error" role="alert">
                        {error}
                    </div>
                )}
                <form className="planner-form" onSubmit={handleSubmit}>
                    <div className="planner-field planner-destination-field">
                        <label htmlFor="trip-destination">
                            Where do you want to go?
                        </label>
                        <div className="planner-input-with-icon">
                            <MapPin size={19} />
                            <input
                                id="trip-destination"
                                name="destination"
                                value={form.destination}
                                onChange={updateField}
                                placeholder="e.g. Bali, Japan, Swiss Alps"
                                maxLength={120}
                                required
                            />
                        </div>
                    </div>
                    {selectedDestination.city && (
                        <p className="planner-destination-context">
                            <MapPin size={14} />
                            Destination selected from Explore:{" "}
                            {selectedDestination.city}
                            {selectedDestination.country
                                ? `, ${selectedDestination.country}`
                                : ""}
                        </p>
                    )}
                    <div className="planner-form-grid">
                        <div className="planner-field">
                            <label htmlFor="trip-start">Departure date</label>
                            <div className="planner-input-with-icon">
                                <CalendarDays size={18} />
                                <input
                                    id="trip-start"
                                    type="date"
                                    name="startDate"
                                    min={getLocalDate(0)}
                                    value={form.startDate}
                                    onChange={updateField}
                                    required
                                />
                            </div>
                        </div>
                        <div className="planner-field">
                            <label htmlFor="trip-end">Return date</label>
                            <div className="planner-input-with-icon">
                                <CalendarDays size={18} />
                                <input
                                    id="trip-end"
                                    type="date"
                                    name="endDate"
                                    min={form.startDate || getLocalDate(0)}
                                    value={form.endDate}
                                    onChange={updateField}
                                    required
                                />
                            </div>
                        </div>
                        <div className="planner-field">
                            <label htmlFor="trip-travelers">Travelers</label>
                            <div className="planner-input-with-icon">
                                <Users size={18} />
                                <select
                                    id="trip-travelers"
                                    name="travelers"
                                    value={form.travelers}
                                    onChange={updateField}
                                >
                                    {Array.from(
                                        { length: 20 },
                                        (_, index) => index + 1
                                    ).map((count) => (
                                        <option key={count} value={count}>
                                            {count} {count === 1 ? "traveler" : "travelers"}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="planner-field">
                            <label htmlFor="trip-budget">
                                Total budget ({getPreferredCurrency()})
                            </label>
                            <div className="planner-input-with-icon">
                                <IndianRupee size={18} />
                                <input
                                    id="trip-budget"
                                    type="number"
                                    name="budget"
                                    min="100"
                                    max="100000000"
                                    value={form.budget}
                                    onChange={updateField}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                    <div className="planner-duration-note">
                        <Clock3 size={16} />
                        {duration > 0
                            ? `${duration} ${duration === 1 ? "day" : "days"} planned`
                            : "Choose your travel dates"}
                    </div>
                    <section
                        className="planner-hotels-section"
                        aria-labelledby="planner-hotels-title"
                    >
                        <div className="planner-hotels-heading">
                            <div className="planner-hotels-icon">
                                <HotelIcon size={20} />
                            </div>
                            <div>
                                <h3 id="planner-hotels-title">Choose your stay</h3>
                                <p>
                                    Real hotel listings for {form.destination || "your destination"}, from OpenStreetMap, prioritized by available details and proximity.
                                </p>
                            </div>
                        </div>
                        <p className="planner-hotel-budget-note">
                            These are community-mapped places from OpenStreetMap. Ratings, nightly rates and room availability may not be available; confirm details with the hotel before booking. Data © <a href="https\://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>.
                        </p>
                        {hotelLoading ? (
                            <div className="planner-hotels-state">
                                Searching real hotels for this location…
                            </div>
                        ) : hotelError ? (
                            <div className="planner-hotels-state planner-hotels-state-error">
                                {hotelError}
                            </div>
                        ) : hotels.length > 0 ? (
                            <div className="planner-hotel-grid">
                                {hotels.map((hotel) => {
                                    const hotelId = String(hotel.placeId);
                                    const isSelected = selectedHotelId === hotelId;
                                    return (
                                        <button
                                            type="button"
                                            key={hotelId}
                                            className={`planner-hotel-card ${isSelected ? "selected" : ""
                                                }`}
                                            onClick={() =>
                                                setSelectedHotelId(
                                                    isSelected ? "" : hotelId
                                                )
                                            }
                                            aria-pressed={isSelected}
                                        >
                                            <span className="planner-hotel-image-wrap">
                                                {hotel.image ? (
                                                    <img
                                                        src={hotel.image}
                                                        alt={hotel.name}
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <span className="planner-hotel-image-placeholder">
                                                        <HotelIcon size={28} />
                                                    </span>
                                                )}
                                                <span
                                                    className={`planner-hotel-radio ${isSelected ? "checked" : ""
                                                        }`}
                                                >
                                                    {isSelected && <Check size={13} />}
                                                </span>
                                            </span>
                                            <span className="planner-hotel-card-content">
                                                <span className="planner-hotel-name">
                                                    {hotel.name}
                                                </span>
                                                <span className="planner-hotel-location">
                                                    <MapPin size={13} />
                                                    {hotel.address || [hotel.city, hotel.country]
                                                        .filter(Boolean)
                                                        .join(", ") || form.destination}
                                                </span>
                                                <span className="planner-hotel-meta">
                                                    {Number(hotel.rating) > 0 && (
                                                        <span className="planner-hotel-rating">
                                                            <Star size={13} fill="currentColor" />
                                                            {Number(hotel.rating).toFixed(1)}
                                                        </span>
                                                    )}
                                                    <strong>
                                                        {hotel.priceAvailable && Number.isFinite(Number(hotel.price))
                                                            ? <>{formatMoney(hotel.price)} <small>/ night</small></>
                                                            : <small>Check rates with hotel</small>}
                                                    </strong>
                                                </span>
                                                {(hotel.category || hotel.distanceKm != null) && (
                                                    <span className="planner-hotel-amenities">
                                                        {hotel.category || "Accommodation"}{hotel.distanceKm != null ? ` · ${hotel.distanceKm} km from location centre` : ""} · OpenStreetMap
                                                    </span>
                                                )}
                                                {(hotel.website || hotel.mapsUri) && (
                                                    <span className="planner-hotel-links">
                                                        {hotel.website && <a href={hotel.website} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>Website <ExternalLink size={12} /></a>}
                                                        {hotel.mapsUri && <a href={hotel.mapsUri} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()}>View map <ExternalLink size={12} /></a>}
                                                    </span>
                                                )}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="planner-hotels-empty">
                                <HotelIcon size={23} />
                                <div>
                                    <strong>No hotels found for this location</strong>
                                    <p>Try a nearby city or include the country. OpenStreetMap coverage varies by location; if a hotel is missing, search its name separately or continue without selecting a hotel.</p>
                                </div>
                            </div>
                        )}
                        {selectedHotelId && (
                            <p className="planner-hotel-selected-note">
                                <Check size={15} />
                                Hotel selected. The AI itinerary will account for your
                                chosen stay.
                            </p>
                        )}
                    </section>
                    <div className="planner-field">
                        <label>What kind of trip do you have in mind?</label>
                        <div className="planner-style-grid">
                            {TRAVEL_STYLES.map((style) => (
                                <button
                                    key={style}
                                    type="button"
                                    className={`planner-style-option ${form.travelStyle === style ? "selected" : ""
                                        }`}
                                    onClick={() =>
                                        setForm((previous) => ({
                                            ...previous,
                                            travelStyle: style,
                                        }))
                                    }
                                    aria-pressed={form.travelStyle === style}
                                >
                                    {form.travelStyle === style && (
                                        <Check size={15} />
                                    )}
                                    {style}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="planner-field">
                        <label>What are you interested in?</label>
                        <p className="planner-field-hint">
                            Choose up to 8 experiences that you enjoy.
                        </p>
                        <div className="planner-interest-grid">
                            {INTERESTS.map((interest) => (
                                <button
                                    key={interest}
                                    type="button"
                                    className={`planner-interest ${form.interests.includes(interest)
                                        ? "selected"
                                        : ""
                                        }`}
                                    onClick={() => toggleInterest(interest)}
                                    aria-pressed={form.interests.includes(interest)}
                                >
                                    {form.interests.includes(interest) && (
                                        <Check size={14} />
                                    )}
                                    {interest}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="planner-generate-button"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span className="planner-button-spinner" />
                                Creating your itinerary...
                            </>
                        ) : (
                            <>
                                <Sparkles size={18} />
                                Generate my itinerary
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                    <p className="planner-form-footnote">
                        Your trip is saved to your account after successful
                        generation.
                    </p>
                </form>
            </section>
            {trip && (
                <section className="planner-results" id="planner-results">
                    <div className="planner-result-header">
                        <div>
                            <span className="planner-section-label">
                                {trip.aiGenerated
                                    ? "AI-GENERATED ITINERARY"
                                    : "YOUR SAMPLE ITINERARY"}
                            </span>
                            <h2>Your journey to {trip.destination}</h2>
                            <p>
                                {formatDate(trip.startDate)} –{" "}
                                {formatDate(trip.endDate)}
                            </p>
                        </div>
                        <button
                            type="button"
                            className="planner-print-button"
                            onClick={() => window.print()}
                        >
                            Print itinerary
                        </button>
                    </div>
                    {!trip.aiGenerated && (
                        <div className="planner-demo-note">
                            <Sparkles size={17} />
                            This is a sample itinerary. Add your Gemini API key for
                            personalized AI-generated recommendations.
                        </div>
                    )}
                    <div className="planner-summary-grid">
                        <div className="planner-summary-card">
                            <CalendarDays size={20} />
                            <span>Duration</span>
                            <strong>{trip.duration} days</strong>
                        </div>
                        <div className="planner-summary-card">
                            <Users size={20} />
                            <span>Travelers</span>
                            <strong>{trip.travelers}</strong>
                        </div>
                        <div className="planner-summary-card">
                            <IndianRupee size={20} />
                            <span>Trip budget</span>
                            <strong>{formatMoney(trip.budget)}</strong>
                        </div>
                        <div className="planner-summary-card">
                            <Compass size={20} />
                            <span>Travel style</span>
                            <strong>{trip.travelStyle}</strong>
                        </div>
                    </div>
                    {trip.hotel && (
                        <div className="planner-result-hotel">
                            {trip.hotel.image && (
                                <img
                                    src={trip.hotel.image}
                                    alt={trip.hotel.name}
                                />
                            )}
                            <div>
                                <span className="planner-section-label">
                                    YOUR SELECTED STAY
                                </span>
                                <h3>{trip.hotel.name}</h3>
                                <p>{trip.hotel.address || [trip.hotel.city, trip.hotel.country].filter(Boolean).join(", ") || trip.destination}</p>
                                <strong>
                                    {Number(trip.hotel.pricePerNight) > 0
                                        ? <>{formatMoney(trip.hotel.pricePerNight)} / night</>
                                        : "Rates vary — check with the hotel"}
                                </strong>
                                {(trip.hotel.website || trip.hotel.mapsUri) && (
                                    <a
                                        href={trip.hotel.website || trip.hotel.mapsUri}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        Hotel details <ExternalLink size={13} />
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                    <div className="planner-itinerary">
                        {(trip.itinerary || []).map((day) => (
                            <article className="planner-day-card" key={day.day}>
                                <div className="planner-day-marker">
                                    <span>DAY</span>
                                    <strong>{day.day}</strong>
                                </div>
                                <div className="planner-day-content">
                                    <h3>{day.title}</h3>
                                    <div className="planner-activities">
                                        {(day.activities || []).map(
                                            (activity, index) => (
                                                <div
                                                    className="planner-activity"
                                                    key={`${day.day}-${index}`}
                                                >
                                                    <div className="planner-activity-time">
                                                        {activity.time}
                                                    </div>
                                                    <div className="planner-activity-body">
                                                        <h4>{activity.title}</h4>
                                                        <p>{activity.description}</p>
                                                        {activity.estimatedCost > 0 && (
                                                            <span className="planner-activity-cost">
                                                                Approx.{" "}
                                                                {formatMoney(activity.estimatedCost)}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                    <div className="planner-tips-card">
                        <div className="planner-tips-heading">
                            <Sparkles size={20} />
                            <h3>Travel smart</h3>
                        </div>
                        <ul>
                            {(trip.tips || []).map((tip, index) => (
                                <li key={index}>{tip}</li>
                            ))}
                            <li>
                                Confirm transportation, entry requirements, and
                                current attraction details before you travel.
                            </li>
                        </ul>
                    </div>
                    <button
                        type="button"
                        className="planner-back-to-form"
                        onClick={() => {
                            setTrip(null);
                            document
                                .querySelector(".planner-builder")
                                ?.scrollIntoView({ behavior: "smooth" });
                        }}
                    >
                        <ArrowDown size={16} />
                        Plan another trip
                    </button>
                </section>
            )}
        </main>
    );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    ArrowDown,
    ArrowRight,
    Clock3,
    Cloud,
    CloudRain,
    CloudSun,
    Droplets,
    ExternalLink,
    LoaderCircle,
    MapPin,
    Navigation,
    RefreshCw,
    Route,
    Search,
    Sun,
    Wind,
} from "lucide-react";
import "./MapsWeather.css";

const DEFAULT_LOCATION = {
    name: "Nagercoil",
    displayName: "Nagercoil, Tamil Nadu, India",
    lat: 8.1833,
    lon: 77.4119,
};

const TYPICAL_YEARS = 5;

const WEATHER_CODES = {
    0: { label: "Clear sky", icon: Sun },
    1: { label: "Mainly clear", icon: Sun },
    2: { label: "Partly cloudy", icon: CloudSun },
    3: { label: "Overcast", icon: Cloud },
    45: { label: "Fog", icon: Cloud },
    48: { label: "Depositing rime fog", icon: Cloud },
    51: { label: "Light drizzle", icon: CloudRain },
    53: { label: "Moderate drizzle", icon: CloudRain },
    55: { label: "Dense drizzle", icon: CloudRain },
    61: { label: "Slight rain", icon: CloudRain },
    63: { label: "Moderate rain", icon: CloudRain },
    65: { label: "Heavy rain", icon: CloudRain },
    71: { label: "Slight snowfall", icon: Cloud },
    73: { label: "Moderate snowfall", icon: Cloud },
    75: { label: "Heavy snowfall", icon: Cloud },
    80: { label: "Rain showers", icon: CloudRain },
    81: { label: "Moderate rain showers", icon: CloudRain },
    82: { label: "Violent rain showers", icon: CloudRain },
    95: { label: "Thunderstorm", icon: CloudRain },
    96: { label: "Thunderstorm with hail", icon: CloudRain },
    99: { label: "Heavy thunderstorm with hail", icon: CloudRain },
};

const SOURCE_LABELS = {
    forecast: "Forecast",
    historical: "Actual",
    typical: "Typical",
};

function getWeatherInfo(code) {
    return WEATHER_CODES[code] || {
        label: "Conditions unavailable",
        icon: CloudSun,
    };
}

function dateToISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function addDays(dateString, amount) {
    const date = new Date(`${dateString}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + amount);
    return date.toISOString().slice(0, 10);
}

function shiftYears(dateString, years) {
    const [year, month, day] = dateString.split("-").map(Number);
    const date = new Date(Date.UTC(year + years, month - 1, day, 12));
    // Feb 29 in a non-leap year rolls into March, so step back to Feb 28.
    if (date.getUTCMonth() !== month - 1) date.setUTCDate(0);
    return date.toISOString().slice(0, 10);
}

function formatDay(dateString) {
    return new Intl.DateTimeFormat("en", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "UTC",
    }).format(new Date(`${dateString}T12:00:00Z`));
}

function formatWeekRange(startDate) {
    return `${formatDay(startDate)} – ${formatDay(addDays(startDate, 6))}`;
}

function getMonday(dateString) {
    const date = new Date(`${dateString}T12:00:00Z`);
    const weekday = date.getUTCDay();
    date.setUTCDate(date.getUTCDate() - ((weekday + 6) % 7));
    return date.toISOString().slice(0, 10);
}

function formatDistance(meters) {
    if (!Number.isFinite(meters)) return "—";
    return meters >= 1000
        ? `${(meters / 1000).toFixed(1)} km`
        : `${Math.round(meters)} m`;
}

function formatDuration(seconds) {
    if (!Number.isFinite(seconds)) return "—";

    const minutes = Math.round(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) return `${minutes} min`;
    if (remainingMinutes === 0) return `${hours} hr`;
    return `${hours} hr ${remainingMinutes} min`;
}

async function searchLocation(query) {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Location search is temporarily unavailable.");
    }

    const results = await response.json();
    if (!results.length) {
        throw new Error("Location not found. Try a city, landmark, or address.");
    }

    const place = results[0];

    return {
        name: place.name || query,
        displayName: place.display_name,
        lat: Number(place.lat),
        lon: Number(place.lon),
    };
}

async function fetchForecast(lat, lon) {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set(
        "current",
        [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "precipitation",
            "weather_code",
            "wind_speed_10m",
        ].join(",")
    );
    url.searchParams.set(
        "daily",
        [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_probability_max",
        ].join(",")
    );
    url.searchParams.set("past_days", "7");
    url.searchParams.set("forecast_days", "16");
    url.searchParams.set("timezone", "auto");

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Weather data is temporarily unavailable.");
    }

    return response.json();
}

async function fetchHistoricalWeather(lat, lon, startDate, endDate) {
    const url = new URL("https://archive-api.open-meteo.com/v1/archive");
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("start_date", startDate);
    url.searchParams.set("end_date", endDate);
    url.searchParams.set(
        "daily",
        [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_sum",
        ].join(",")
    );
    url.searchParams.set("timezone", "auto");

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error("Historical weather data is unavailable.");
    }

    return response.json();
}

// Builds "typical" weather for a week beyond the forecast window by
// averaging the same calendar dates over the last few complete years.
async function fetchTypicalWeek(lat, lon, weekStart, todayDate) {
    const weekEnd = addDays(weekStart, 6);
    const startYear = Number(weekStart.slice(0, 4));
    const latestYear = Number(todayDate.slice(0, 4)) - 1;

    const settled = await Promise.allSettled(
        Array.from({ length: TYPICAL_YEARS }, (_, step) => {
            const offset = latestYear - step - startYear;
            return fetchHistoricalWeather(
                lat,
                lon,
                shiftYears(weekStart, offset),
                shiftYears(weekEnd, offset)
            );
        })
    );

    const samples = settled
        .filter((item) => item.status === "fulfilled" && item.value?.daily?.time?.length)
        .map((item) => item.value.daily);

    if (!samples.length) {
        throw new Error("Typical weather data is unavailable for this week.");
    }

    const pick = (field, index) => samples.map((sample) => sample[field]?.[index]);

    const average = (values) => {
        const numbers = values.filter(Number.isFinite);
        return numbers.length
            ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length
            : null;
    };

    const mostCommon = (values) => {
        const counts = new Map();
        values.filter(Number.isFinite).forEach((value) => {
            counts.set(value, (counts.get(value) || 0) + 1);
        });
        let best = null;
        let bestCount = 0;
        counts.forEach((count, value) => {
            if (count > bestCount) {
                best = value;
                bestCount = count;
            }
        });
        return best;
    };

    const rainyShare = (values) => {
        const numbers = values.filter(Number.isFinite);
        if (!numbers.length) return null;
        const rainyDays = numbers.filter((value) => value >= 1).length;
        return Math.round((rainyDays / numbers.length) * 100);
    };

    const indexes = Array.from({ length: 7 }, (_, index) => index);

    return {
        weather_code: indexes.map((index) => mostCommon(pick("weather_code", index))),
        temperature_2m_max: indexes.map((index) => average(pick("temperature_2m_max", index))),
        temperature_2m_min: indexes.map((index) => average(pick("temperature_2m_min", index))),
        precipitation_sum: indexes.map((index) => average(pick("precipitation_sum", index))),
        precipitation_probability_max: indexes.map((index) =>
            rainyShare(pick("precipitation_sum", index))
        ),
    };
}

function WeatherMetric({ icon: Icon, label, value }) {
    return (
        <div className="mw-metric">
            <span className="mw-metric-icon">
                <Icon size={17} />
            </span>
            <span className="mw-metric-label">{label}</span>
            <strong>{value}</strong>
        </div>
    );
}

function MapsWeather() {
    const [location, setLocation] = useState(DEFAULT_LOCATION);
    const [locationQuery, setLocationQuery] = useState("");
    const [weather, setWeather] = useState(null);
    const [weatherLoading, setWeatherLoading] = useState(true);
    const [locationLoading, setLocationLoading] = useState(false);
    const [error, setError] = useState("");

    const [selectedWeekStart, setSelectedWeekStart] = useState(
        () => getMonday(dateToISO(new Date()))
    );
    const [selectedWeekData, setSelectedWeekData] = useState(null);
    const [weekLoading, setWeekLoading] = useState(false);
    const [weekError, setWeekError] = useState("");

    const [startQuery, setStartQuery] = useState("");
    const [endQuery, setEndQuery] = useState("");
    const [routeStart, setRouteStart] = useState(null);
    const [routeEnd, setRouteEnd] = useState(null);
    const [routeResult, setRouteResult] = useState(null);
    const [routeLoading, setRouteLoading] = useState(false);
    const [routeError, setRouteError] = useState("");

    const today = dateToISO(new Date());

    const loadWeather = useCallback(async (selectedLocation) => {
        setWeatherLoading(true);
        setError("");

        try {
            const result = await fetchForecast(
                selectedLocation.lat,
                selectedLocation.lon
            );
            setWeather(result);
        } catch (loadError) {
            setWeather(null);
            setError(loadError.message || "Unable to load weather.");
        } finally {
            setWeatherLoading(false);
        }
    }, []);

    useEffect(() => {
        loadWeather(location);
    }, [location, loadWeather]);

    const weekDates = useMemo(
        () => Array.from({ length: 7 }, (_, index) =>
            addDays(selectedWeekStart, index)
        ),
        [selectedWeekStart]
    );

    useEffect(() => {
        let cancelled = false;

        async function loadSelectedWeek() {
            setWeekLoading(true);
            setWeekError("");
            setSelectedWeekData(null);

            try {
                const forecast = weather?.daily;
                const forecastDates = forecast?.time || [];

                const missingDates = weekDates.filter(
                    (date) => !forecastDates.includes(date)
                );
                const pastMissing = missingDates.filter((date) => date < today);
                const futureMissing = missingDates.filter((date) => date >= today);

                const [historical, typical] = await Promise.all([
                    pastMissing.length
                        ? fetchHistoricalWeather(
                            location.lat,
                            location.lon,
                            pastMissing[0],
                            pastMissing[pastMissing.length - 1]
                        )
                        : null,
                    futureMissing.length
                        ? fetchTypicalWeek(
                            location.lat,
                            location.lon,
                            selectedWeekStart,
                            today
                        )
                        : null,
                ]);

                const daily = {
                    time: weekDates,
                    weather_code: [],
                    temperature_2m_max: [],
                    temperature_2m_min: [],
                    precipitation_probability_max: [],
                    precipitation_sum: [],
                    sources: [],
                };

                weekDates.forEach((date, index) => {
                    const forecastIndex = forecastDates.indexOf(date);

                    if (forecastIndex >= 0) {
                        daily.weather_code.push(forecast.weather_code?.[forecastIndex]);
                        daily.temperature_2m_max.push(forecast.temperature_2m_max?.[forecastIndex]);
                        daily.temperature_2m_min.push(forecast.temperature_2m_min?.[forecastIndex]);
                        daily.precipitation_probability_max.push(
                            forecast.precipitation_probability_max?.[forecastIndex]
                        );
                        daily.precipitation_sum.push(null);
                        daily.sources.push("forecast");
                        return;
                    }

                    if (date < today) {
                        const archive = historical?.daily;
                        const archiveIndex = archive?.time?.indexOf(date) ?? -1;
                        daily.weather_code.push(archive?.weather_code?.[archiveIndex]);
                        daily.temperature_2m_max.push(archive?.temperature_2m_max?.[archiveIndex]);
                        daily.temperature_2m_min.push(archive?.temperature_2m_min?.[archiveIndex]);
                        daily.precipitation_probability_max.push(null);
                        daily.precipitation_sum.push(archive?.precipitation_sum?.[archiveIndex]);
                        daily.sources.push("historical");
                        return;
                    }

                    daily.weather_code.push(typical?.weather_code?.[index]);
                    daily.temperature_2m_max.push(typical?.temperature_2m_max?.[index]);
                    daily.temperature_2m_min.push(typical?.temperature_2m_min?.[index]);
                    daily.precipitation_probability_max.push(
                        typical?.precipitation_probability_max?.[index]
                    );
                    daily.precipitation_sum.push(typical?.precipitation_sum?.[index]);
                    daily.sources.push("typical");
                });

                const uniqueSources = [...new Set(daily.sources)];
                const source = uniqueSources.length === 1 ? uniqueSources[0] : "mixed";
                const labels = {
                    forecast: "Forecast",
                    historical: "Historical weather",
                    typical: "Typical weather",
                    mixed: "Mixed sources",
                };

                if (!cancelled) {
                    setSelectedWeekData({
                        daily,
                        source,
                        label: labels[source],
                    });
                }
            } catch (loadError) {
                if (!cancelled) {
                    setWeekError(
                        loadError.message ||
                        "Unable to load weather for this week."
                    );
                }
            } finally {
                if (!cancelled) setWeekLoading(false);
            }
        }

        // Wait until the current forecast has loaded before classifying the week.
        if (weather || error) {
            loadSelectedWeek();
        }

        return () => {
            cancelled = true;
        };
    }, [selectedWeekStart, weekDates, weather, location, today, error]);

    async function handleLocationSearch(event) {
        event.preventDefault();
        const query = locationQuery.trim();

        if (!query || locationLoading) return;

        setLocationLoading(true);
        setError("");

        try {
            const result = await searchLocation(query);
            setLocation(result);
            setLocationQuery("");
        } catch (searchError) {
            setError(searchError.message || "Unable to find that location.");
        } finally {
            setLocationLoading(false);
        }
    }

    async function handleUseMyLocation() {
        setError("");

        if (!navigator.geolocation) {
            setError("Your browser does not support location access.");
            return;
        }

        setLocationLoading(true);

        navigator.geolocation.getCurrentPosition(
            async ({ coords }) => {
                const { latitude, longitude } = coords;

                try {
                    const url = new URL(
                        "https://nominatim.openstreetmap.org/reverse"
                    );
                    url.searchParams.set("lat", String(latitude));
                    url.searchParams.set("lon", String(longitude));
                    url.searchParams.set("format", "jsonv2");

                    const response = await fetch(url);
                    const result = response.ok ? await response.json() : null;

                    setLocation({
                        name: result?.name || "Your location",
                        displayName:
                            result?.display_name || "Current browser location",
                        lat: latitude,
                        lon: longitude,
                    });
                } catch {
                    setLocation({
                        name: "Your location",
                        displayName: "Current browser location",
                        lat: latitude,
                        lon: longitude,
                    });
                } finally {
                    setLocationLoading(false);
                }
            },
            (geoError) => {
                setLocationLoading(false);
                setError(
                    geoError.code === 1
                        ? "Location permission was denied. You can search manually."
                        : "Unable to get your location. Please search manually."
                );
            },
            { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
        );
    }

    async function handleRouteSearch(event) {
        event.preventDefault();

        if (!startQuery.trim() || !endQuery.trim() || routeLoading) {
            setRouteError("Enter both a starting point and a destination.");
            return;
        }

        setRouteLoading(true);
        setRouteError("");
        setRouteResult(null);
        setRouteStart(null);
        setRouteEnd(null);

        try {
            const [start, end] = await Promise.all([
                searchLocation(startQuery.trim()),
                searchLocation(endQuery.trim()),
            ]);

            const url =
                `https://router.project-osrm.org/route/v1/driving/` +
                `${start.lon},${start.lat};${end.lon},${end.lat}`;

            const response = await fetch(
                `${url}?overview=false&steps=false`
            );
            if (!response.ok) {
                throw new Error("The route service is temporarily unavailable.");
            }

            const data = await response.json();
            if (data.code !== "Ok" || !data.routes?.length) {
                throw new Error("No driving route was found between these locations.");
            }

            setRouteStart(start);
            setRouteEnd(end);
            setRouteResult(data.routes[0]);
        } catch (routeSearchError) {
            setRouteError(
                routeSearchError.message || "Unable to calculate the route."
            );
        } finally {
            setRouteLoading(false);
        }
    }

    const current = weather?.current;
    const currentWeather = getWeatherInfo(current?.weather_code);
    const CurrentWeatherIcon = currentWeather.icon;

    const mapEmbedUrl =
        `https://www.openstreetmap.org/export/embed.html?bbox=` +
        `${location.lon - 0.12}%2C${location.lat - 0.08}%2C` +
        `${location.lon + 0.12}%2C${location.lat + 0.08}` +
        `&layer=mapnik&marker=${location.lat}%2C${location.lon}`;

    const routeDirectionsUrl =
        routeStart && routeEnd
            ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
                routeStart.displayName
            )}&destination=${encodeURIComponent(
                routeEnd.displayName
            )}&travelmode=driving`
            : "";

    function shiftWeek(days) {
        setSelectedWeekStart((currentStart) => addDays(currentStart, days));
    }

    function getDataLabelSuffix(source) {
        if (source === "historical") {
            return " · Actual historical observations, not a forecast";
        }
        if (source === "typical") {
            return ` · Average of the same dates over the last ${TYPICAL_YEARS} years, not a forecast`;
        }
        if (source === "mixed") {
            return " · Each day is tagged with its data source";
        }
        return " · Forecast data";
    }

    function getDataSourceNote(source) {
        if (source === "historical") {
            return "Historical data from Open-Meteo Archive API. Past conditions do not predict future weather.";
        }
        if (source === "typical") {
            return `Typical conditions are averaged from the same dates over the last ${TYPICAL_YEARS} years (Open-Meteo Archive API). Rain % is the share of those years with at least 1 mm of rain. Day-by-day forecasts are only available about 16 days ahead.`;
        }
        if (source === "mixed") {
            return "Forecast days come from Open-Meteo's forecast. Other days show typical or actual conditions for those dates, as tagged.";
        }
        return "Forecast data by Open-Meteo. Forecast availability is limited to the provider's forecast window.";
    }

    return (
        <div className="mw-page">
            <header className="mw-page-header">
                <div>
                    <p className="mw-eyebrow">EXPLORE WITH CONFIDENCE</p>
                    <h1>Maps &amp; Weather</h1>
                    <p className="mw-page-subtitle">
                        Discover places, check the forecast, and plan your route.
                    </p>
                </div>

                <button
                    type="button"
                    className="mw-secondary-button"
                    onClick={() => loadWeather(location)}
                    disabled={weatherLoading}
                >
                    {weatherLoading ? (
                        <LoaderCircle size={16} className="mw-spin" />
                    ) : (
                        <RefreshCw size={16} />
                    )}
                    Refresh weather
                </button>
            </header>

            <form className="mw-search-bar" onSubmit={handleLocationSearch}>
                <Search size={19} />
                <input
                    value={locationQuery}
                    onChange={(event) => setLocationQuery(event.target.value)}
                    placeholder="Search a city, country, or landmark..."
                    aria-label="Search for a location"
                />
                <button
                    type="submit"
                    disabled={locationLoading || !locationQuery.trim()}
                >
                    {locationLoading ? (
                        <LoaderCircle size={17} className="mw-spin" />
                    ) : (
                        <Search size={17} />
                    )}
                    Search
                </button>
                <button
                    type="button"
                    className="mw-location-button"
                    onClick={handleUseMyLocation}
                    disabled={locationLoading}
                >
                    <Navigation size={16} />
                    <span>My location</span>
                </button>
            </form>

            {error && (
                <div className="mw-alert" role="alert">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={() => setError("")}
                        aria-label="Dismiss error"
                    >
                        ×
                    </button>
                </div>
            )}

            <section className="mw-overview-grid">
                <article className="mw-weather-card">
                    <div className="mw-weather-top">
                        <div>
                            <span className="mw-card-kicker">CURRENT WEATHER</span>
                            <h2>{location.name}</h2>
                            <p>{location.displayName}</p>
                        </div>
                        <span className="mw-weather-icon">
                            <CurrentWeatherIcon size={39} strokeWidth={1.5} />
                        </span>
                    </div>

                    {weatherLoading ? (
                        <div className="mw-loading">
                            <LoaderCircle className="mw-spin" size={25} />
                            <span>Loading weather...</span>
                        </div>
                    ) : current ? (
                        <>
                            <div className="mw-temperature-row">
                                <strong>{Math.round(current.temperature_2m)}°</strong>
                                <div>
                                    <b>{currentWeather.label}</b>
                                    <span>
                                        Feels like {Math.round(current.apparent_temperature)}°
                                    </span>
                                </div>
                            </div>

                            <div className="mw-metrics">
                                <WeatherMetric
                                    icon={Droplets}
                                    label="Humidity"
                                    value={`${current.relative_humidity_2m}%`}
                                />
                                <WeatherMetric
                                    icon={Wind}
                                    label="Wind"
                                    value={`${Math.round(current.wind_speed_10m)} km/h`}
                                />
                                <WeatherMetric
                                    icon={CloudRain}
                                    label="Precipitation"
                                    value={`${current.precipitation} mm`}
                                />
                            </div>
                            <p className="mw-data-source">Weather data by Open-Meteo</p>
                        </>
                    ) : (
                        <div className="mw-empty-state">
                            Weather information is currently unavailable.
                        </div>
                    )}
                </article>

                <article className="mw-map-card">
                    <div className="mw-section-heading">
                        <div>
                            <span className="mw-card-kicker">LOCATION</span>
                            <h2>Explore the map</h2>
                        </div>
                        <a
                            href={`https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lon}#map=12/${location.lat}/${location.lon}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mw-icon-link"
                            aria-label="Open map in OpenStreetMap"
                        >
                            <ExternalLink size={17} />
                        </a>
                    </div>
                    <div className="mw-map-frame">
                        <iframe
                            key={`${location.lat}-${location.lon}`}
                            title={`Map showing ${location.displayName}`}
                            src={mapEmbedUrl}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                        />
                    </div>
                    <div className="mw-map-footer">
                        <MapPin size={16} />
                        <span>{location.displayName}</span>
                    </div>
                </article>
            </section>

            <section className="mw-forecast-section">
                <div className="mw-section-heading mw-forecast-heading">
                    <div>
                        <span className="mw-card-kicker">PLAN AHEAD</span>
                        <h2>7-day weather</h2>
                        <p className="mw-forecast-range">
                            {formatWeekRange(selectedWeekStart)}
                        </p>
                    </div>

                    <label className="mw-forecast-date-filter">
                        <span>Choose any week</span>
                        <input
                            type="date"
                            value={selectedWeekStart}
                            onChange={(event) => {
                                if (event.target.value) {
                                    setSelectedWeekStart(
                                        getMonday(event.target.value)
                                    );
                                }
                            }}
                            aria-label="Choose a date in the week to view"
                        />
                        <small>
                            Choose a date in any month. The full Monday–Sunday
                            week will be displayed.
                        </small>
                    </label>
                </div>

                <div className="mw-forecast-navigation">
                    <button
                        type="button"
                        className="mw-secondary-button"
                        onClick={() => shiftWeek(-7)}
                    >
                        <ArrowDown
                            size={16}
                            style={{ transform: "rotate(90deg)" }}
                        />
                        Previous week
                    </button>
                    <button
                        type="button"
                        className="mw-secondary-button"
                        onClick={() => shiftWeek(7)}
                    >
                        Next week
                        <ArrowRight size={16} />
                    </button>
                </div>

                {weekLoading ? (
                    <div className="mw-forecast-loading">
                        <LoaderCircle className="mw-spin" size={22} />
                        <span>Loading weather for the selected week...</span>
                    </div>
                ) : weekError ? (
                    <div className="mw-empty-state" role="status">
                        <AlertCircle size={18} />
                        <span>{weekError}</span>
                    </div>
                ) : selectedWeekData ? (
                    <>
                        <p className="mw-forecast-data-label">
                            {selectedWeekData.label}
                            {getDataLabelSuffix(selectedWeekData.source)}
                        </p>

                        <div className="mw-forecast-grid">
                            {weekDates.map((date, index) => {
                                const daily = selectedWeekData.daily;
                                const daySource = daily.sources[index];
                                const code = daily.weather_code?.[index];
                                const info = getWeatherInfo(code);
                                const DayIcon = info.icon;
                                const maxTemp = daily.temperature_2m_max?.[index];
                                const minTemp = daily.temperature_2m_min?.[index];
                                const rainChance =
                                    daily.precipitation_probability_max?.[index];
                                const rainAmount = daily.precipitation_sum?.[index];

                                let rainText = "—";
                                if (daySource === "historical") {
                                    rainText = Number.isFinite(rainAmount)
                                        ? `${rainAmount.toFixed(1)} mm`
                                        : "—";
                                } else if (Number.isFinite(rainChance)) {
                                    rainText = `${daySource === "typical" ? "~" : ""}${rainChance}%`;
                                }

                                return (
                                    <article className="mw-forecast-day" key={date}>
                                        <span className="mw-forecast-date">
                                            {formatDay(date)}
                                        </span>
                                        <DayIcon size={29} strokeWidth={1.6} />
                                        <span className="mw-forecast-description">
                                            {info.label}
                                        </span>
                                        <div className="mw-forecast-temperatures">
                                            <strong>
                                                {Number.isFinite(maxTemp)
                                                    ? `${Math.round(maxTemp)}°`
                                                    : "—"}
                                            </strong>
                                            <span>
                                                {Number.isFinite(minTemp)
                                                    ? `${Math.round(minTemp)}°`
                                                    : "—"}
                                            </span>
                                        </div>
                                        <div className="mw-rain-chance">
                                            <Droplets size={14} />
                                            {rainText}
                                        </div>
                                        <span
                                            className={`mw-forecast-source mw-forecast-source-${daySource}`}
                                        >
                                            {SOURCE_LABELS[daySource]}
                                        </span>
                                    </article>
                                );
                            })}
                        </div>

                        <p className="mw-data-source">
                            {getDataSourceNote(selectedWeekData.source)}
                        </p>
                    </>
                ) : (
                    <div className="mw-empty-state">
                        No weather data is available for this week.
                    </div>
                )}
            </section>

            <section className="mw-route-section">
                <div className="mw-section-heading">
                    <div>
                        <span className="mw-card-kicker">GETTING THERE</span>
                        <h2>Plan a driving route</h2>
                        <p className="mw-section-description">
                            Calculate an estimated driving distance and travel time
                            between two places.
                        </p>
                    </div>
                    <span className="mw-route-badge">
                        <Route size={17} />
                        Route planner
                    </span>
                </div>

                <form className="mw-route-form" onSubmit={handleRouteSearch}>
                    <label className="mw-route-field">
                        <span>Starting point</span>
                        <span className="mw-route-input-wrap">
                            <span className="mw-route-dot mw-route-dot-start" />
                            <input
                                value={startQuery}
                                onChange={(event) => setStartQuery(event.target.value)}
                                placeholder="e.g. Chennai Central"
                            />
                        </span>
                    </label>

                    <div className="mw-route-connector">
                        <ArrowDown size={18} />
                    </div>

                    <label className="mw-route-field">
                        <span>Destination</span>
                        <span className="mw-route-input-wrap">
                            <MapPin size={16} />
                            <input
                                value={endQuery}
                                onChange={(event) => setEndQuery(event.target.value)}
                                placeholder="e.g. Pondicherry"
                            />
                        </span>
                    </label>

                    <button
                        type="submit"
                        className="mw-route-submit"
                        disabled={routeLoading}
                    >
                        {routeLoading ? (
                            <LoaderCircle size={17} className="mw-spin" />
                        ) : (
                            <Route size={17} />
                        )}
                        Calculate route
                    </button>
                </form>

                {routeError && (
                    <div className="mw-alert mw-route-alert" role="alert">
                        <AlertCircle size={18} />
                        <span>{routeError}</span>
                    </div>
                )}

                {routeResult && routeStart && routeEnd && (
                    <div className="mw-route-result">
                        <div className="mw-route-result-heading">
                            <div className="mw-route-result-icon">
                                <Navigation size={20} />
                            </div>
                            <div>
                                <strong>Route calculated</strong>
                                <span>
                                    {routeStart.name} <ArrowRight size={13} />{" "}
                                    {routeEnd.name}
                                </span>
                            </div>
                        </div>

                        <div className="mw-route-stats">
                            <div>
                                <Route size={19} />
                                <span>Estimated distance</span>
                                <strong>{formatDistance(routeResult.distance)}</strong>
                            </div>
                            <div>
                                <Clock3 size={19} />
                                <span>Estimated driving time</span>
                                <strong>{formatDuration(routeResult.duration)}</strong>
                            </div>
                        </div>

                        <a
                            className="mw-directions-link"
                            href={routeDirectionsUrl}
                            target="_blank"
                            rel="noreferrer"
                        >
                            Open turn-by-turn directions
                            <ExternalLink size={16} />
                        </a>
                        <p className="mw-data-source">
                            Estimates are provided by OSRM and may differ from
                            actual travel times.
                        </p>
                    </div>
                )}

                {!routeResult && !routeError && (
                    <p className="mw-route-hint">
                        <MapPin size={15} />
                        Enter both locations to calculate a route.
                    </p>
                )}
            </section>

            <footer className="mw-page-footer">
                <span>Roamwise Maps &amp; Weather</span>
                <span>
                    Maps: OpenStreetMap · Forecast: Open-Meteo · Routes: OSRM
                </span>
            </footer>
        </div>
    );
}

export default MapsWeather;
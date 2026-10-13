const ALLOWED_STYLES = [
    "Relaxation",
    "Adventure",
    "Culture",
    "Food",
    "Nature",
    "Luxury",
    "Balanced",
];

const DEFAULT_GEMINI_MODEL =
    process.env.GEMINI_MODEL || "gemini-3.8-flash";

const DEFAULT_GROQ_MODEL =
    process.env.GROQ_MODEL || "openai/gpt-oss-20b";

const REQUEST_TIMEOUT_MS = 90000;
const MAX_RETRIES = 2;

const DEFAULT_TIPS = [
    "Confirm attraction opening hours and entry requirements before visiting.",
    "Keep some flexibility for weather, traffic, and local events.",
    "Treat cost estimates as planning guidance, not confirmed prices.",
    "Keep essential documents and emergency contact details accessible.",
    "Reserve part of your budget for unexpected expenses.",
];

// Helpers

function asString(value, fallback = "") {
    if (value === null || value === undefined) {
        return fallback;
    }
    return String(value).trim() || fallback;
}

function asNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function getDestination(trip) {
    return asString(trip?.destination, "your destination");
}

function getDuration(trip) {
    const duration = Math.floor(asNumber(trip?.duration, 1));
    return Math.min(30, Math.max(1, duration));
}

function getTravelers(trip) {
    return Math.max(1, Math.floor(asNumber(trip?.travelers, 1)));
}

function getBudget(trip) {
    return Math.max(0, asNumber(trip?.budget, 0));
}

function getCurrency(trip) {
    return asString(trip?.currency, "INR");
}

function getTravelStyle(trip) {
    return ALLOWED_STYLES.includes(trip?.travelStyle)
        ? trip.travelStyle
        : "Balanced";
}

function getInterests(trip) {
    return Array.isArray(trip?.interests)
        ? trip.interests
            .filter((interest) => typeof interest === "string")
            .slice(0, 8)
        : [];
}

function getErrorMessage(error) {
    return error instanceof Error
        ? error.message
        : String(error || "Unknown error");
}

function isRetryableStatus(status) {
    return (
        status === 408 ||
        status === 425 ||
        status === 429 ||
        status === 500 ||
        status === 502 ||
        status === 503 ||
        status === 504
    );
}

function sleep(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function getRetryDelay(attempt, retryAfter) {
    if (retryAfter) {
        const seconds = Number(retryAfter);

        if (Number.isFinite(seconds) && seconds >= 0) {
            return Math.min(seconds * 1000, 15000);
        }

        const retryDate = Date.parse(retryAfter);

        if (Number.isFinite(retryDate)) {
            return Math.min(
                Math.max(0, retryDate - Date.now()),
                15000
            );
        }
    }

    // Exponential backoff with a small amount of jitter.
    const baseDelay = Math.min(1000 * 2 ** attempt, 8000);
    const jitter = Math.floor(Math.random() * 400);

    return baseDelay + jitter;
}

// JSON parsing

function extractJsonText(rawText) {
    if (typeof rawText !== "string" || !rawText.trim()) {
        throw new Error("The AI returned an empty response.");
    }

    let text = rawText.trim();

    // Remove common Markdown code fences.
    text = text
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

    // First, try parsing the response exactly as returned.
    try {
        JSON.parse(text);
        return text;
    } catch {
        // Continue with extraction if the model added extra text.
    }

    // Find the first JSON object in the response.
    const firstBrace = text.indexOf("{");

    if (firstBrace === -1) {
        throw new Error("The AI response did not contain a JSON object.");
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = firstBrace; index < text.length; index += 1) {
        const character = text[index];

        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (character === "\\") {
                escaped = true;
            } else if (character === '"') {
                inString = false;
            }
            continue;
        }

        if (character === '"') {
            inString = true;
        } else if (character === "{") {
            depth += 1;
        } else if (character === "}") {
            depth -= 1;

            if (depth === 0) {
                const candidate = text.slice(firstBrace, index + 1);
                JSON.parse(candidate);
                return candidate;
            }
        }
    }

    throw new Error("The AI returned incomplete or invalid JSON.");
}

function parseJsonResponse(rawText) {
    const jsonText = extractJsonText(rawText);
    const parsed = JSON.parse(jsonText);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("The AI response must be a JSON object.");
    }

    return parsed;
}

// Itinerary validation and normalization

function cleanItinerary(data, trip) {
    const duration = getDuration(trip);
    const destination = getDestination(trip);
    const budget = getBudget(trip);

    if (!data || !Array.isArray(data.itinerary)) {
        throw new Error("The AI returned an invalid itinerary.");
    }

    if (data.itinerary.length === 0) {
        throw new Error("The AI returned an empty itinerary.");
    }

    const itinerary = data.itinerary
        .slice(0, duration)
        .map((day, index) => {
            if (!day || typeof day !== "object") {
                throw new Error(
                    `The AI returned invalid information for day ${index + 1}.`
                );
            }

            const rawActivities = Array.isArray(day.activities)
                ? day.activities
                : [];

            const activities = rawActivities
                .filter(
                    (activity) =>
                        activity &&
                        typeof activity === "object" &&
                        !Array.isArray(activity)
                )
                .slice(0, 8)
                .map((activity) => ({
                    time: asString(activity.time, "Flexible").slice(0, 40),
                    title: asString(activity.title, "Explore").slice(0, 120),
                    description: asString(
                        activity.description,
                        `Explore an attraction in ${destination}.`
                    ).slice(0, 600),
                    estimatedCost: Math.max(
                        0,
                        asNumber(activity.estimatedCost, 0)
                    ),
                }));

            if (activities.length === 0) {
                activities.push({
                    time: "10:00 AM",
                    title: "Discover the destination",
                    description: `Explore a local attraction in ${destination}. Confirm local details before visiting.`,
                    estimatedCost: 0,
                });
            }

            return {
                day: index + 1,
                title: asString(
                    day.title,
                    `Explore ${destination} - Day ${index + 1}`
                ).slice(0, 160),
                activities,
            };
        });

    // Ensure every requested day exists if the provider returns fewer days.
    while (itinerary.length < duration) {
        const dayNumber = itinerary.length + 1;

        itinerary.push({
            day: dayNumber,
            title: `Explore ${destination} - Day ${dayNumber}`,
            activities: [
                {
                    time: "10:00 AM",
                    title: "Discover the destination",
                    description: `Explore a local attraction in ${destination}. Confirm opening hours and travel details before visiting.`,
                    estimatedCost: 0,
                },
                {
                    time: "1:00 PM",
                    title: "Local meal",
                    description: "Enjoy a meal that fits your budget.",
                    estimatedCost: 0,
                },
                {
                    time: "3:00 PM",
                    title: "Flexible exploration",
                    description: "Explore the surrounding area or allow time for rest.",
                    estimatedCost: 0,
                },
            ],
        });
    }

    const tips = Array.isArray(data.tips)
        ? data.tips
            .filter(
                (tip) =>
                    typeof tip === "string" ||
                    typeof tip === "number"
            )
            .map((tip) => String(tip).trim())
            .filter(Boolean)
            .slice(0, 10)
            .map((tip) => tip.slice(0, 300))
        : [];

    return {
        itinerary,
        estimatedBudget: Math.max(
            0,
            asNumber(data.estimatedBudget, budget)
        ),
        tips: tips.length > 0 ? tips : [...DEFAULT_TIPS],
    };
}

// Prompt generation

function buildItineraryPrompt(trip) {
    const destination = getDestination(trip);
    const duration = getDuration(trip);
    const travelers = getTravelers(trip);
    const budget = getBudget(trip);
    const currency = getCurrency(trip);
    const style = getTravelStyle(trip);
    const interests = getInterests(trip);

    const selectedHotel = trip?.hotel
        ? {
            name: asString(trip.hotel.name, "Selected hotel"),
            city: asString(
                trip.hotel.city,
                trip.destinationCity || destination
            ),
            country: asString(
                trip.hotel.country,
                trip.destinationCountry || ""
            ),
            pricePerNight: Math.max(
                0,
                asNumber(trip.hotel.pricePerNight, 0)
            ),
        }
        : null;

    const hotelDescription = selectedHotel
        ? `${selectedHotel.name}, ${selectedHotel.city}, ${selectedHotel.country}`
        : "No hotel selected";

    const hotelPrice = selectedHotel
        ? `${selectedHotel.pricePerNight} ${currency} per night, if applicable`
        : "Not applicable";

    return `
You are a practical travel itinerary planner.

Create a useful travel itinerary using the trip details below.

TRIP DETAILS
Destination: ${destination}
Destination city: ${asString(trip?.destinationCity, destination)}
Destination country: ${asString(trip?.destinationCountry, "Not specified")}
Start date: ${asString(trip?.startDate, "Not specified")}
End date: ${asString(trip?.endDate, "Not specified")}
Duration: ${duration} days
Travelers: ${travelers}
Total trip budget: ${budget} ${currency}
Travel style: ${style}
Interests: ${interests.length ? interests.join(", ") : "General sightseeing"}
Selected hotel: ${hotelDescription}
Selected hotel price: ${hotelPrice}

BUDGET RULES
- All estimated costs must be numeric amounts in ${currency}.
- Costs are estimates for the whole group, not per person.
- Keep the total plan realistic for the stated budget.
- Do not invent confirmed prices, ticket availability, opening hours, or hotel availability.
- If a hotel is selected, do not add a second hotel or duplicate the accommodation cost in activity costs.
- The estimatedBudget must not be presented as a verified quote.

ITINERARY RULES
- Return exactly ${duration} days.
- Include 3 or 4 activities per day.
- Each activity must have a time, title, description, and estimatedCost.
- Include a sensible balance of sightseeing, meals, transport/rest time, and free time.
- Match the travel style and interests.
- Avoid scheduling too many distant locations in one day.
- On the first day, allow reasonable time for arrival and hotel check-in if a hotel is selected.
- Do not claim that you checked live maps, live prices, or opening hours.
- Use general destination knowledge and avoid inventing specific business names if uncertain.

OUTPUT REQUIREMENTS
Return ONLY one valid JSON object.
Do not include Markdown fences, comments, or text outside the JSON.
Use this exact structure:

{
  "itinerary": [
    {
      "title": "Day title",
      "activities": [
        {
          "time": "9:00 AM",
          "title": "Activity title",
          "description": "Useful practical description",
          "estimatedCost": 500
        }
      ]
    }
  ],
  "estimatedBudget": 12000,
  "tips": [
    "Practical travel tip"
  ]
}
`.trim();
}

// HTTP requests with retry handling

async function fetchWithRetry(url, options, providerName) {
    let lastError;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
        const controller = new AbortController();

        const timeout = setTimeout(
            () => controller.abort(),
            REQUEST_TIMEOUT_MS
        );

        try {
            const response = await fetch(url, {
                ...options,
                signal: controller.signal,
            });

            clearTimeout(timeout);

            if (response.ok) {
                return response;
            }

            const responseText = await response.text();

            const error = new Error(
                `${providerName} API returned HTTP ${response.status}: ${responseText.slice(0, 800)}`
            );

            error.status = response.status;
            error.retryAfter = response.headers.get("retry-after");

            if (
                !isRetryableStatus(response.status) ||
                attempt >= MAX_RETRIES
            ) {
                throw error;
            }

            lastError = error;

            console.warn(
                `[Itinerary] ${providerName} request failed with HTTP ${response.status}. ` +
                `Retry ${attempt + 1}/${MAX_RETRIES} scheduled.`
            );

            await sleep(getRetryDelay(attempt, error.retryAfter));
        } catch (error) {
            clearTimeout(timeout);

            lastError = error;

            const timedOut =
                error?.name === "AbortError" ||
                error?.name === "TimeoutError";

            const networkError = !Number.isInteger(error?.status);

            const retryable =
                timedOut ||
                networkError ||
                isRetryableStatus(error?.status);

            if (!retryable || attempt >= MAX_RETRIES) {
                if (timedOut) {
                    throw new Error(
                        `${providerName} request timed out after ${REQUEST_TIMEOUT_MS / 1000} seconds.`
                    );
                }

                throw error;
            }

            console.warn(
                `[Itinerary] ${providerName} request failed: ${getErrorMessage(error)}. ` +
                `Retry ${attempt + 1}/${MAX_RETRIES} scheduled.`
            );

            await sleep(getRetryDelay(attempt, error?.retryAfter));
        }
    }

    throw lastError || new Error(`${providerName} request failed.`);
}

// Gemini provider

async function callGemini(prompt) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is not configured.");
    }

    const model = DEFAULT_GEMINI_MODEL;

    const url =
        `https://generativelanguage.googleapis.com/v1beta/models/` +
        `${encodeURIComponent(model)}:generateContent` +
        `?key=${encodeURIComponent(apiKey)}`;

    const response = await fetchWithRetry(
        url,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [{ text: prompt }],
                    },
                ],
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.4,
                    maxOutputTokens: 12000,
                },
            }),
        },
        `Gemini (${model})`
    );

    const result = await response.json();

    const responseText = result.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim();

    if (!responseText) {
        const blockReason = result.promptFeedback?.blockReason;

        throw new Error(
            blockReason
                ? `Gemini blocked the prompt: ${blockReason}`
                : "Gemini returned an empty itinerary."
        );
    }

    return parseJsonResponse(responseText);
}

// Groq provider

async function callGroq(prompt) {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        throw new Error("GROQ_API_KEY is not configured.");
    }

    const model = DEFAULT_GROQ_MODEL;

    const response = await fetchWithRetry(
        "https://api.groq.com/openai/v1/chat/completions",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: "system",
                        content:
                            "You are a travel itinerary planner. Return only a valid JSON object matching the requested schema. Do not include Markdown or any text outside the JSON.",
                    },
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                temperature: 0.3,
                max_tokens: 12000,
            }),
        },
        `Groq (${model})`
    );

    const result = await response.json();

    const responseText =
        result.choices?.[0]?.message?.content?.trim();

    if (!responseText) {
        throw new Error("Groq returned an empty itinerary.");
    }

    // Do not set response_format: { type: "json_object" }.
    // Groq may reject JSON-mode generations with json_validate_failed.
    // Request JSON in the prompt and validate the response here.
    return parseJsonResponse(responseText);
}


// Main exported service

export async function generateItinerary(trip) {
    if (!trip || typeof trip !== "object") {
        throw new Error("Trip details are required.");
    }

    const prompt = buildItineraryPrompt(trip);
    const errors = [];

    console.info("[Itinerary] Generation requested.", {
        destination: getDestination(trip),
        durationDays: getDuration(trip),
        geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
        groqConfigured: Boolean(process.env.GROQ_API_KEY),
        geminiModel: DEFAULT_GEMINI_MODEL,
        groqModel: DEFAULT_GROQ_MODEL,
    });

    // Try Gemini first.
    if (process.env.GEMINI_API_KEY) {
        const startedAt = Date.now();

        console.info(
            `[Itinerary] Trying Gemini model "${DEFAULT_GEMINI_MODEL}".`
        );

        try {
            const generated = await callGemini(prompt);
            const cleaned = cleanItinerary(generated, trip);
            const elapsedMs = Date.now() - startedAt;

            console.info(
                `[Itinerary] Gemini succeeded in ${elapsedMs}ms. ` +
                `Days generated: ${cleaned.itinerary.length}.`
            );

            return {
                ...cleaned,
                aiGenerated: true,
                aiProvider: "gemini",
            };
        } catch (error) {
            const message = getErrorMessage(error);
            const elapsedMs = Date.now() - startedAt;

            errors.push(`Gemini: ${message}`);

            console.error(
                `[Itinerary] Gemini failed after ${elapsedMs}ms.`,
                {
                    model: DEFAULT_GEMINI_MODEL,
                    message,
                    status: error?.status ?? null,
                    stack: error?.stack ?? null,
                }
            );
        }
    } else {
        const message =
            "GEMINI_API_KEY is not configured; skipping Gemini.";

        console.warn(`[Itinerary] ${message}`);
        errors.push(`Gemini: ${message}`);
    }

    // Try Groq if Gemini fails.
    if (process.env.GROQ_API_KEY) {
        const startedAt = Date.now();

        console.info(
            `[Itinerary] Gemini did not produce an itinerary. ` +
            `Trying Groq model "${DEFAULT_GROQ_MODEL}" now.`
        );

        try {
            const generated = await callGroq(prompt);
            const cleaned = cleanItinerary(generated, trip);
            const elapsedMs = Date.now() - startedAt;

            console.info(
                `[Itinerary] Groq succeeded in ${elapsedMs}ms. ` +
                `Days generated: ${cleaned.itinerary.length}.`
            );

            return {
                ...cleaned,
                aiGenerated: true,
                aiProvider: "groq",
            };
        } catch (error) {
            const message = getErrorMessage(error);
            const elapsedMs = Date.now() - startedAt;

            errors.push(`Groq: ${message}`);

            console.error(
                `[Itinerary] Groq failed after ${elapsedMs}ms.`,
                {
                    model: DEFAULT_GROQ_MODEL,
                    message,
                    status: error?.status ?? null,
                    stack: error?.stack ?? null,
                }
            );
        }
    } else {
        const message =
            "GROQ_API_KEY is not configured; skipping Groq.";

        console.error(`[Itinerary] ${message}`);
        errors.push(`Groq: ${message}`);
    }

    // Both providers failed.
    const combinedError = errors.join(" | ");

    console.error(
        "[Itinerary] All configured AI providers failed. " +
        "Full provider errors:",
        combinedError
    );

    throw new Error(
        `Unable to generate an AI itinerary. Please try again. ${combinedError}`
    );
}

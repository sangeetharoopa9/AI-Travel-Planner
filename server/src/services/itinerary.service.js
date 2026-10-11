const ALLOWED_STYLES = [
    "Relaxation",
    "Adventure",
    "Culture",
    "Food",
    "Nature",
    "Luxury",
    "Balanced",
];

function buildFallbackItinerary(trip) {
    const activitiesByStyle = {
        Relaxation: [
            [
                "9:00 AM",
                "Slow morning",
                "Enjoy breakfast and explore a nearby neighborhood.",
            ],
            [
                "11:00 AM",
                "Scenic stop",
                "Visit a peaceful viewpoint or garden.",
            ],
            [
                "1:00 PM",
                "Local lunch",
                "Try a well-reviewed local restaurant.",
            ],
            [
                "3:00 PM",
                "Free time",
                "Enjoy a relaxed afternoon at your own pace.",
            ],
            [
                "6:00 PM",
                "Evening walk",
                "Discover the area during sunset.",
            ],
        ],
        Adventure: [
            [
                "7:30 AM",
                "Early start",
                "Have breakfast and prepare for an outdoor excursion.",
            ],
            [
                "9:00 AM",
                "Outdoor adventure",
                "Explore a suitable hiking trail or outdoor activity.",
            ],
            [
                "12:30 PM",
                "Refuel",
                "Take a break for lunch and hydration.",
            ],
            [
                "2:00 PM",
                "Explore further",
                "Visit a nearby nature attraction.",
            ],
            [
                "6:00 PM",
                "Wind down",
                "Rest and enjoy a casual dinner.",
            ],
        ],
        Culture: [
            [
                "9:00 AM",
                "Historic district",
                "Walk through a historic area and discover local architecture.",
            ],
            [
                "11:00 AM",
                "Museum or landmark",
                "Explore a local museum or cultural attraction.",
            ],
            [
                "1:00 PM",
                "Regional cuisine",
                "Sample traditional dishes.",
            ],
            [
                "3:00 PM",
                "Art and craft",
                "Visit local galleries, markets, or craft shops.",
            ],
            [
                "6:00 PM",
                "Local evening",
                "Experience the destination's evening atmosphere.",
            ],
        ],
        Food: [
            [
                "9:00 AM",
                "Local breakfast",
                "Start with a regional breakfast specialty.",
            ],
            [
                "11:00 AM",
                "Market visit",
                "Explore a local food market.",
            ],
            [
                "1:00 PM",
                "Food experience",
                "Enjoy a destination-specific lunch.",
            ],
            [
                "3:30 PM",
                "Cafe stop",
                "Try a popular local dessert or coffee.",
            ],
            [
                "6:30 PM",
                "Dinner discovery",
                "Choose a local restaurant for dinner.",
            ],
        ],
        Nature: [
            [
                "7:30 AM",
                "Nature walk",
                "Enjoy the outdoors during the cooler morning hours.",
            ],
            [
                "10:00 AM",
                "Scenic attraction",
                "Visit a nearby natural landmark.",
            ],
            [
                "12:30 PM",
                "Lunch break",
                "Have lunch and take time to rest.",
            ],
            [
                "2:30 PM",
                "Outdoor discovery",
                "Explore a garden, lake, trail, or nature reserve.",
            ],
            [
                "5:30 PM",
                "Sunset views",
                "Find a safe scenic spot for sunset.",
            ],
        ],
        Luxury: [
            [
                "9:00 AM",
                "Leisurely breakfast",
                "Enjoy a relaxed breakfast.",
            ],
            [
                "11:00 AM",
                "Private discovery",
                "Explore a landmark or book a guided experience.",
            ],
            [
                "1:00 PM",
                "Destination dining",
                "Enjoy a memorable lunch within your budget.",
            ],
            [
                "3:30 PM",
                "Leisure time",
                "Relax at your accommodation or a local wellness venue.",
            ],
            [
                "7:00 PM",
                "Evening dining",
                "Plan a special dinner.",
            ],
        ],
        Balanced: [
            [
                "9:00 AM",
                "Local breakfast",
                "Start the day with a relaxed breakfast.",
            ],
            [
                "10:30 AM",
                "Must-see attraction",
                "Visit one of the destination's main attractions.",
            ],
            [
                "1:00 PM",
                "Local lunch",
                "Try regional food.",
            ],
            [
                "2:30 PM",
                "Explore the area",
                "Discover a neighborhood, market, or cultural site.",
            ],
            [
                "6:00 PM",
                "Evening experience",
                "Enjoy a scenic walk and dinner.",
            ],
        ],
    };

    const baseActivities =
        activitiesByStyle[trip.travelStyle] ||
        activitiesByStyle.Balanced;

    return Array.from({ length: trip.duration }, (_, index) => ({
        day: index + 1,
        title:
            index === 0
                ? `Arrival and first discoveries in ${trip.destination}`
                : index === trip.duration - 1
                    ? `Final discoveries in ${trip.destination}`
                    : `Explore ${trip.destination}`,
        activities: baseActivities.map(
            ([time, title, description], activityIndex) => ({
                time,
                title,
                description:
                    index > 0 && activityIndex === 1
                        ? `Discover a different attraction in ${trip.destination}. ${description}`
                        : description,
                estimatedCost: Math.round(
                    trip.budget /
                    trip.duration /
                    trip.travelers /
                    baseActivities.length
                ),
            })
        ),
    }));
}

function cleanItinerary(data, trip) {
    if (
        !data ||
        !Array.isArray(data.itinerary) ||
        data.itinerary.length === 0
    ) {
        throw new Error("The AI returned an invalid itinerary.");
    }

    const itinerary = data.itinerary
        .slice(0, trip.duration)
        .map((day, index) => {
            if (!Array.isArray(day.activities)) {
                throw new Error("The AI returned invalid daily activities.");
            }

            return {
                day: index + 1,
                title: String(
                    day.title || `Explore ${trip.destination}`
                ).slice(0, 160),
                activities: day.activities.slice(0, 8).map((activity) => ({
                    time: String(activity.time || "Flexible").slice(0, 40),
                    title: String(activity.title || "Explore").slice(0, 120),
                    description: String(activity.description || "").slice(
                        0,
                        600
                    ),
                    estimatedCost: Math.max(
                        0,
                        Number(activity.estimatedCost) || 0
                    ),
                })),
            };
        });

    while (itinerary.length < trip.duration) {
        const dayNumber = itinerary.length + 1;

        itinerary.push({
            day: dayNumber,
            title: `Explore ${trip.destination}`,
            activities: [
                {
                    time: "10:00 AM",
                    title: "Discover the destination",
                    description: `Explore a local attraction in ${trip.destination}.`,
                    estimatedCost: 0,
                },
            ],
        });
    }

    return {
        itinerary,
        estimatedBudget: Math.max(
            0,
            Number(data.estimatedBudget) || trip.budget
        ),
        tips: Array.isArray(data.tips)
            ? data.tips
                .slice(0, 10)
                .map((tip) => String(tip).slice(0, 300))
            : [],
    };
}

export async function generateItinerary(trip) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return {
            ...cleanItinerary(
                {
                    itinerary: buildFallbackItinerary(trip),
                    estimatedBudget: trip.budget,
                    tips: [
                        "Confirm opening hours and entry requirements before visiting.",
                        "Keep some flexibility for weather and local events.",
                        "Treat cost estimates as planning guidance, not confirmed prices.",
                    ],
                },
                trip
            ),
            aiGenerated: false,
        };
    }

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const prompt = `
Create a practical travel itinerary in JSON for this trip:

Destination: ${trip.destination}
Start date: ${trip.startDate}
End date: ${trip.endDate}
Duration: ${trip.duration} days
Travelers: ${trip.travelers}
Total budget: ${trip.budget} ${trip.currency}
Travel style: ${trip.travelStyle}
Interests: ${trip.interests.join(", ") || "General sightseeing"}
Destination city: ${trip.destinationCity || trip.destination}
Destination country: ${trip.destinationCountry || "Not specified"}

Selected hotel: ${trip.hotel
            ? `${trip.hotel.name}, ${trip.hotel.city || trip.destination}, ${trip.hotel.country || ""}`
            : "No hotel selected"
        }

Hotel price per night: ${trip.hotel
            ? trip.hotel.pricePerNight
            : "Not applicable"
        } ${trip.currency}

Accommodation allowance is approximately 35% of the total trip budget.
The selected hotel's price is already part of that allowance; do not
add a different hotel.

Return ONLY a JSON object with this structure:
{
  "itinerary": [
    {
      "title": "Day title",
      "activities": [
        {
          "time": "9:00 AM",
          "title": "Activity title",
          "description": "Useful description",
          "estimatedCost": 500
        }
      ]
    }
  ],
  "estimatedBudget": 12000,
  "tips": ["Practical travel tip"]
}

Create exactly ${trip.duration} days, with 3 to 6 activities per day.
Costs must be numeric amounts in ${trip.currency}, not strings.
Estimate costs for the whole group, keep the plan mindful of the stated
total budget, avoid inventing specific booking availability, and include
a sensible mix of travel, meals, sightseeing, and rest. Make the plan
match the travel style and interests.

Use realistic general guidance. Do not claim prices or opening hours
are verified.

If a hotel is selected, include arrival/check-in guidance on the first
day and keep activities reasonably located around the destination city.
Do not invent hotel booking availability or add hotel costs to activity
costs.
`;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
            model
        )}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            signal: AbortSignal.timeout(45000),
            body: JSON.stringify({
                contents: [
                    {
                        role: "user",
                        parts: [{ text: prompt }],
                    },
                ],
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.7,
                },
            }),
        }
    );

    if (!response.ok) {
        const errorBody = await response.text();

        console.error(
            "Gemini API request failed:",
            response.status,
            errorBody.slice(0, 500)
        );

        throw new Error(
            "AI itinerary generation failed. Check the Gemini API key and model."
        );
    }

    const result = await response.json();

    const text = result.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("");

    if (!text) {
        throw new Error(
            "The AI did not return an itinerary. Please try again."
        );
    }

    let parsed;

    try {
        parsed = JSON.parse(text);
    } catch {
        throw new Error(
            "The AI returned an unreadable itinerary. Please try again."
        );
    }

    return {
        ...cleanItinerary(parsed, trip),
        aiGenerated: true,
    };
}
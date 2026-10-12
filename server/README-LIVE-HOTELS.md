# Live hotel search setup

Roamwise hotel suggestions now use Google Places API (New) rather than the Admin Catalog hotel table. The backend searches for up to 10 lodging results for the destination and sorts them by rating, then review count.

## Required environment variable

Set `GOOGLE_PLACES_API_KEY` in the **server** environment (local `server/.env`, and in the backend hosting provider's environment variables). Do not add this key to the client `.env` or use a `VITE_` prefix.

Enable **Places API (New)** for the Google Cloud project and configure billing and API restrictions. The key must be permitted to call Places API (New). Restart/redeploy the server after setting the variable.

## Price and availability

Google Places provides hotel identity, address, rating/review count, website and Google Maps link, but does not provide dependable date-specific room rates or booking availability in this implementation. The UI therefore says “Check rates with hotel” rather than inventing a price. Travelers can open the hotel's website or map to confirm prices and availability.

If the key is missing or Places rejects the request, the API returns a clear configuration/provider error; it does not silently show catalog records as if they were live hotel results.

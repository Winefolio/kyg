import type { Express } from "express";
import { createRateLimit } from "../middleware/rateLimiter";

interface PlaceResult {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  ratingCount: number | null;
  lat: number;
  lng: number;
  businessStatus: string;
}

// Grid-based cache: round coordinates to 2 decimal places (~1.1km), 30-min TTL
const placesCache = new Map<string, { data: PlaceResult[]; expiresAt: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getCacheKey(lat: number, lng: number, radius: number): string {
  // Round to 2 decimal places for grid-based caching
  const gridLat = Math.round(lat * 100) / 100;
  const gridLng = Math.round(lng * 100) / 100;
  return `${gridLat},${gridLng},${radius}`;
}

function getCached(key: string): PlaceResult[] | null {
  const entry = placesCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    placesCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: PlaceResult[]): void {
  placesCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

const placesRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  maxRequests: 20,
  message: "Too many requests. Try again in a minute."
});

export function registerPlacesRoutes(app: Express) {
  console.log("📍 Registering places endpoints...");

  // Nearby wine shops proxy
  app.get("/api/wine-shops/nearby", placesRateLimit, async (req, res) => {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ message: "Wine shop search is not configured" });
    }

    const latitude = parseFloat(req.query.latitude as string);
    const longitude = parseFloat(req.query.longitude as string);
    const radius = Math.min(parseInt(req.query.radius as string) || 5000, 50000);

    // Validate coordinates
    if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ message: "Invalid coordinates" });
    }

    // Check cache
    const cacheKey = getCacheKey(latitude, longitude, radius);
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({ shops: cached, cached: true });
    }

    try {
      // Google Places API (New) - searchNearby
      const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.businessStatus"
        },
        body: JSON.stringify({
          includedTypes: ["liquor_store"],
          locationRestriction: {
            circle: {
              center: { latitude, longitude },
              radius
            }
          },
          maxResultCount: 10
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Google Places API error:", response.status, errorText);
        return res.status(502).json({ message: "Failed to search for wine shops" });
      }

      const data = await response.json();
      const places = data.places || [];

      const shops: PlaceResult[] = places
        .filter((p: any) => p.businessStatus !== "CLOSED_PERMANENTLY")
        .map((p: any) => ({
          id: p.id,
          name: p.displayName?.text || "Unknown",
          address: p.formattedAddress || "",
          rating: p.rating || null,
          ratingCount: p.userRatingCount || null,
          lat: p.location?.latitude || 0,
          lng: p.location?.longitude || 0,
          businessStatus: p.businessStatus || "OPERATIONAL"
        }));

      // Cache the result
      setCache(cacheKey, shops);

      res.json({ shops, cached: false });
    } catch (error) {
      console.error("Error fetching nearby wine shops:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}

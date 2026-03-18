import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Store, Star, Loader2, Navigation, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/useGeolocation";

interface Shop {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  ratingCount: number | null;
  lat: number;
  lng: number;
}

export function NearbyWineShops() {
  const { position, error: geoError, loading: geoLoading, requestLocation } = useGeolocation();
  const [hasRequested, setHasRequested] = useState(false);

  const { data, isLoading: shopsLoading, error: shopsError } = useQuery<{ shops: Shop[] }>({
    queryKey: ["nearby-wine-shops", position?.latitude, position?.longitude],
    queryFn: async () => {
      const response = await fetch(
        `/api/wine-shops/nearby?latitude=${position!.latitude}&longitude=${position!.longitude}&radius=5000`
      );
      if (response.status === 503) throw new Error("NOT_CONFIGURED");
      if (!response.ok) throw new Error("Failed to fetch shops");
      return response.json();
    },
    enabled: !!position,
    staleTime: 1000 * 60 * 30 // 30 minutes
  });

  const handleFindShops = () => {
    setHasRequested(true);
    requestLocation();
  };

  const openInMaps = (shop: Shop) => {
    const url = `https://maps.google.com/?q=${shop.lat},${shop.lng}`;
    window.open(url, "_blank");
  };

  // Initial state — show button
  if (!hasRequested) {
    return (
      <div className="mt-4">
        <Button
          onClick={handleFindShops}
          variant="outline"
          className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
        >
          <MapPin className="w-4 h-4 mr-2" />
          Find wine shops near you
        </Button>
        <p className="text-xs text-purple-300/50 text-center mt-1.5">
          Your location is not stored
        </p>
      </div>
    );
  }

  // Loading geolocation
  if (geoLoading) {
    return (
      <div className="mt-4 flex items-center justify-center gap-2 py-4 text-purple-300/70 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Getting your location...
      </div>
    );
  }

  // Geolocation error
  if (geoError) {
    return (
      <div className="mt-4 bg-white/5 rounded-lg p-3 border border-white/10">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-white/80">{geoError}</p>
            <Button
              onClick={handleFindShops}
              variant="ghost"
              size="sm"
              className="text-purple-300 hover:text-white mt-2 h-7 px-2"
            >
              Try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Loading shops
  if (shopsLoading) {
    return (
      <div className="mt-4 flex items-center justify-center gap-2 py-4 text-purple-300/70 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Finding wine shops nearby...
      </div>
    );
  }

  // API error — hide silently if not configured, show message for real errors
  if (shopsError) {
    if ((shopsError as Error).message === "NOT_CONFIGURED") {
      return null; // Feature not available — hide gracefully
    }
    return (
      <div className="mt-4 bg-white/5 rounded-lg p-3 border border-white/10">
        <p className="text-sm text-white/70">Couldn't find wine shops right now. Try again later.</p>
      </div>
    );
  }

  const shops = data?.shops || [];

  // No results
  if (shops.length === 0) {
    return (
      <div className="mt-4 bg-white/5 rounded-lg p-3 border border-white/10 text-center">
        <Store className="w-8 h-8 text-purple-400/40 mx-auto mb-2" />
        <p className="text-sm text-white/70">No wine shops found nearby.</p>
        <p className="text-xs text-purple-300/50 mt-1">Try a different area or check online retailers.</p>
      </div>
    );
  }

  // Show shops
  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-purple-300 mb-2 flex items-center gap-1.5">
        <MapPin className="w-4 h-4" />
        Wine shops near you
      </h4>
      <div className="space-y-2">
        <AnimatePresence>
          {shops.map((shop, i) => (
            <motion.button
              key={shop.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => openInMaps(shop)}
              className="w-full bg-white/5 hover:bg-white/10 rounded-lg p-3 border border-white/10 text-left transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{shop.name}</p>
                  <p className="text-xs text-purple-300/60 truncate mt-0.5">{shop.address}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {shop.rating && (
                    <div className="flex items-center gap-0.5 text-xs text-amber-400">
                      <Star className="w-3 h-3 fill-current" />
                      <span>{shop.rating}</span>
                    </div>
                  )}
                  <Navigation className="w-3.5 h-3.5 text-purple-400 ml-1" />
                </div>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

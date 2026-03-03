import { useState, useCallback } from "react";

interface GeolocationPosition {
  latitude: number;
  longitude: number;
}

interface UseGeolocationReturn {
  position: GeolocationPosition | null;
  error: string | null;
  loading: boolean;
  requestLocation: () => void;
}

export function useGeolocation(): UseGeolocationReturn {
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Your browser doesn't support location services.");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        });
        setLoading(false);
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("Location access denied. Enable location in your browser or device settings to find nearby shops.");
            break;
          case err.POSITION_UNAVAILABLE:
            setError("Location unavailable. Try again in a moment.");
            break;
          case err.TIMEOUT:
            setError("Location request timed out. Try again.");
            break;
          default:
            setError("Could not get your location.");
        }
        setLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000 // 5-minute cache
      }
    );
  }, []);

  return { position, error, loading, requestLocation };
}

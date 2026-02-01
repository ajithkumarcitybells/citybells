import { useState, useEffect, createContext, useContext } from "react";

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  address: string;
  area: string;
  city: string;
  pincode: string;
  isLoading: boolean;
  error: string | null;
  isDetected: boolean;
}

interface LocationContextType extends LocationState {
  detectLocation: () => void;
  setManualAddress: (address: string, area: string, city: string, pincode: string) => void;
}

const LocationContext = createContext<LocationContextType | null>(null);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    address: "",
    area: "",
    city: "",
    pincode: "",
    isLoading: true,
    error: null,
    isDetected: false,
  });

  const detectLocation = () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    if (!("geolocation" in navigator)) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: "Geolocation not supported",
        address: "Location not available",
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
          );
          const data = await response.json();

          const address = data.address || {};
          const area = address.suburb || address.neighbourhood || address.locality || address.village || "";
          const city = address.city || address.town || address.state_district || address.state || "";
          const pincode = address.postcode || "";
          const road = address.road || "";
          
          const fullAddress = [road, area, city, pincode].filter(Boolean).join(", ");

          setState({
            latitude,
            longitude,
            address: fullAddress || data.display_name || "Address detected",
            area,
            city,
            pincode,
            isLoading: false,
            error: null,
            isDetected: true,
          });
        } catch (err) {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: "Could not fetch address",
            address: "Tap to set location",
          }));
        }
      },
      (error) => {
        let errorMessage = "Location access denied";
        if (error.code === error.TIMEOUT) {
          errorMessage = "Location request timed out";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = "Location unavailable";
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
          address: "Tap to set location",
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const setManualAddress = (address: string, area: string, city: string, pincode: string) => {
    setState((prev) => ({
      ...prev,
      address,
      area,
      city,
      pincode,
      isDetected: true,
      isLoading: false,
      error: null,
    }));
  };

  useEffect(() => {
    detectLocation();
  }, []);

  return (
    <LocationContext.Provider value={{ ...state, detectLocation, setManualAddress }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { DELIVERY_PINCODE_STORAGE_KEY } from "@/lib/queryClient";

const DELIVERY_LOCATION_META_KEY = "deliveryLocationMeta";

type HubLocation = {
  city: string;
  state: string;
};

export type SelectedDeliveryLocation = {
  pincode: string;
  city: string | null;
  state: string | null;
  label?: string | null;
  source: "gps" | "manual" | "saved" | "cached";
};

type ValidationResponse = {
  allowed: boolean;
  pincode: string | null;
  hub: HubLocation | null;
  resolvedAddress?: string | null;
};

type DeliveryLocationContextValue = {
  selectedLocation: SelectedDeliveryLocation | null;
  isServiceable: boolean;
  isHydrated: boolean;
  isValidating: boolean;
  validationError: string | null;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  validateCurrentLocation: () => Promise<ValidationResponse | null>;
  validatePincode: (pincode: string, options?: Partial<SelectedDeliveryLocation>) => Promise<ValidationResponse | null>;
  selectSavedAddress: (address: { pincode: string; city?: string | null; state?: string | null; fullAddress?: string | null }) => Promise<ValidationResponse | null>;
  clearSelectedLocation: () => void;
};

const DeliveryLocationContext = createContext<DeliveryLocationContextValue | null>(null);

function readStoredLocation(): SelectedDeliveryLocation | null {
  if (typeof window === "undefined") {
    return null;
  }

  const pincode = window.localStorage.getItem(DELIVERY_PINCODE_STORAGE_KEY);
  if (!pincode) {
    return null;
  }

  try {
    const rawMeta = window.localStorage.getItem(DELIVERY_LOCATION_META_KEY);
    const meta = rawMeta ? JSON.parse(rawMeta) as Partial<SelectedDeliveryLocation> : {};

    return {
      pincode,
      city: meta.city ?? null,
      state: meta.state ?? null,
      label: meta.label ?? null,
      source: meta.source ?? "cached",
    };
  } catch {
    return {
      pincode,
      city: null,
      state: null,
      label: null,
      source: "cached",
    };
  }
}

function persistLocation(location: SelectedDeliveryLocation | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!location) {
    window.localStorage.removeItem(DELIVERY_PINCODE_STORAGE_KEY);
    window.localStorage.removeItem(DELIVERY_LOCATION_META_KEY);
    return;
  }

  window.localStorage.setItem(DELIVERY_PINCODE_STORAGE_KEY, location.pincode);
  window.localStorage.setItem(DELIVERY_LOCATION_META_KEY, JSON.stringify(location));
}

export function DeliveryLocationProvider({ children }: { children: ReactNode }) {
  const [selectedLocation, setSelectedLocation] = useState<SelectedDeliveryLocation | null>(null);
  const [isServiceable, setIsServiceable] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const applyValidation = useCallback((response: ValidationResponse, fallback?: Partial<SelectedDeliveryLocation>) => {
    const nextLocation = response.pincode
      ? {
          pincode: response.pincode,
          city: response.hub?.city ?? fallback?.city ?? null,
          state: response.hub?.state ?? fallback?.state ?? null,
          label: response.resolvedAddress ?? fallback?.label ?? null,
          source: fallback?.source ?? "manual",
        }
      : null;

    setSelectedLocation(nextLocation);
    setIsServiceable(response.allowed);
    persistLocation(nextLocation);
    return nextLocation;
  }, []);

  useEffect(() => {
    const storedLocation = readStoredLocation();
    if (!storedLocation) {
      setIsHydrated(true);
      return;
    }

    const revalidateStoredLocation = async () => {
      setIsValidating(true);
      try {
        const response = await fetch("/api/location/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ pincode: storedLocation.pincode }),
        });
        const payload = await response.json() as ValidationResponse;
        applyValidation(payload, { ...storedLocation, source: "cached" });
      } catch {
        setSelectedLocation(storedLocation);
        setIsServiceable(false);
      } finally {
        setIsValidating(false);
        setIsHydrated(true);
      }
    };

    void revalidateStoredLocation();
  }, []);

  const validatePincode = useCallback(async (pincode: string, options?: Partial<SelectedDeliveryLocation>) => {
    setIsValidating(true);
    setValidationError(null);

    try {
      const response = await fetch("/api/location/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pincode }),
      });
      const payload = await response.json() as ValidationResponse & { message?: string };

      if (!response.ok) {
        throw new Error(payload.message || "Failed to validate delivery pincode");
      }

      applyValidation(payload, { ...options, source: options?.source ?? "manual" });
      setIsModalOpen(false);
      return payload;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to validate delivery pincode";
      setValidationError(message);
      return null;
    } finally {
      setIsValidating(false);
      setIsHydrated(true);
    }
  }, [applyValidation]);

  const validateCurrentLocation = useCallback(async () => {
    if (!("geolocation" in navigator)) {
      setValidationError("Geolocation is not supported on this device");
      return null;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });

      const response = await fetch("/api/location/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      });

      const payload = await response.json() as ValidationResponse & { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || "Failed to validate your current location");
      }

      applyValidation(payload, {
        source: "gps",
        label: payload.resolvedAddress ?? null,
      });
      setIsModalOpen(false);
      return payload;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to validate your current location";
      setValidationError(message);
      return null;
    } finally {
      setIsValidating(false);
      setIsHydrated(true);
    }
  }, [applyValidation]);

  const selectSavedAddress = useCallback(async (address: { pincode: string; city?: string | null; state?: string | null; fullAddress?: string | null }) => {
    return validatePincode(address.pincode, {
      city: address.city ?? null,
      state: address.state ?? null,
      label: address.fullAddress ?? null,
      source: "saved",
    });
  }, [validatePincode]);

  const clearSelectedLocation = useCallback(() => {
    setSelectedLocation(null);
    setIsServiceable(false);
    setValidationError(null);
    persistLocation(null);
  }, []);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const value = useMemo(() => ({
    selectedLocation,
    isServiceable,
    isHydrated,
    isValidating,
    validationError,
    isModalOpen,
    openModal,
    closeModal,
    validateCurrentLocation,
    validatePincode,
    selectSavedAddress,
    clearSelectedLocation,
  }), [selectedLocation, isServiceable, isHydrated, isValidating, validationError, isModalOpen, openModal, closeModal, validateCurrentLocation, validatePincode, selectSavedAddress, clearSelectedLocation]);

  return (
    <DeliveryLocationContext.Provider value={value}>
      {children}
    </DeliveryLocationContext.Provider>
  );
}

export function useDeliveryLocation() {
  const context = useContext(DeliveryLocationContext);
  if (!context) {
    throw new Error("useDeliveryLocation must be used within a DeliveryLocationProvider");
  }
  return context;
}
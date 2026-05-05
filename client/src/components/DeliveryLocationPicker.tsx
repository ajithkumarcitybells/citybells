import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Navigation, Search, Warehouse } from "lucide-react";
import { useDeliveryLocation } from "@/hooks/use-delivery-location";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Address } from "@shared/schema";

export function DeliveryLocationPicker() {
  const { user } = useAuth();
  const {
    selectedLocation,
    isServiceable,
    isModalOpen,
    isValidating,
    validationError,
    openModal,
    closeModal,
    validateCurrentLocation,
    validatePincode,
    selectSavedAddress,
  } = useDeliveryLocation();
  const [manualPincode, setManualPincode] = useState(selectedLocation?.pincode ?? "");

  const { data: savedAddresses = [] } = useQuery<Address[]>({
    queryKey: ["/api/addresses"],
    enabled: !!user,
  });

  const deliverySummary = useMemo(() => {
    if (!selectedLocation) {
      return "Select delivery location";
    }

    const area = [selectedLocation.city, selectedLocation.state].filter(Boolean).join(", ");
    return area ? `${area} ${selectedLocation.pincode}` : selectedLocation.pincode;
  }, [selectedLocation]);

  return (
    <Dialog open={isModalOpen} onOpenChange={(nextOpen) => nextOpen ? openModal() : closeModal()}>
      <DialogTrigger asChild>
        <button
          type="button"
          onClick={openModal}
          className="min-w-0 rounded-2xl bg-gray-50 px-3 py-2 text-left transition-colors hover:bg-gray-100"
          data-testid="button-delivery-location"
        >
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-gray-500">Delivery to</span>
          <div className="mt-1 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 text-primary" />
            <span className="max-w-[180px] truncate text-sm font-medium text-foreground" data-testid="text-selected-delivery-location">
              {deliverySummary}
            </span>
          </div>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-lg rounded-[2rem] border-gray-200 p-0 overflow-hidden">
        <DialogHeader className="border-b border-gray-100 bg-white px-6 py-5">
          <DialogTitle className="text-xl">Choose delivery location</DialogTitle>
          <DialogDescription>
            Your physical GPS can be anywhere. We validate only the delivery pincode you choose.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 bg-[#fafaf7] px-6 py-6">
          <Button
            type="button"
            variant="outline"
            className="h-14 w-full justify-start gap-3 rounded-2xl bg-white"
            onClick={() => void validateCurrentLocation()}
            disabled={isValidating}
            data-testid="button-use-current-location"
          >
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Navigation className="h-4 w-4" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-slate-900">Use Current Location</div>
              <div className="text-xs text-slate-500">GPS → reverse geocode → validate pincode</div>
            </div>
          </Button>

          <div className="rounded-[1.5rem] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Search className="h-4 w-4 text-primary" />
              Search / Enter pincode
            </div>
            <div className="flex gap-2">
              <Input
                value={manualPincode}
                onChange={(event) => setManualPincode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter 6-digit delivery pincode"
                className="h-12 rounded-2xl"
                data-testid="input-delivery-pincode"
              />
              <Button
                type="button"
                className="h-12 rounded-2xl px-5"
                disabled={manualPincode.length !== 6 || isValidating}
                onClick={() => void validatePincode(manualPincode, { source: "manual" })}
                data-testid="button-validate-delivery-pincode"
              >
                Check
              </Button>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Example: select any valid Pondicherry pincode even if you are currently outside Pondicherry.
            </p>
          </div>

          {savedAddresses.length > 0 && (
            <div className="rounded-[1.5rem] bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Warehouse className="h-4 w-4 text-primary" />
                Saved delivery addresses
              </div>
              <div className="space-y-2">
                {savedAddresses.slice(0, 4).map((address) => (
                  <button
                    key={address._id}
                    type="button"
                    className="w-full rounded-2xl border border-gray-100 px-4 py-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/5"
                    onClick={() => void selectSavedAddress({
                      pincode: address.postalCode,
                      city: address.city,
                      state: address.state,
                      fullAddress: address.fullAddress,
                    })}
                    data-testid={`button-saved-delivery-${address._id}`}
                  >
                    <p className="text-sm font-semibold text-slate-900">{address.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {[address.fullAddress, address.city, address.state, address.postalCode].filter(Boolean).join(", ")}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {(validationError || selectedLocation) && (
            <div
              className={cn(
                "rounded-2xl px-4 py-3 text-sm",
                validationError || (selectedLocation && !isServiceable)
                  ? "bg-amber-50 text-amber-800"
                  : "bg-emerald-50 text-emerald-700",
              )}
              data-testid="text-delivery-validation-state"
            >
              {validationError
                ? validationError
                : isServiceable
                  ? `Service available for ${selectedLocation?.pincode}`
                  : `Selected pincode ${selectedLocation?.pincode} is not serviceable yet.`}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
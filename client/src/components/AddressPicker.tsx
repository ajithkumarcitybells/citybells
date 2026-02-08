import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MapPin, Home, Briefcase, MapPinned, Plus, Check, Trash2, Navigation, X, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "@/hooks/use-location";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Address } from "@shared/schema";

const addressLabels = [
  { value: "Home", icon: Home, color: "text-blue-500" },
  { value: "Work", icon: Briefcase, color: "text-orange-500" },
  { value: "Other", icon: MapPinned, color: "text-purple-500" },
];

interface AddressFormData {
  label: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
}

const emptyForm: AddressFormData = {
  label: "Home",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
};

export function AddressPicker() {
  const { user } = useAuth();
  const { address, area, city, isLoading: isDetecting, detectLocation, setManualAddress } = useLocation();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<AddressFormData>({ ...emptyForm });

  const { data: addresses = [], isLoading } = useQuery<Address[]>({
    queryKey: ["/api/addresses"],
    enabled: !!user,
  });

  const createAddressMutation = useMutation({
    mutationFn: async (data: AddressFormData) => {
      const res = await apiRequest("POST", "/api/addresses", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      setShowAddForm(false);
      setFormData({ ...emptyForm });
      toast({ title: "Address saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save address", variant: "destructive" });
    },
  });

  const deleteAddressMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/addresses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      toast({ title: "Address deleted" });
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/addresses/${id}/default`);
      return res.json();
    },
    onSuccess: (addr: Address) => {
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      setManualAddress(addr.fullAddress, "", "", "");
      setIsOpen(false);
      toast({ title: "Delivery address updated" });
    },
  });

  const handleDetectLocation = () => {
    detectLocation();
  };

  const handleUseDetectedLocation = () => {
    if (address && address !== "Tap to set location") {
      setFormData((prev) => ({
        ...prev,
        addressLine1: address,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.addressLine1.trim()) {
      toast({ title: "Please enter Address Line 1", variant: "destructive" });
      return;
    }
    if (!formData.city.trim()) {
      toast({ title: "Please enter City", variant: "destructive" });
      return;
    }
    if (!formData.state.trim()) {
      toast({ title: "Please enter State", variant: "destructive" });
      return;
    }
    if (!formData.pincode.trim()) {
      toast({ title: "Please enter Pincode", variant: "destructive" });
      return;
    }
    createAddressMutation.mutate(formData);
  };

  const getLabelIcon = (label: string) => {
    const found = addressLabels.find((l) => l.value === label);
    return found || addressLabels[2];
  };

  const displayAddress = addresses.find((a) => a.isDefault)?.fullAddress || address || "Set delivery location";
  const shortAddress = displayAddress.length > 30 ? displayAddress.substring(0, 30) + "..." : displayAddress;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button 
          className="flex flex-col items-center flex-1 mx-2 cursor-pointer hover:opacity-80 transition-opacity"
          data-testid="button-location-picker"
        >
          <span className="text-xs text-gray-500">Deliver to</span>
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-primary" />
            <span className="text-sm font-medium text-foreground max-w-[150px] truncate" data-testid="text-location">
              {isDetecting ? "Detecting..." : shortAddress}
            </span>
            <ChevronDown className="h-3 w-3 text-gray-400" />
          </div>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Select Delivery Location</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-auto py-3"
            onClick={handleDetectLocation}
            disabled={isDetecting}
            data-testid="button-detect-location"
          >
            <Navigation className="h-5 w-5 text-primary" />
            <div className="text-left">
              <div className="font-medium">Use current location</div>
              <div className="text-xs text-muted-foreground">
                {isDetecting ? "Detecting..." : "Using GPS"}
              </div>
            </div>
          </Button>

          {!showAddForm && user && (
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3 border-dashed"
              onClick={() => setShowAddForm(true)}
              data-testid="button-add-address"
            >
              <Plus className="h-5 w-5 text-primary" />
              <span className="font-medium">Add new address</span>
            </Button>
          )}

          {showAddForm && (
            <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="font-medium">New Address</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAddForm(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div>
                <Label className="text-xs text-gray-600 mb-2 block">Save as</Label>
                <div className="flex gap-2">
                  {addressLabels.map((label) => (
                    <Button
                      key={label.value}
                      type="button"
                      variant={formData.label === label.value ? "default" : "outline"}
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => setFormData((prev) => ({ ...prev, label: label.value }))}
                    >
                      <label.icon className="h-4 w-4" />
                      {label.value}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="addressLine1" className="text-xs text-gray-600">
                    Address Line 1 *
                  </Label>
                  {address && address !== "Tap to set location" && (
                    <button
                      type="button"
                      className="text-xs text-primary underline"
                      onClick={handleUseDetectedLocation}
                    >
                      Use detected location
                    </button>
                  )}
                </div>
                <Input
                  id="addressLine1"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData((prev) => ({ ...prev, addressLine1: e.target.value }))}
                  placeholder="House/Flat No, Street, Area"
                  required
                  data-testid="input-address-line1"
                />
              </div>

              <div>
                <Label htmlFor="addressLine2" className="text-xs text-gray-600">
                  Address Line 2
                </Label>
                <Input
                  id="addressLine2"
                  value={formData.addressLine2}
                  onChange={(e) => setFormData((prev) => ({ ...prev, addressLine2: e.target.value }))}
                  placeholder="Landmark, Colony, Sector (Optional)"
                  data-testid="input-address-line2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="city" className="text-xs text-gray-600">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                    placeholder="City"
                    required
                    data-testid="input-city"
                  />
                </div>
                <div>
                  <Label htmlFor="state" className="text-xs text-gray-600">State *</Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                    placeholder="State"
                    required
                    data-testid="input-state"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="country" className="text-xs text-gray-600">Country *</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value }))}
                    placeholder="Country"
                    required
                    data-testid="input-country"
                  />
                </div>
                <div>
                  <Label htmlFor="pincode" className="text-xs text-gray-600">Pincode *</Label>
                  <Input
                    id="pincode"
                    value={formData.pincode}
                    onChange={(e) => setFormData((prev) => ({ ...prev, pincode: e.target.value }))}
                    placeholder="Pincode"
                    required
                    data-testid="input-pincode"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createAddressMutation.isPending}
                data-testid="button-save-address"
              >
                {createAddressMutation.isPending ? "Saving..." : "Save Address"}
              </Button>
            </form>
          )}

          {user && addresses.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-600 px-1">Saved Addresses</h4>
              {addresses.map((addr) => {
                const labelInfo = getLabelIcon(addr.label);
                const LabelIcon = labelInfo.icon;
                return (
                  <div
                    key={addr.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      addr.isDefault ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                    }`}
                    onClick={() => setDefaultMutation.mutate(addr.id)}
                    data-testid={`address-card-${addr.id}`}
                  >
                    <div className={`p-2 rounded-full bg-gray-100 ${labelInfo.color}`}>
                      <LabelIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{addr.label}</span>
                        {addr.isDefault && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Default</span>
                        )}
                      </div>
                      {addr.addressLine1 && (
                        <p className="text-sm text-gray-600">{addr.addressLine1}</p>
                      )}
                      {addr.addressLine2 && (
                        <p className="text-sm text-gray-500">{addr.addressLine2}</p>
                      )}
                      <p className="text-sm text-gray-500 truncate">
                        {[addr.city, addr.state, addr.pincode].filter(Boolean).join(", ")}
                      </p>
                      {!addr.addressLine1 && addr.fullAddress && (
                        <p className="text-sm text-gray-500 truncate">{addr.fullAddress}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {addr.isDefault && <Check className="h-4 w-4 text-primary" />}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-400 hover:text-red-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteAddressMutation.mutate(addr.id);
                        }}
                        data-testid={`button-delete-address-${addr.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!user && (
            <div className="text-center py-4 text-sm text-gray-500">
              <a href="/auth" className="text-primary font-medium">Login</a> to save and manage your addresses
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

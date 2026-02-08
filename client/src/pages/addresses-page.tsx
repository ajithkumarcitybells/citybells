import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MapPin, Home, Briefcase, MapPinned, Plus, Check, Trash2, Navigation, ArrowLeft, Edit2 } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "@/hooks/use-location";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BottomNav } from "@/components/BottomNav";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Address } from "@shared/schema";

const addressLabels = [
  { value: "Home", icon: Home, color: "text-blue-500", bg: "bg-blue-100" },
  { value: "Work", icon: Briefcase, color: "text-orange-500", bg: "bg-orange-100" },
  { value: "Other", icon: MapPinned, color: "text-purple-500", bg: "bg-purple-100" },
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

export default function AddressesPage() {
  const { user } = useAuth();
  const { address, detectLocation, isLoading: isDetecting } = useLocation();
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
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

  const updateAddressMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AddressFormData }) => {
      const res = await apiRequest("PATCH", `/api/addresses/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      setEditingAddress(null);
      setFormData({ ...emptyForm });
      toast({ title: "Address updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update address", variant: "destructive" });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/addresses"] });
      toast({ title: "Default address updated" });
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
    if (editingAddress) {
      updateAddressMutation.mutate({ id: editingAddress.id, data: formData });
    } else {
      createAddressMutation.mutate(formData);
    }
  };

  const handleEdit = (addr: Address) => {
    setEditingAddress(addr);
    setFormData({
      label: addr.label,
      addressLine1: addr.addressLine1 || addr.fullAddress || "",
      addressLine2: addr.addressLine2 || "",
      city: addr.city || "",
      state: addr.state || "",
      country: addr.country || "India",
      pincode: addr.pincode || "",
    });
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingAddress(null);
    setFormData({ ...emptyForm });
  };

  const getLabelInfo = (label: string) => {
    return addressLabels.find((l) => l.value === label) || addressLabels[2];
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b sticky top-0 z-40 safe-area-pt">
        <div className="flex items-center gap-4 px-4 py-3">
          <Link href="/profile">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">Saved Addresses</h1>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {!showAddForm ? (
          <>
            <Button
              onClick={() => setShowAddForm(true)}
              className="w-full bg-primary text-white"
              data-testid="button-add-address"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Address
            </Button>

            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading addresses...</div>
            ) : addresses.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No saved addresses yet</p>
                <p className="text-sm text-gray-400">Add your first address to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map((addr) => {
                  const labelInfo = getLabelInfo(addr.label);
                  const LabelIcon = labelInfo.icon;
                  return (
                    <div
                      key={addr.id}
                      className="bg-white rounded-xl p-4 shadow-sm"
                      data-testid={`address-card-${addr.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 ${labelInfo.bg} rounded-full flex items-center justify-center flex-shrink-0`}>
                          <LabelIcon className={`h-5 w-5 ${labelInfo.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-800">{addr.label}</span>
                            {addr.isDefault && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                Default
                              </span>
                            )}
                          </div>
                          {addr.addressLine1 && (
                            <p className="text-sm text-gray-700 mt-1">{addr.addressLine1}</p>
                          )}
                          {addr.addressLine2 && (
                            <p className="text-sm text-gray-600">{addr.addressLine2}</p>
                          )}
                          <p className="text-sm text-gray-600">
                            {[addr.city, addr.state, addr.pincode].filter(Boolean).join(", ")}
                          </p>
                          {addr.country && (
                            <p className="text-xs text-gray-500">{addr.country}</p>
                          )}
                          {!addr.addressLine1 && addr.fullAddress && (
                            <p className="text-sm text-gray-600 mt-1">{addr.fullAddress}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                        {!addr.isDefault && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDefaultMutation.mutate(addr.id)}
                            disabled={setDefaultMutation.isPending}
                            data-testid={`button-set-default-${addr.id}`}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Set Default
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(addr)}
                          data-testid={`button-edit-${addr.id}`}
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => deleteAddressMutation.mutate(addr.id)}
                          disabled={deleteAddressMutation.isPending}
                          data-testid={`button-delete-${addr.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-4">
              {editingAddress ? "Edit Address" : "Add New Address"}
            </h3>

            <Button
              type="button"
              variant="outline"
              onClick={handleDetectLocation}
              disabled={isDetecting}
              className="w-full mb-4"
              data-testid="button-detect-location"
            >
              <Navigation className="h-4 w-4 mr-2" />
              {isDetecting ? "Detecting..." : "Use Current Location"}
            </Button>

            {address && address !== "Tap to set location" && (
              <div className="mb-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Detected: {address}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleUseDetectedLocation}
                  data-testid="button-use-detected"
                >
                  Use This Address
                </Button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label className="text-sm text-gray-600">Address Type</Label>
                <div className="flex gap-2 mt-2">
                  {addressLabels.map((label) => {
                    const Icon = label.icon;
                    return (
                      <Button
                        key={label.value}
                        type="button"
                        variant={formData.label === label.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFormData((prev) => ({ ...prev, label: label.value }))}
                        data-testid={`button-label-${label.value.toLowerCase()}`}
                      >
                        <Icon className="h-4 w-4 mr-1" />
                        {label.value}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div>
                <Label className="text-sm text-gray-600">Address Line 1 *</Label>
                <Input
                  value={formData.addressLine1}
                  onChange={(e) => setFormData((prev) => ({ ...prev, addressLine1: e.target.value }))}
                  placeholder="House/Flat No, Street, Area"
                  className="mt-1"
                  data-testid="input-address-line1"
                />
              </div>

              <div>
                <Label className="text-sm text-gray-600">Address Line 2</Label>
                <Input
                  value={formData.addressLine2}
                  onChange={(e) => setFormData((prev) => ({ ...prev, addressLine2: e.target.value }))}
                  placeholder="Landmark, Colony, Sector (Optional)"
                  className="mt-1"
                  data-testid="input-address-line2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm text-gray-600">City *</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
                    placeholder="City"
                    className="mt-1"
                    data-testid="input-city"
                  />
                </div>
                <div>
                  <Label className="text-sm text-gray-600">State *</Label>
                  <Input
                    value={formData.state}
                    onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
                    placeholder="State"
                    className="mt-1"
                    data-testid="input-state"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm text-gray-600">Country *</Label>
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData((prev) => ({ ...prev, country: e.target.value }))}
                    placeholder="Country"
                    className="mt-1"
                    data-testid="input-country"
                  />
                </div>
                <div>
                  <Label className="text-sm text-gray-600">Pincode *</Label>
                  <Input
                    value={formData.pincode}
                    onChange={(e) => setFormData((prev) => ({ ...prev, pincode: e.target.value }))}
                    placeholder="Pincode"
                    className="mt-1"
                    data-testid="input-pincode"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1"
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-primary text-white"
                  disabled={createAddressMutation.isPending || updateAddressMutation.isPending}
                  data-testid="button-save-address"
                >
                  {createAddressMutation.isPending || updateAddressMutation.isPending
                    ? "Saving..."
                    : editingAddress
                    ? "Update Address"
                    : "Save Address"}
                </Button>
              </div>
            </form>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

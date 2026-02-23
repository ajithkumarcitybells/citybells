import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Store, IndianRupee, Percent, Save } from "lucide-react";
import { AdminLayout } from "./index";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { SellerProfile } from "@shared/schema";

export default function AdminEcomSellersPage() {
  const { toast } = useToast();
  const [selectedSeller, setSelectedSeller] = useState<SellerProfile | null>(null);
  const [commissionRate, setCommissionRate] = useState("");

  const { data: sellers = [], isLoading } = useQuery<SellerProfile[]>({
    queryKey: ["/api/admin/ecom/sellers"],
  });

  const updateCommissionMutation = useMutation({
    mutationFn: async ({ userId, commissionRate }: { userId: string; commissionRate: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/ecom/sellers/${userId}/commission`, { commissionRate });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ecom/sellers"] });
      setSelectedSeller(null);
      toast({ title: "Commission rate updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update commission", description: error.message, variant: "destructive" });
    },
  });

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(num);
  };

  const openSellerDialog = (seller: SellerProfile) => {
    setSelectedSeller(seller);
    setCommissionRate(seller.commissionRate || "10.00");
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800" data-testid="text-ecom-sellers-title">E-Commerce Sellers</h1>
        <p className="text-gray-500">Manage seller profiles and commission rates</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : sellers.length === 0 ? (
        <div className="text-center py-16">
          <Store className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600" data-testid="text-empty-sellers">No sellers registered yet</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sellers.map((seller) => (
            <div
              key={seller.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover-elevate cursor-pointer"
              onClick={() => openSellerDialog(seller)}
              data-testid={`seller-card-${seller.id}`}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  {seller.logo ? (
                    <img src={seller.logo} alt={seller.storeName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                      <Store className="h-5 w-5 text-purple-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-800 truncate" data-testid={`text-store-name-${seller.id}`}>
                    {seller.storeName}
                  </h3>
                  <p className="text-xs text-gray-500 truncate">{seller.storeDescription || "No description"}</p>
                </div>
                <Badge className={`${seller.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'} no-default-hover-elevate no-default-active-elevate`}>
                  {seller.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <Percent className="h-3 w-3" />
                    <span>Commission</span>
                  </div>
                  <p className="font-semibold text-gray-800" data-testid={`text-commission-${seller.id}`}>
                    {seller.commissionRate || "10.00"}%
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                    <IndianRupee className="h-3 w-3" />
                    <span>Balance</span>
                  </div>
                  <p className="font-semibold text-gray-800" data-testid={`text-balance-${seller.id}`}>
                    {formatCurrency(seller.walletBalance || "0")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!selectedSeller} onOpenChange={(open) => !open && setSelectedSeller(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seller Details</DialogTitle>
          </DialogHeader>
          {selectedSeller && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  {selectedSeller.logo ? (
                    <img src={selectedSeller.logo} alt={selectedSeller.storeName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                      <Store className="h-6 w-6 text-purple-400" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg" data-testid="text-detail-store-name">{selectedSeller.storeName}</h3>
                  <p className="text-sm text-gray-500">{selectedSeller.storeDescription || "No description"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Status</p>
                  <p className="font-semibold">{selectedSeller.isActive ? "Active" : "Inactive"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Wallet Balance</p>
                  <p className="font-semibold">{formatCurrency(selectedSeller.walletBalance || "0")}</p>
                </div>
                <div>
                  <p className="text-gray-500">Joined</p>
                  <p className="font-semibold">
                    {selectedSeller.createdAt ? new Date(selectedSeller.createdAt).toLocaleDateString("en-IN") : "N/A"}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Commission Rate (%)</label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    className="w-32"
                    data-testid="input-commission-rate"
                  />
                  <Button
                    onClick={() => updateCommissionMutation.mutate({
                      userId: selectedSeller.userId,
                      commissionRate,
                    })}
                    disabled={updateCommissionMutation.isPending}
                    data-testid="button-update-commission"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateCommissionMutation.isPending ? "Saving..." : "Update"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

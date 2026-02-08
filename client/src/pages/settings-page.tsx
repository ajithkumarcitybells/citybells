import { useState } from "react";
import { Link } from "wouter";
import cityBellLogo from "@assets/citybells-logo_1769903304782.png";
import { ArrowLeft, User, Lock, Bell, Shield, Info, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BottomNav } from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [notifications, setNotifications] = useState({
    orderUpdates: true,
    promotions: true,
    newArrivals: false,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof profileData) => {
      const res = await apiRequest("PATCH", "/api/user/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Profile updated successfully" });
      setActiveSection(null);
    },
    onError: () => {
      toast({ title: "Failed to update profile", variant: "destructive" });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest("PATCH", "/api/user/password", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully" });
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setActiveSection(null);
    },
    onError: (error: any) => {
      toast({ 
        title: error?.message || "Failed to change password", 
        variant: "destructive" 
      });
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    changePasswordMutation.mutate({
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword,
    });
  };

  const settingsItems = [
    { id: "profile", icon: User, label: "Edit Profile", description: "Update your name, email, phone" },
    { id: "password", icon: Lock, label: "Change Password", description: "Update your password" },
    { id: "notifications", icon: Bell, label: "Notifications", description: "Manage notification preferences" },
    { id: "privacy", icon: Shield, label: "Privacy & Security", description: "View privacy settings" },
    { id: "about", icon: Info, label: "About", description: "App version and info" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b sticky top-0 z-40 safe-area-pt">
        <div className="flex items-center gap-4 px-4 py-3">
          <Link href={activeSection ? "#" : "/profile"}>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => {
                if (activeSection) {
                  e.preventDefault();
                  setActiveSection(null);
                }
              }}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-semibold">
            {activeSection === "profile" ? "Edit Profile" :
             activeSection === "password" ? "Change Password" :
             activeSection === "notifications" ? "Notifications" :
             activeSection === "privacy" ? "Privacy & Security" :
             activeSection === "about" ? "About" : "Settings"}
          </h1>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto">
        {!activeSection ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {settingsItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center gap-4 p-4 hover-elevate cursor-pointer ${
                    index < settingsItems.length - 1 ? "border-b border-gray-100" : ""
                  }`}
                  data-testid={`link-settings-${item.id}`}
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <Icon className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-gray-800">{item.label}</span>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              );
            })}
          </div>
        ) : activeSection === "profile" ? (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <Label className="text-sm text-gray-600">Full Name</Label>
                <Input
                  value={profileData.name}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter your name"
                  className="mt-1"
                  data-testid="input-name"
                />
              </div>
              <div>
                <Label className="text-sm text-gray-600">Email</Label>
                <Input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email"
                  className="mt-1"
                  data-testid="input-email"
                />
              </div>
              <div>
                <Label className="text-sm text-gray-600">Phone Number</Label>
                <Input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter your phone"
                  className="mt-1"
                  data-testid="input-phone"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary text-white"
                disabled={updateProfileMutation.isPending}
                data-testid="button-save-profile"
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </div>
        ) : activeSection === "password" ? (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <Label className="text-sm text-gray-600">Current Password</Label>
                <Input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData((prev) => ({ ...prev, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                  className="mt-1"
                  data-testid="input-current-password"
                />
              </div>
              <div>
                <Label className="text-sm text-gray-600">New Password</Label>
                <Input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData((prev) => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                  className="mt-1"
                  data-testid="input-new-password"
                />
              </div>
              <div>
                <Label className="text-sm text-gray-600">Confirm New Password</Label>
                <Input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                  className="mt-1"
                  data-testid="input-confirm-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-primary text-white"
                disabled={changePasswordMutation.isPending}
                data-testid="button-change-password"
              >
                {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
              </Button>
            </form>
          </div>
        ) : activeSection === "notifications" ? (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Order Updates</p>
                <p className="text-xs text-gray-500">Get notified about your order status</p>
              </div>
              <Switch
                checked={notifications.orderUpdates}
                onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, orderUpdates: checked }))}
                data-testid="switch-order-updates"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">Promotions & Offers</p>
                <p className="text-xs text-gray-500">Receive special deals and discounts</p>
              </div>
              <Switch
                checked={notifications.promotions}
                onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, promotions: checked }))}
                data-testid="switch-promotions"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-800">New Arrivals</p>
                <p className="text-xs text-gray-500">Be first to know about new products</p>
              </div>
              <Switch
                checked={notifications.newArrivals}
                onCheckedChange={(checked) => setNotifications((prev) => ({ ...prev, newArrivals: checked }))}
                data-testid="switch-new-arrivals"
              />
            </div>
            <p className="text-xs text-gray-400 text-center pt-2">
              Notification settings are saved automatically
            </p>
          </div>
        ) : activeSection === "privacy" ? (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
            <div className="text-center py-4">
              <Shield className="h-12 w-12 text-primary mx-auto mb-3" />
              <h3 className="font-semibold text-gray-800">Your Privacy Matters</h3>
              <p className="text-sm text-gray-500 mt-2">
                We take your privacy seriously. Your personal data is encrypted and securely stored.
              </p>
            </div>
            <div className="space-y-3 text-sm text-gray-600">
              <p>• Your payment information is never stored on our servers</p>
              <p>• Location data is only used to improve delivery accuracy</p>
              <p>• You can request deletion of your data at any time</p>
            </div>
          </div>
        ) : activeSection === "about" ? (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-center py-4">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <img 
                  src={cityBellLogo} 
                  alt="City Bell" 
                  className="w-14 h-14 object-contain"
                />
              </div>
              <h3 className="font-bold text-xl text-gray-800">City Bell</h3>
              <p className="text-sm text-gray-500">Super App</p>
              <p className="text-xs text-gray-400 mt-2">Version 1.0.0</p>
            </div>
            <div className="space-y-2 text-sm text-gray-600 text-center mt-4 pt-4 border-t">
              <p>Your one-stop solution for Grocery, Food, Taxi, and more!</p>
              <p className="text-xs text-gray-400">© 2026 City Bell. All rights reserved.</p>
            </div>
          </div>
        ) : null}
      </main>

      <BottomNav />
    </div>
  );
}

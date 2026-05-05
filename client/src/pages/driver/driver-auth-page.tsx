import React from "react";
import { useLocation } from "wouter";
import { AuthModal } from "@/components/AuthModal";
import { queryClient } from "@/lib/queryClient";

export function DriverAuthPage() {
  const [, setLocation] = useLocation();

  const handleAuthSuccess = (driver: any, token?: string) => {
    if (token) {
      localStorage.setItem("driverToken", token);
    } else {
      localStorage.removeItem("driverToken");
    }
    if (driver?.id) {
      localStorage.setItem("driverId", driver.id);
    }
    queryClient.setQueryData(["/api/user"], driver);
    setLocation("/taxi/driver");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-50">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Join Our Driver Network
        </h1>
        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
          Earn money on your own schedule. Drive, earn, and build your future
          with us.
        </p>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {[
            {
              icon: "💰",
              title: "Earn Money",
              description:
                "Get paid for every ride. Earn up to ₹50,000 per month",
            },
            {
              icon: "⏰",
              title: "Flexible Schedule",
              description:
                "Work whenever you want. Choose your own hours and routes",
            },
            {
              icon: "🛡️",
              title: "Safe & Secure",
              description:
                "Insurance coverage and 24/7 support for your safety",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="bg-white rounded-lg p-8 shadow-md hover:shadow-lg transition"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* CTA Button */}
        <button
          type="button"
          className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-bold px-8 py-4 rounded-lg hover:shadow-lg transition text-lg"
        >
          Get Started as a Driver
        </button>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={true}
        initialTab="driver-login"
        onClose={() => setLocation("/")}
        onAuthSuccess={handleAuthSuccess}
      />
    </div>
  );
}

export default DriverAuthPage;

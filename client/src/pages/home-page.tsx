import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { ServiceCard } from "@/components/ServiceCard";
import { Store, ArrowRight } from "lucide-react";
import { Link } from "wouter";

const services = [
  {
    name: "Grocery",
    description: "FRESH & LOCAL DELIVERED FAST",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80",
    isActive: true,
    href: "/grocery",
    isLarge: true,
  },
  {
    name: "E-Commerce",
    description: "ESSENTIALS & ELEGANCE",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80",
    isActive: true,
    href: "/ecommerce",
  },
  {
    name: "Food",
    description: "DELICIOUS MEALS DELIVERED",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
    isActive: false,
  },
  {
    name: "City Move",
    description: "INSTANT DELIVERY",
    image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80",
    isActive: false,
  },
  {
    name: "Hotel",
    description: "BOOK YOUR STAY",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
    isActive: false,
  },
  {
    name: "Taxi",
    description: "RIDE WITH COMFORT",
    image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80",
    isActive: false,
  },
  {
    name: "City Serve",
    description: "HOME SERVICES AT YOUR DOORSTEP",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80",
    isActive: false,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />
      
      <main className="px-4 py-4 max-w-lg mx-auto">
        <div className="space-y-3">
          {/* Grocery - Full width large card */}
          <ServiceCard {...services[0]} />
          
          {/* E-Commerce + Food - Side by side */}
          <div className="grid grid-cols-2 gap-3">
            <ServiceCard {...services[1]} />
            <ServiceCard {...services[2]} />
          </div>
          
          {/* City Move - Full width */}
          <ServiceCard {...services[3]} isLarge />
          
          {/* Hotel + Taxi - Side by side */}
          <div className="grid grid-cols-2 gap-3">
            <ServiceCard {...services[4]} />
            <ServiceCard {...services[5]} />
          </div>
          
          {/* City Serve - Full width */}
          <ServiceCard {...services[6]} isLarge />

          <Link href="/vendors">
            <div className="mt-4 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-4 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform" data-testid="link-sell-on-citybell">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Store className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-base">Sell on City Bell</h3>
                <p className="text-orange-100 text-xs">Start your online store and reach thousands of customers</p>
              </div>
              <ArrowRight className="h-5 w-5 text-white flex-shrink-0" />
            </div>
          </Link>
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
}

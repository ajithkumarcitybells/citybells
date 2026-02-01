import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { ServiceCard } from "@/components/ServiceCard";

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
    isActive: false,
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
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />
      
      <main className="px-4 py-4 max-w-lg mx-auto">
        <div className="space-y-4">
          <ServiceCard {...services[0]} />
          
          <div className="grid grid-cols-2 gap-3">
            {services.slice(1).map((service) => (
              <ServiceCard 
                key={service.name} 
                {...service} 
              />
            ))}
          </div>
        </div>
      </main>
      
      <BottomNav />
    </div>
  );
}

import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "./index";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Service } from "@shared/schema";

const defaultServices = [
  { name: "Grocery", description: "Fresh & Local Delivered Fast", image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400" },
  { name: "E-Commerce", description: "Essentials & Elegance", image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400" },
  { name: "Food", description: "Delicious Meals Delivered", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400" },
  { name: "City Move", description: "Instant Delivery", image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400" },
  { name: "Hotel", description: "Book Your Stay", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400" },
  { name: "Taxi", description: "Ride With Comfort", image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400" },
];

export default function AdminServicesPage() {
  const { toast } = useToast();

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const toggleServiceMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/services/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({ title: "Service updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update service", description: error.message, variant: "destructive" });
    },
  });

  const displayServices = services.length > 0 
    ? services 
    : defaultServices.map((s, i) => ({ 
        id: `temp-${i}`, 
        name: s.name, 
        description: s.description, 
        image: s.image, 
        isActive: s.name === "Grocery",
        sortOrder: i 
      }));

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Services</h1>
        <p className="text-gray-500">Toggle services on/off for your super app</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayServices.map((service) => (
            <div 
              key={service.id}
              className={`relative rounded-xl overflow-hidden shadow-sm border border-gray-100 ${
                !service.isActive ? 'opacity-60' : ''
              }`}
              data-testid={`service-card-${service.id}`}
            >
              <div className="aspect-[4/3] relative">
                <img 
                  src={service.image || ''} 
                  alt={service.name}
                  className={`w-full h-full object-cover ${!service.isActive ? 'grayscale' : ''}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-bold text-white text-xl">{service.name}</h3>
                  <p className="text-white/80 text-sm">{service.description}</p>
                </div>
              </div>
              
              <div className="bg-white p-4 flex items-center justify-between">
                <div>
                  <span className={`text-sm font-medium ${
                    service.isActive ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {service.isActive ? 'Active' : 'Coming Soon'}
                  </span>
                </div>
                <Switch
                  checked={service.isActive ?? false}
                  onCheckedChange={(checked) => {
                    if (!service.id.startsWith('temp-')) {
                      toggleServiceMutation.mutate({ id: service.id, isActive: checked });
                    } else {
                      toast({ 
                        title: "Service not initialized", 
                        description: "Please refresh to load services from database",
                        variant: "destructive"
                      });
                    }
                  }}
                  disabled={service.name === "Grocery"}
                  data-testid={`toggle-${service.id}`}
                />
              </div>
              
              {service.name === "Grocery" && (
                <div className="absolute top-3 right-3 bg-primary text-white text-xs font-medium px-2 py-1 rounded-full">
                  Always Active
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
        <h3 className="font-semibold text-yellow-800 mb-2">Note</h3>
        <p className="text-sm text-yellow-700">
          The Grocery service is always active as it's the core service. Other services can be toggled on/off as they become available. When a service is inactive, users will see a "Coming Soon" label on the home screen.
        </p>
      </div>
    </AdminLayout>
  );
}

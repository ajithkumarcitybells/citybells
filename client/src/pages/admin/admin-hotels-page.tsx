import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "./index";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Star } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Hotel {
  id: string;
  name: string;
  city: string;
  price?: string | number | null;
  starRating?: number | null;
  rating?: string | null;
  amenities?: string[] | null;
  isActive?: boolean | null;
  images?: string[] | null;
  landmark?: string | null;
  roomTypes?: string[] | null;
  totalRooms?: number | null;
  availableRooms?: number | null;
}

interface HotelBooking {
  id: string;
  hotelId: string;
  guestName?: string | null;
  checkIn: string;
  checkOut: string;
  totalPrice: string;
  status: string | null;
}

const bookingStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  checked_in: "bg-orange-100 text-orange-800",
  checked_out: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

function formatCurrency(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
}

export default function AdminHotelsPage() {
  const [activeTab, setActiveTab] = useState<"hotels" | "bookings">("hotels");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingHotel, setEditingHotel] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const [form, setForm] = useState<any>({
    name: "",
    description: "",
    city: "",
    address: "",
    landmark: "",
    price: "",
    discount: "",
    starRating: 3,
    roomTypes: [] as string[],
    totalRooms: 0,
    availableRooms: 0,
    amenities: [] as string[],
    images: [] as Array<{ file?: File; url?: string; objectPath?: string; isPrimary?: boolean }>,
  });

  useEffect(() => {
    if (editingHotel) {
      setForm({
        name: editingHotel.name || "",
        description: editingHotel.description || "",
        city: editingHotel.city || "",
        address: editingHotel.address || "",
        landmark: (editingHotel.landmark as string) || "",
        price: editingHotel.price || "",
        discount: editingHotel.discount || "",
        starRating: editingHotel.starRating || 3,
        roomTypes: editingHotel.roomTypes || [],
        totalRooms: editingHotel.totalRooms || 0,
        availableRooms: editingHotel.availableRooms || 0,
        amenities: editingHotel.amenities || [],
        images: (editingHotel.images || []).map((u: string, i: number) => ({ url: u, isPrimary: i === 0 })) as any,
      });
    } else {
      setForm((f: any) => ({ ...f, name: "", description: "", city: "", address: "", landmark: "", price: "", discount: "", starRating: 3, roomTypes: [], totalRooms: 0, availableRooms: 0, amenities: [], images: [] }));
    }
  }, [editingHotel]);

  const { data: hotels, isLoading: hotelsLoading } = useQuery<Hotel[]>({
    queryKey: ["/api/admin/hotels"],
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery<HotelBooking[]>({
    queryKey: ["/api/admin/hotel-bookings"],
  });

  const tabs = [
    { key: "hotels" as const, label: "Hotels" },
    { key: "bookings" as const, label: "Bookings" },
  ];

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="w-10 h-10 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-center">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800" data-testid="text-admin-hotels-title">Hotel Management</h1>
            <p className="text-sm text-gray-500">Manage hotels and bookings</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? "bg-primary text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover-elevate"
              }`}
              data-testid={`tab-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "hotels" && (
          <Card className="overflow-visible">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-semibold text-gray-800" data-testid="text-hotels-heading">Hotels</h2>
              <div className="flex items-center gap-2">
                {hotels && (
                  <Badge className="no-default-hover-elevate no-default-active-elevate" data-testid="badge-hotels-count">
                    {hotels.length} hotels
                  </Badge>
                )}
                <Button variant="default" size="sm" onClick={() => { setEditingHotel(null); setDrawerOpen(true); }} aria-label="Add Hotel">Add Hotel</Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              {hotelsLoading ? (
                <div className="p-10 text-center text-gray-400">Loading hotels...</div>
              ) : hotels && hotels.length > 0 ? (
                <table className="w-full text-sm" data-testid="table-hotels">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-5 py-3 font-medium">City</th>
                      <th className="px-5 py-3 font-medium">Star Rating</th>
                      <th className="px-5 py-3 font-medium">Rating</th>
                      <th className="px-5 py-3 font-medium">Amenities</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                    </tr>
                      <th className="px-5 py-3 font-medium">Price</th>
                      <th className="px-5 py-3 font-medium">Actions</th>
                  </thead>
                  <tbody>
                    {hotels.map((hotel) => (
                      <tr key={hotel.id} className="border-b border-gray-50 last:border-0" data-testid={`row-hotel-${hotel.id}`}>
                        <td className="px-5 py-3 font-medium text-gray-800" data-testid={`text-hotel-name-${hotel.id}`}>
                          {hotel.name}
                        </td>
                        <td className="px-5 py-3 text-gray-600" data-testid={`text-hotel-city-${hotel.id}`}>
                        <td className="px-5 py-3 text-gray-700">{hotel.price ? (Number(hotel.price).toLocaleString('en-IN')) : '--'}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => { setEditingHotel(hotel); setDrawerOpen(true); }} aria-label={`Edit ${hotel.name}`}>Edit</Button>
                            <Button size="sm" variant="destructive" onClick={async () => { if (!confirm('Delete this hotel?')) return; try { await apiRequest('DELETE', `/api/admin/hotels/${hotel.id}`); queryClient.invalidateQueries({ queryKey: ['/api/admin/hotels'] }); toast.toast({ title: 'Hotel deleted' }); } catch (e) { toast.toast({ title: 'Delete failed', description: (e as Error).message }); } }} aria-label={`Delete ${hotel.name}`}>Delete</Button>
                          </div>
                        </td>
                          {hotel.city}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-0.5" data-testid={`stars-hotel-${hotel.id}`}>
                            {Array.from({ length: hotel.starRating || 0 }).map((_, i) => (
                              <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            ))}
                            {(hotel.starRating || 0) === 0 && <span className="text-gray-400">--</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-gray-600" data-testid={`text-hotel-rating-${hotel.id}`}>
                          {hotel.rating || "--"}
                        </td>
                        <td className="px-5 py-3 text-gray-600" data-testid={`text-hotel-amenities-${hotel.id}`}>
                          {hotel.amenities?.length || 0}
                        </td>
                        <td className="px-5 py-3">
                          <Badge
                            className={`no-default-hover-elevate no-default-active-elevate ${
                              hotel.isActive !== false ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                            }`}
                            data-testid={`badge-hotel-status-${hotel.id}`}
                          >
                            {hotel.isActive !== false ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-10 text-center text-gray-400">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hotels found</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {activeTab === "bookings" && (
          <Card className="overflow-visible">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-semibold text-gray-800" data-testid="text-bookings-heading">Hotel Bookings</h2>
              {bookings && (
                <Badge className="no-default-hover-elevate no-default-active-elevate" data-testid="badge-bookings-count">
                  {bookings.length} bookings
                </Badge>
              )}
            </div>
            <div className="overflow-x-auto">
              {bookingsLoading ? (
                <div className="p-10 text-center text-gray-400">Loading bookings...</div>
              ) : bookings && bookings.length > 0 ? (
                <table className="w-full text-sm" data-testid="table-hotel-bookings">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="px-5 py-3 font-medium">Booking ID</th>
                      <th className="px-5 py-3 font-medium">Hotel</th>
                      <th className="px-5 py-3 font-medium">Guest Name</th>
                      <th className="px-5 py-3 font-medium">Check-in</th>
                      <th className="px-5 py-3 font-medium">Check-out</th>
                      <th className="px-5 py-3 font-medium">Total Price</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="border-b border-gray-50 last:border-0" data-testid={`row-booking-${booking.id}`}>
                        <td className="px-5 py-3 font-mono text-gray-600" data-testid={`text-booking-id-${booking.id}`}>
                          {booking.id.slice(0, 8)}...
                        </td>
                        <td className="px-5 py-3 text-gray-700" data-testid={`text-booking-hotel-${booking.id}`}>
                          {booking.hotelId.slice(0, 8)}...
                        </td>
                        <td className="px-5 py-3 text-gray-700" data-testid={`text-booking-guest-${booking.id}`}>
                          {booking.guestName || "N/A"}
                        </td>
                        <td className="px-5 py-3 text-gray-600" data-testid={`text-booking-checkin-${booking.id}`}>
                          {new Date(booking.checkIn).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-5 py-3 text-gray-600" data-testid={`text-booking-checkout-${booking.id}`}>
                          {new Date(booking.checkOut).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-5 py-3 font-medium text-gray-800" data-testid={`text-booking-price-${booking.id}`}>
                          {formatCurrency(booking.totalPrice)}
                        </td>
                        <td className="px-5 py-3">
                          <Badge
                            className={`no-default-hover-elevate no-default-active-elevate ${
                              bookingStatusColors[booking.status || "pending"] || "bg-gray-100 text-gray-800"
                            }`}
                            data-testid={`badge-booking-status-${booking.id}`}
                          >
                            {(booking.status || "pending").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-10 text-center text-gray-400">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No bookings found</p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
      <Drawer open={drawerOpen} onOpenChange={(o: boolean) => { if (!o) setEditingHotel(null); setDrawerOpen(o); }}>
        <DrawerContent className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-xl p-4">
          <div className="flex items-start justify-between">
            <DrawerHeader>
              <DrawerTitle>{editingHotel ? 'Edit Hotel' : 'Add Hotel'}</DrawerTitle>
            </DrawerHeader>
            <DrawerClose asChild>
              <button aria-label="Close drawer" onClick={() => setDrawerOpen(false)} className="text-gray-600 hover:text-gray-800">✕</button>
            </DrawerClose>
          </div>

          <div className="mt-2 overflow-y-auto pb-20">
            <form onSubmit={(e) => { e.preventDefault(); void (async () => {
              if (submitting) return;
              // basic validation
              if (!form.name || !form.city || !form.price) { toast.toast({ title: 'Validation', description: 'Name, city and price are required' }); return; }
              setSubmitting(true);
              try {
                // upload new files
                const imagesOut: string[] = [];
                for (const it of form.images || []) {
                  if (it.objectPath) { imagesOut.push(it.objectPath); continue; }
                  if (it.file) {
                    // request presigned url
                    const metaRes = await apiRequest('POST', '/api/uploads/request-url', { name: it.file.name, size: it.file.size, contentType: it.file.type });
                    const pres = await metaRes.json();
                    // upload file via PUT
                    await fetch(pres.uploadURL, { method: 'PUT', body: it.file });
                    imagesOut.push(pres.objectPath || pres.metadata?.name || pres.uploadURL);
                  }
                }

                const payload: any = {
                  name: form.name,
                  description: form.description,
                  city: form.city,
                  address: form.address,
                  landmark: form.landmark,
                  price: form.price,
                  discount: form.discount,
                  starRating: Number(form.starRating) || 0,
                  roomTypes: form.roomTypes || [],
                  totalRooms: Number(form.totalRooms) || 0,
                  availableRooms: Number(form.availableRooms) || 0,
                  amenities: form.amenities || [],
                  images: imagesOut,
                };

                if (editingHotel) {
                  await apiRequest('PATCH', `/api/admin/hotels/${editingHotel.id}`, payload);
                  toast.toast({ title: 'Hotel updated' });
                } else {
                  await apiRequest('POST', '/api/admin/hotels', payload);
                  toast.toast({ title: 'Hotel added successfully' });
                }
                queryClient.invalidateQueries({ queryKey: ['/api/admin/hotels'] });
                setDrawerOpen(false);
              } catch (err) {
                toast.toast({ title: 'Submit failed', description: (err as Error).message });
              } finally { setSubmitting(false); }
            })() }}>
              <div className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input aria-label="Hotel name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea aria-label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div>
                  <Label>City / Location</Label>
                  <Input aria-label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input aria-label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div>
                  <Label>Landmark</Label>
                  <Input aria-label="Landmark" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} placeholder="Near Airport" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Price per night</Label>
                    <Input type="number" aria-label="Price" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Discount</Label>
                    <Input type="number" aria-label="Discount" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Star Rating</Label>
                    <Input type="number" min={1} max={5} aria-label="Star rating" value={form.starRating} onChange={(e) => setForm({ ...form, starRating: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Room Types (comma separated)</Label>
                    <Input aria-label="Room types" value={(form.roomTypes || []).join(', ')} onChange={(e) => setForm({ ...form, roomTypes: e.target.value.split(',').map((s:string)=>s.trim()).filter(Boolean) })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Total rooms</Label>
                    <Input type="number" aria-label="Total rooms" value={form.totalRooms} onChange={(e)=>setForm({ ...form, totalRooms: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Available rooms</Label>
                    <Input type="number" aria-label="Available rooms" value={form.availableRooms} onChange={(e)=>setForm({ ...form, availableRooms: Number(e.target.value) })} />
                  </div>
                </div>

                <div>
                  <Label>Facilities</Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {['Free WiFi','Air Conditioning','Parking','Swimming Pool','Restaurant','Breakfast Included','Gym','Spa'].map((f) => (
                      <label key={f} className="flex items-center gap-2">
                        <Checkbox checked={(form.amenities||[]).includes(f)} onCheckedChange={(v)=>{
                          const set = new Set(form.amenities||[]);
                          if (v) set.add(f); else set.delete(f);
                          setForm({ ...form, amenities: Array.from(set) });
                        }} aria-label={`facility-${f}`} />
                        <span className="text-sm">{f}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Images</Label>
                  <input aria-label="Upload images" type="file" multiple accept="image/*" onChange={(e)=>{
                    const files = Array.from(e.target.files || []);
                    const mapped = files.map(f => ({ file: f as File, url: URL.createObjectURL(f), isPrimary: false }));
                    setForm({ ...form, images: [...(form.images||[]), ...mapped] });
                  }} />
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {(form.images||[]).map((it: any, idx:number) => (
                      <div key={idx} className="relative">
                        <img src={it.url} alt={`preview-${idx}`} className="w-24 h-16 object-cover rounded" />
                        <div className="flex gap-1 mt-1">
                          <button type="button" className="text-xs px-2 py-1 bg-white border rounded" onClick={()=>{ setForm({ ...form, images: form.images.map((im:any,i:number)=> i===idx?{...im,isPrimary:true}:{...im,isPrimary:false}) }); }}>Primary</button>
                          <button type="button" className="text-xs px-2 py-1 bg-white border rounded" onClick={()=>{ setForm({ ...form, images: form.images.filter((_:any,i:number)=>i!==idx) }); }}>Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <Button type="submit" variant="default" disabled={submitting}>{submitting ? 'Saving...' : (editingHotel ? 'Update Hotel' : 'Add Hotel')}</Button>
                </div>
              </div>
            </form>
          </div>
        </DrawerContent>
      </Drawer>
    </AdminLayout>
  );
}

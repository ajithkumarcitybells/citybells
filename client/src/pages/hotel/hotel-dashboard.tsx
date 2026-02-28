import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft, Building2, BedDouble, CalendarCheck, BarChart3,
  Plus, Pencil, Trash2, Users, DollarSign, LogIn, LogOut
} from "lucide-react";
import type { Hotel, HotelRoom, HotelBooking } from "@shared/schema";

type HotelWithRooms = Hotel & { rooms: HotelRoom[] };

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  checked_in: "bg-green-100 text-green-800",
  checked_out: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  checked_out: "Checked Out",
  cancelled: "Cancelled",
};

export default function HotelDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [roomDialog, setRoomDialog] = useState(false);
  const [editingRoom, setEditingRoom] = useState<HotelRoom | null>(null);
  const [roomForm, setRoomForm] = useState({
    name: "", type: "standard", price: "", maxGuests: "2",
    amenities: "", totalRooms: "10", isAvailable: true,
  });

  const { data: hotel, isLoading: hotelLoading } = useQuery<HotelWithRooms>({
    queryKey: ["/api/hotel-manager/hotel"],
    enabled: !!user,
  });

  const { data: rooms = [], isLoading: roomsLoading } = useQuery<HotelRoom[]>({
    queryKey: ["/api/hotel-manager/rooms"],
    enabled: !!user,
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<HotelBooking[]>({
    queryKey: ["/api/hotel-manager/bookings"],
    enabled: !!user,
  });

  const createRoomMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/hotel-manager/rooms", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Room added" });
      queryClient.invalidateQueries({ queryKey: ["/api/hotel-manager/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hotel-manager/hotel"] });
      setRoomDialog(false);
      resetRoomForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const updateRoomMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/hotel-manager/rooms/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Room updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/hotel-manager/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hotel-manager/hotel"] });
      setRoomDialog(false);
      setEditingRoom(null);
      resetRoomForm();
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/hotel-manager/rooms/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Room deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/hotel-manager/rooms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/hotel-manager/hotel"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const updateBookingMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/hotel-manager/bookings/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Booking updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/hotel-manager/bookings"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const updateHotelMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", "/api/hotel-manager/hotel", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Hotel profile updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/hotel-manager/hotel"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const resetRoomForm = () => {
    setRoomForm({ name: "", type: "standard", price: "", maxGuests: "2", amenities: "", totalRooms: "10", isAvailable: true });
  };

  const openRoomEdit = (room: HotelRoom) => {
    setEditingRoom(room);
    setRoomForm({
      name: room.name,
      type: room.type,
      price: room.price,
      maxGuests: String(room.maxGuests || 2),
      amenities: (room.amenities || []).join(", "),
      totalRooms: String(room.totalRooms || 10),
      isAvailable: room.isAvailable !== false,
    });
    setRoomDialog(true);
  };

  const handleSaveRoom = () => {
    const data = {
      name: roomForm.name,
      type: roomForm.type,
      price: roomForm.price,
      maxGuests: parseInt(roomForm.maxGuests) || 2,
      amenities: roomForm.amenities.split(",").map(s => s.trim()).filter(Boolean),
      totalRooms: parseInt(roomForm.totalRooms) || 10,
      availableRooms: parseInt(roomForm.totalRooms) || 10,
      isAvailable: roomForm.isAvailable,
    };
    if (editingRoom) {
      updateRoomMutation.mutate({ id: editingRoom.id, data });
    } else {
      createRoomMutation.mutate(data);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const todayBookings = bookings.filter(b => b.checkIn === todayStr || b.checkOut === todayStr);
  const todayCheckIns = bookings.filter(b => b.checkIn === todayStr && b.status === "confirmed");
  const todayCheckOuts = bookings.filter(b => b.checkOut === todayStr && b.status === "checked_in");
  const totalRevenue = bookings
    .filter(b => b.status !== "cancelled")
    .reduce((sum, b) => sum + parseFloat(b.totalPrice), 0);
  const totalOccupied = rooms.reduce((sum, r) => sum + ((r.totalRooms || 0) - (r.availableRooms || 0)), 0);
  const totalCapacity = rooms.reduce((sum, r) => sum + (r.totalRooms || 0), 0);
  const occupancyRate = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

  if (hotelLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-32 w-full rounded-md" />
          <Skeleton className="h-32 w-full rounded-md" />
        </div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-20">
        <Card className="p-6 text-center max-w-sm mx-4">
          <Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h2 className="font-semibold mb-1">No Hotel Assigned</h2>
          <p className="text-sm text-muted-foreground mb-4" data-testid="text-no-hotel">
            You don't have a hotel assigned yet. Contact admin for assistance.
          </p>
          <Link href="/profile">
            <Button data-testid="button-back-profile">Back to Profile</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/profile">
            <Button size="icon" variant="ghost" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-800 truncate" data-testid="text-hotel-name">{hotel.name}</h1>
            <p className="text-xs text-muted-foreground">Hotel Manager Dashboard</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <BarChart3 className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="rooms" data-testid="tab-rooms">
              <BedDouble className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="bookings" data-testid="tab-bookings">
              <CalendarCheck className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="profile" data-testid="tab-profile">
              <Building2 className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <LogIn className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Check-ins Today</span>
                </div>
                <p className="text-2xl font-bold" data-testid="text-today-checkins">{todayCheckIns.length}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <LogOut className="h-4 w-4 text-orange-500" />
                  <span className="text-xs text-muted-foreground">Check-outs Today</span>
                </div>
                <p className="text-2xl font-bold" data-testid="text-today-checkouts">{todayCheckOuts.length}</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">Occupancy</span>
                </div>
                <p className="text-2xl font-bold" data-testid="text-occupancy">{occupancyRate}%</p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Revenue</span>
                </div>
                <p className="text-2xl font-bold" data-testid="text-revenue">₹{totalRevenue.toLocaleString()}</p>
              </Card>
            </div>

            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3">Pending Bookings</h3>
              {bookings.filter(b => b.status === "pending").length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending bookings</p>
              ) : (
                <div className="space-y-2">
                  {bookings.filter(b => b.status === "pending").slice(0, 5).map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-md">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{b.guestName || "Guest"}</p>
                        <p className="text-xs text-muted-foreground">{b.checkIn} - {b.checkOut}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => updateBookingMutation.mutate({ id: b.id, status: "confirmed" })}
                        disabled={updateBookingMutation.isPending}
                        data-testid={`button-confirm-${b.id}`}
                      >
                        Confirm
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="rooms" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Rooms ({rooms.length})</h3>
              <Button
                size="sm"
                onClick={() => { resetRoomForm(); setEditingRoom(null); setRoomDialog(true); }}
                data-testid="button-add-room"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Room
              </Button>
            </div>

            {roomsLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <Skeleton key={i} className="h-24 w-full rounded-md" />)}
              </div>
            ) : rooms.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-sm text-muted-foreground">No rooms added yet</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {rooms.map((room) => (
                  <Card key={room.id} className="p-4" data-testid={`card-room-${room.id}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm">{room.name}</h4>
                          <Badge variant="outline" className="text-[10px] no-default-hover-elevate no-default-active-elevate">{room.type}</Badge>
                          {!room.isAvailable && <Badge variant="secondary" className="text-[10px]">Unavailable</Badge>}
                        </div>
                        <p className="text-sm font-medium text-primary mt-1">₹{parseFloat(room.price).toLocaleString()}/night</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {room.availableRooms}/{room.totalRooms} available | Max {room.maxGuests} guests
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openRoomEdit(room)} data-testid={`button-edit-room-${room.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteRoomMutation.mutate(room.id)}
                          disabled={deleteRoomMutation.isPending}
                          data-testid={`button-delete-room-${room.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bookings" className="mt-4 space-y-4">
            <h3 className="font-semibold text-sm">All Bookings ({bookings.length})</h3>
            {bookingsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 w-full rounded-md" />)}
              </div>
            ) : bookings.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-sm text-muted-foreground">No bookings yet</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking) => (
                  <Card key={booking.id} className="p-4" data-testid={`card-booking-${booking.id}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{booking.guestName || "Guest"}</p>
                        {booking.guestPhone && <p className="text-xs text-muted-foreground">{booking.guestPhone}</p>}
                      </div>
                      <Badge className={`${statusColors[booking.status || "pending"]} no-default-hover-elevate no-default-active-elevate text-[10px]`}>
                        {statusLabels[booking.status || "pending"]}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Check-in: {booking.checkIn} | Check-out: {booking.checkOut}</p>
                      <p>{booking.guests} guest{(booking.guests || 1) > 1 ? "s" : ""} | ₹{parseFloat(booking.totalPrice).toLocaleString()}</p>
                      {booking.specialRequests && <p>Notes: {booking.specialRequests}</p>}
                    </div>
                    {booking.status !== "cancelled" && booking.status !== "checked_out" && (
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {booking.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => updateBookingMutation.mutate({ id: booking.id, status: "confirmed" })}
                              disabled={updateBookingMutation.isPending}
                              data-testid={`button-confirm-booking-${booking.id}`}
                            >
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateBookingMutation.mutate({ id: booking.id, status: "cancelled" })}
                              disabled={updateBookingMutation.isPending}
                              data-testid={`button-cancel-booking-${booking.id}`}
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                        {booking.status === "confirmed" && (
                          <Button
                            size="sm"
                            onClick={() => updateBookingMutation.mutate({ id: booking.id, status: "checked_in" })}
                            disabled={updateBookingMutation.isPending}
                            data-testid={`button-checkin-${booking.id}`}
                          >
                            <LogIn className="h-3 w-3 mr-1" /> Check In
                          </Button>
                        )}
                        {booking.status === "checked_in" && (
                          <Button
                            size="sm"
                            onClick={() => updateBookingMutation.mutate({ id: booking.id, status: "checked_out" })}
                            disabled={updateBookingMutation.isPending}
                            data-testid={`button-checkout-${booking.id}`}
                          >
                            <LogOut className="h-3 w-3 mr-1" /> Check Out
                          </Button>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile" className="mt-4 space-y-4">
            <HotelProfileEditor hotel={hotel} onSave={(data: any) => updateHotelMutation.mutate(data)} isPending={updateHotelMutation.isPending} />
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={roomDialog} onOpenChange={setRoomDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRoom ? "Edit Room" : "Add Room"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Room Name</label>
              <Input
                value={roomForm.name}
                onChange={(e) => setRoomForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Deluxe King Room"
                data-testid="input-room-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Type</label>
              <Select value={roomForm.type} onValueChange={(v) => setRoomForm(f => ({ ...f, type: v }))}>
                <SelectTrigger data-testid="select-room-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="deluxe">Deluxe</SelectItem>
                  <SelectItem value="suite">Suite</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Price/Night (₹)</label>
                <Input
                  type="number"
                  value={roomForm.price}
                  onChange={(e) => setRoomForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="2500"
                  data-testid="input-room-price"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Max Guests</label>
                <Input
                  type="number"
                  value={roomForm.maxGuests}
                  onChange={(e) => setRoomForm(f => ({ ...f, maxGuests: e.target.value }))}
                  data-testid="input-room-guests"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Total Rooms</label>
              <Input
                type="number"
                value={roomForm.totalRooms}
                onChange={(e) => setRoomForm(f => ({ ...f, totalRooms: e.target.value }))}
                data-testid="input-room-total"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Amenities (comma separated)</label>
              <Input
                value={roomForm.amenities}
                onChange={(e) => setRoomForm(f => ({ ...f, amenities: e.target.value }))}
                placeholder="AC, TV, WiFi, Mini Bar"
                data-testid="input-room-amenities"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={roomForm.isAvailable}
                onCheckedChange={(v) => setRoomForm(f => ({ ...f, isAvailable: v }))}
                data-testid="switch-room-available"
              />
              <label className="text-sm">Available</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoomDialog(false)} data-testid="button-cancel-room">Cancel</Button>
            <Button
              onClick={handleSaveRoom}
              disabled={!roomForm.name || !roomForm.price || createRoomMutation.isPending || updateRoomMutation.isPending}
              data-testid="button-save-room"
            >
              {editingRoom ? "Update" : "Add"} Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}

function HotelProfileEditor({ hotel, onSave, isPending }: { hotel: Hotel; onSave: (data: any) => void; isPending: boolean }) {
  const [name, setName] = useState(hotel.name);
  const [description, setDescription] = useState(hotel.description || "");
  const [city, setCity] = useState(hotel.city);
  const [address, setAddress] = useState(hotel.address || "");
  const [amenities, setAmenities] = useState((hotel.amenities || []).join(", "));
  const [checkInTime, setCheckInTime] = useState(hotel.checkInTime || "14:00");
  const [checkOutTime, setCheckOutTime] = useState(hotel.checkOutTime || "12:00");

  const handleSave = () => {
    onSave({
      name,
      description: description || undefined,
      city,
      address: address || undefined,
      amenities: amenities.split(",").map(s => s.trim()).filter(Boolean),
      checkInTime,
      checkOutTime,
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium mb-1 block">Hotel Name</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} data-testid="input-hotel-name" />
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Description</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="resize-none" data-testid="input-hotel-description" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block">City</label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} data-testid="input-hotel-city" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Address</label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} data-testid="input-hotel-address" />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium mb-1 block">Amenities (comma separated)</label>
        <Input value={amenities} onChange={(e) => setAmenities(e.target.value)} placeholder="WiFi, Parking, Pool" data-testid="input-hotel-amenities" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block">Check-in Time</label>
          <Input type="time" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} data-testid="input-hotel-checkin-time" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Check-out Time</label>
          <Input type="time" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} data-testid="input-hotel-checkout-time" />
        </div>
      </div>
      <Button className="w-full" onClick={handleSave} disabled={isPending || !name || !city} data-testid="button-save-hotel-profile">
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </div>
  );
}

import { useState } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { MapPin, Calendar, Clock, Users, Truck, ArrowRight, Package, History } from "lucide-react";
import { Link } from "wouter";

export default function MovingHomePage() {
  const [, setLocation] = useLocation();
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropAddress, setDropAddress] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [description, setDescription] = useState("");
  const [helpersCount, setHelpersCount] = useState(0);

  const handleGetEstimate = () => {
    const params = new URLSearchParams();
    if (pickupAddress) params.set("pickup", pickupAddress);
    if (dropAddress) params.set("drop", dropAddress);
    if (scheduledDate) params.set("date", scheduledDate);
    if (scheduledTime) params.set("time", scheduledTime);
    if (description) params.set("desc", description);
    if (helpersCount > 0) params.set("helpers", String(helpersCount));
    setLocation(`/moving/vehicles?${params.toString()}`);
  };

  const isFormValid = pickupAddress.trim() && dropAddress.trim();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold text-foreground" data-testid="text-moving-title">City Move</h1>
            <p className="text-sm text-muted-foreground">Shift anything, anywhere</p>
          </div>
          <Link href="/moving/bookings">
            <Button variant="outline" size="sm" data-testid="link-moving-bookings">
              <History className="h-4 w-4 mr-1" />
              My Bookings
            </Button>
          </Link>
        </div>

        <Card className="p-4 space-y-4">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="pickup" className="text-sm font-medium flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-green-600" />
                Pickup Location
              </Label>
              <Input
                id="pickup"
                placeholder="Enter pickup address"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                data-testid="input-pickup-address"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="drop" className="text-sm font-medium flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-red-500" />
                Drop Location
              </Label>
              <Input
                id="drop"
                placeholder="Enter drop address"
                value={dropAddress}
                onChange={(e) => setDropAddress(e.target.value)}
                data-testid="input-drop-address"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="date" className="text-sm font-medium flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Date
              </Label>
              <Input
                id="date"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                data-testid="input-scheduled-date"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="time" className="text-sm font-medium flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Time
              </Label>
              <Input
                id="time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                data-testid="input-scheduled-time"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm font-medium flex items-center gap-1.5">
              <Package className="h-4 w-4 text-muted-foreground" />
              What are you moving?
            </Label>
            <Textarea
              id="description"
              placeholder="e.g., 1 BHK apartment furniture, 5 boxes, washing machine..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={3}
              data-testid="input-description"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Users className="h-4 w-4 text-muted-foreground" />
              Helpers Needed
            </Label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setHelpersCount(Math.max(0, helpersCount - 1))}
                disabled={helpersCount === 0}
                data-testid="button-helpers-minus"
              >
                -
              </Button>
              <span className="text-lg font-semibold w-8 text-center" data-testid="text-helpers-count">
                {helpersCount}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setHelpersCount(helpersCount + 1)}
                data-testid="button-helpers-plus"
              >
                +
              </Button>
              <span className="text-sm text-muted-foreground ml-2">
                Loading/unloading help
              </span>
            </div>
          </div>

          <Button
            className="w-full"
            size="lg"
            onClick={handleGetEstimate}
            disabled={!isFormValid}
            data-testid="button-get-estimate"
          >
            <Truck className="h-5 w-5 mr-2" />
            Choose Vehicle
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-3 text-foreground">How it works</h3>
          <div className="space-y-3">
            {[
              { step: "1", title: "Enter Details", desc: "Tell us pickup, drop & what you're moving" },
              { step: "2", title: "Choose Vehicle", desc: "Select the right vehicle for your needs" },
              { step: "3", title: "Confirm & Relax", desc: "We'll handle the rest" },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">{item.step}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}

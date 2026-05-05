import { MapPin, Truck } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export function ComingSoonScreen({
  onChangeLocation,
}: {
  onChangeLocation: () => void;
}) {
  const [, setLocation] = useLocation();

  return (
    <div className="flex min-h-[calc(100vh-4.5rem)] items-center justify-center bg-white px-6 pb-24 pt-10">
      <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
        <div className="mb-7 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf4ff] text-[#2f67e8]">
          <Truck className="h-6 w-6" />
        </div>
        <h1 className="max-w-sm text-[2.35rem] font-extrabold leading-[1.08] tracking-[-0.03em] text-slate-950">
          Sit Tight! We&apos;re Coming Soon!
        </h1>
        <p className="mt-6 max-w-md text-[15px] leading-8 text-slate-600">
          Our team is working tirelessly to bring lightning fast delivery to your location
        </p>

        <div className="mt-7 inline-flex items-center gap-2 text-sm text-slate-500">
          <MapPin className="h-4 w-4 text-rose-500" />
          <span>Service currently available in Pondicherry</span>
        </div>

        <Button
          className="mt-10 h-16 w-full rounded-2xl bg-[#2f67e8] text-lg font-semibold shadow-[0_3px_0_#0e9b68] hover:bg-[#285bd0]"
          onClick={() => setLocation("/")}
          data-testid="button-continue-shopping"
        >
          Continue Shopping
        </Button>

        <Button
          variant="outline"
          className="mt-4 h-16 w-full rounded-2xl border border-slate-200 bg-white text-lg font-semibold text-slate-950 hover:bg-slate-50"
          onClick={onChangeLocation}
          data-testid="button-change-delivery-location"
        >
          Change Location
        </Button>
      </div>
    </div>
  );
}
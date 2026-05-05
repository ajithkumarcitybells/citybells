import { type TaxiVehicleType } from "@shared/schema";
import { calculateFare, formatCurrency, getDocumentId, type RouteMetrics } from "@/lib/taxi-map";
import { Users } from "lucide-react";
import { motion } from "framer-motion";

type VehicleSelectionProps = {
  vehicleTypes: TaxiVehicleType[];
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
  routeMetrics: RouteMetrics | null;
};

function readBaseFare(value: string | number | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getVehicleKind(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("auto") || normalized.includes("rick")) return "auto";
  if (normalized.includes("suv")) return "suv";
  if (normalized.includes("sedan") || normalized.includes("prime")) return "sedan";
  return "mini";
}

function VehiclePicture({ kind, selected }: { kind: string; selected: boolean }) {
  if (kind === "auto") {
    return (
      <div className="relative h-16 w-24">
        <div className="absolute bottom-3 left-3 h-9 w-16 rounded-t-2xl rounded-bl-md rounded-br-xl bg-yellow-400 shadow-md" />
        <div className="absolute bottom-7 left-5 h-6 w-10 rounded-t-xl bg-slate-900" />
        <div className="absolute bottom-7 left-7 h-4 w-5 rounded-sm bg-sky-100" />
        <div className="absolute bottom-2 left-5 h-4 w-4 rounded-full border-4 border-slate-800 bg-slate-200" />
        <div className="absolute bottom-2 right-4 h-4 w-4 rounded-full border-4 border-slate-800 bg-slate-200" />
        <div className="absolute bottom-4 right-2 h-3 w-2 rounded-r bg-yellow-500" />
      </div>
    );
  }

  const width = kind === "suv" ? "w-28" : kind === "sedan" ? "w-[104px]" : "w-24";
  const body = kind === "suv" ? "h-8 rounded-t-2xl" : "h-7 rounded-t-3xl";
  const cabin = kind === "mini" ? "left-8 w-9" : "left-9 w-12";

  return (
    <div className={`relative h-16 ${width}`}>
      <div className={`absolute bottom-3 left-1 right-1 ${body} rounded-b-xl bg-white shadow-[0_8px_18px_rgba(15,23,42,0.18)] ring-1 ${selected ? "ring-amber-300" : "ring-slate-200"}`} />
      <div className={`absolute bottom-9 ${cabin} h-6 rounded-t-2xl bg-white shadow-sm ring-1 ring-slate-200`} />
      <div className="absolute bottom-10 left-11 h-4 w-5 rounded bg-sky-100" />
      <div className="absolute bottom-2 left-5 h-5 w-5 rounded-full border-4 border-slate-800 bg-slate-200" />
      <div className="absolute bottom-2 right-5 h-5 w-5 rounded-full border-4 border-slate-800 bg-slate-200" />
      <div className="absolute bottom-6 left-2 h-2 w-3 rounded-full bg-amber-300" />
      <div className="absolute bottom-6 right-2 h-2 w-3 rounded-full bg-red-300" />
    </div>
  );
}

export function VehicleSelection({ vehicleTypes, selectedVehicleId, onSelectVehicle, routeMetrics }: VehicleSelectionProps) {
  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-950 dark:text-slate-50">Choose a ride</h4>
        <div className="text-xs text-slate-500">Live fare estimate</div>
      </div>

      <div className="mt-3 space-y-2">
        {vehicleTypes.map((vehicleType) => {
          const id = getDocumentId(vehicleType);
          const fare = calculateFare(vehicleType, routeMetrics);
          const displayFare = fare ?? readBaseFare(vehicleType.baseFare);
          const selected = id === selectedVehicleId;
          const kind = getVehicleKind(vehicleType.name);

          return (
            <motion.button
              key={id}
              onClick={() => onSelectVehicle(id)}
              initial={false}
              whileTap={{ scale: 0.98 }}
              animate={selected ? { scale: 1.005 } : { scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={`flex w-full items-center gap-4 rounded-2xl border p-3 text-left transition ${
                selected
                  ? "border-slate-950 bg-amber-50 shadow-sm dark:border-amber-300 dark:bg-amber-500/10"
                  : "border-slate-200 bg-white hover:border-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-600"
              }`}
            >
              <VehiclePicture kind={kind} selected={selected} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-bold text-slate-950 dark:text-slate-50">{vehicleType.name}</div>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Users className="h-3 w-3" />
                    {vehicleType.capacity ?? "-"}
                  </span>
                </div>
                <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                  {kind === "auto" ? "Affordable 3-wheeler rides" : kind === "suv" ? "Spacious SUV for groups" : kind === "sedan" ? "Comfortable sedan rides" : "Compact city rides"}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">3-8 min · Drop estimate</p>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-slate-950 dark:text-slate-50">{formatCurrency(displayFare)}</div>
                {selected ? <div className="mt-1 text-[10px] font-bold text-amber-700">Selected</div> : null}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export default VehicleSelection;

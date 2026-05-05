import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X } from "lucide-react";
import VehicleSelection from "./VehicleSelection";
import type { RouteMetrics } from "@/lib/taxi-map";

type Props = {
  open: boolean;
  onClose: () => void;
  vehicleTypes: any[];
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
  estimatedFare?: number | null;
  routeMetrics?: RouteMetrics | null;
  onConfirm: () => void;
  confirmPending?: boolean;
  canConfirm?: boolean;
};

export function FareSelector({
  open,
  onClose,
  vehicleTypes,
  selectedVehicleId,
  onSelectVehicle,
  estimatedFare,
  routeMetrics,
  onConfirm,
  confirmPending,
  canConfirm = false,
}: Props) {
  const hasFareEstimate = typeof estimatedFare === "number" && Number.isFinite(estimatedFare);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-50 flex items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <motion.div
            initial={{ y: 400 }}
            animate={{ y: 0 }}
            exit={{ y: 400 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative mx-auto w-full max-w-2xl rounded-t-lg bg-white p-4 shadow-2xl dark:bg-slate-900"
          >
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-slate-950 dark:text-slate-50">Confirm your ride</div>
                <div className="text-xs text-slate-500">Compare fares before booking</div>
              </div>
              <button onClick={onClose} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <VehicleSelection vehicleTypes={vehicleTypes} selectedVehicleId={selectedVehicleId} onSelectVehicle={onSelectVehicle} routeMetrics={routeMetrics ?? null} />

            {confirmPending ? (
              <div className="mt-3 rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/30">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-200">Finding nearby cabs...</div>
                    <div className="text-xs text-slate-500 dark:text-slate-300">Searching drivers around your pickup</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.span animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: 0 }} className="h-2 w-2 rounded-full bg-emerald-600" />
                    <motion.span animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: 0.12 }} className="h-2 w-2 rounded-full bg-emerald-600" />
                    <motion.span animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: 0.24 }} className="h-2 w-2 rounded-full bg-emerald-600" />
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-200 pt-4 dark:border-slate-800">
              <div>
                <div className="text-sm text-slate-500">Estimated fare</div>
                {hasFareEstimate ? (
                  <div className="text-xl font-semibold text-slate-950 dark:text-slate-50">{`₹${Math.round(estimatedFare)}`}</div>
                ) : (
                  <div className="mt-2 h-6 w-24 overflow-hidden rounded-full bg-slate-200">
                    <motion.div className="h-6 w-24 bg-gradient-to-r from-slate-200 to-slate-100" animate={{ x: [0, 48, 0] }} transition={{ duration: 1.1, repeat: Infinity }} />
                  </div>
                )}
              </div>
              <motion.button
                onClick={() => {
                  if (canConfirm) onConfirm();
                }}
                className={`h-12 rounded-md px-6 font-semibold text-white ${
                  canConfirm
                    ? "bg-slate-950 hover:bg-slate-800 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300"
                    : "cursor-not-allowed bg-slate-300 text-slate-700"
                }`}
                animate={confirmPending ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                transition={confirmPending ? { duration: 1, repeat: Infinity } : {}}
                aria-disabled={!canConfirm || confirmPending}
              >
                {confirmPending ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Searching</span> : canConfirm ? "Book taxi" : "Waiting for fare"}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default FareSelector;

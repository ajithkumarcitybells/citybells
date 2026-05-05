import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneDisplay() {
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as any).standalone === true;
}

export function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => localStorage.getItem("city-taxi-install-dismissed") === "true");

  useEffect(() => {
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      if (!isStandaloneDisplay()) {
        setInstallEvent(event as BeforeInstallPromptEvent);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  if (!installEvent || dismissed || isStandaloneDisplay()) return null;

  return (
    <div className="fixed inset-x-3 bottom-24 z-[110] mx-auto max-w-lg rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl">
      <div className="flex items-center gap-3">
        <span className="rounded-2xl bg-amber-100 p-3 text-amber-700">
          <Download className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-black text-slate-950">Install City Taxi App</p>
          <p className="text-xs text-slate-500">Quick booking, ride tracking and driver alerts from your home screen.</p>
        </div>
        <button
          type="button"
          className="rounded-full p-2 text-slate-400 hover:bg-slate-100"
          aria-label="Dismiss install prompt"
          onClick={() => {
            localStorage.setItem("city-taxi-install-dismissed", "true");
            setDismissed(true);
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <Button
        className="mt-3 h-11 w-full rounded-2xl bg-black hover:bg-slate-800"
        onClick={async () => {
          await installEvent.prompt();
          const choice = await installEvent.userChoice;
          if (choice.outcome) {
            localStorage.setItem("city-taxi-install-dismissed", "true");
            setDismissed(true);
          }
        }}
      >
        Install app
      </Button>
    </div>
  );
}

export default PWAInstallPrompt;

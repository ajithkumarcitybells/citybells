import { useState, useEffect } from "react";
import cityBellLogo from "@assets/citybells-logo_1769903304782.png";

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number;
}

export default function SplashScreen({ onComplete, duration = 2000 }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, duration - 500);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-yellow-400 via-yellow-300 to-green-400 transition-opacity duration-500 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      data-testid="splash-screen"
    >
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="animate-pulse">
            <img 
              src={cityBellLogo} 
              alt="City Bell" 
              className="h-28 w-auto drop-shadow-lg animate-bounce"
              style={{ animationDuration: '1.5s' }}
            />
          </div>
          <div className="absolute -inset-4 rounded-full bg-white/20 animate-ping" style={{ animationDuration: '2s' }} />
        </div>
        
        <div className="text-center">
          <h1 className="text-4xl font-bold text-red-600 tracking-wide drop-shadow-md">
            CITY BELL
          </h1>
          <p className="text-gray-700 mt-1 text-sm font-medium">
            Your Super App for Everything
          </p>
        </div>

        <div className="flex gap-1.5 mt-4">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2.5 h-2.5 bg-yellow-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

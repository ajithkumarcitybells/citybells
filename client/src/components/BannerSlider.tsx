import { useState, useEffect } from "react";
import { Banner } from "@shared/schema";

interface BannerSliderProps {
  banners: Banner[];
}

export function BannerSlider({ banners }: BannerSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [banners.length]);

  if (banners.length === 0) {
    return (
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-yellow-300 via-yellow-200 to-green-300 aspect-[2/1]">
        <div className="absolute inset-0 flex flex-col justify-center px-6">
          <span className="text-sm font-semibold text-green-600 mb-1">SuperApp Grocery</span>
          <h2 className="text-2xl font-bold text-green-800 mb-1">CHOOSE FRESH</h2>
          <p className="text-lg font-semibold text-red-600 mb-2">FRUIT & VEGETABLES SPECIAL PROMO</p>
          <p className="text-sm text-gray-700">
            Farmer's choice vegetables and fruits,<br />
            fresh every day at pocket-friendly prices.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden" data-testid="banner-slider">
      <div 
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {banners.map((banner, index) => (
          <div 
            key={banner.id} 
            className="min-w-full aspect-[2/1] relative bg-gray-100"
          >
            {banner.image ? (
              <img 
                src={banner.image} 
                alt={banner.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-yellow-300 via-yellow-200 to-green-300 flex items-center justify-center">
                <span className="text-xl font-bold text-green-800">{banner.title}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {banners.length > 1 && (
        <>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? 'bg-green-600' : 'bg-white/60'
                }`}
                data-testid={`button-banner-dot-${index}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

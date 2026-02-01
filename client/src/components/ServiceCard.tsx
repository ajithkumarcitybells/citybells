import { Lock } from "lucide-react";
import { Link } from "wouter";

interface ServiceCardProps {
  name: string;
  description: string;
  image: string;
  isActive: boolean;
  href?: string;
  isLarge?: boolean;
}

export function ServiceCard({ name, description, image, isActive, href, isLarge = false }: ServiceCardProps) {
  // Large active card (Grocery) - Green gradient with image on right
  if (isLarge && isActive) {
    const content = (
      <div 
        className="relative rounded-3xl overflow-hidden aspect-[16/10] bg-gradient-to-br from-green-500 via-green-400 to-green-300"
        data-testid={`card-service-${name.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <div className="absolute bottom-0 right-0 w-2/3 h-full">
          <img 
            src={image} 
            alt={name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm px-5 py-4 rounded-t-3xl">
          <h3 className="text-2xl font-bold text-gray-800">
            {name.toUpperCase()}
          </h3>
          <p className="text-sm text-gray-600">
            {description}
          </p>
        </div>
      </div>
    );

    return href ? (
      <Link href={href} className="block hover-elevate active-elevate-2">
        {content}
      </Link>
    ) : content;
  }

  // Large inactive card (City Move, City Serve)
  if (isLarge && !isActive) {
    return (
      <div 
        className="relative rounded-3xl overflow-hidden aspect-[16/10]"
        data-testid={`card-service-${name.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <img 
          src={image} 
          alt={name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-2 bg-white/95 px-4 py-2 rounded-full shadow-lg">
            <Lock className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">COMING SOON</span>
          </div>
        </div>
        
        <div className="absolute bottom-4 left-4">
          <h3 className="text-2xl font-bold text-white">
            {name.toUpperCase()}
          </h3>
          <p className="text-sm text-white/90">
            {description}
          </p>
        </div>
      </div>
    );
  }

  // Small inactive cards (E-Commerce, Food, Hotel, Taxi)
  return (
    <div 
      className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-gray-100"
      data-testid={`card-service-${name.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <img 
        src={image} 
        alt={name}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      
      {!isActive && (
        <div className="absolute top-3 right-3">
          <div className="flex items-center gap-1.5 bg-white/95 px-3 py-1.5 rounded-full shadow-md">
            <Lock className="h-3 w-3 text-gray-600" />
            <span className="text-xs font-medium text-gray-700">COMING SOON</span>
          </div>
        </div>
      )}
      
      <div className="absolute bottom-3 left-3">
        <h3 className="text-lg font-bold text-white">
          {name.toUpperCase()}
        </h3>
        <p className="text-xs text-white/90">
          {description}
        </p>
      </div>
    </div>
  );
}

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
  const content = (
    <div 
      className={`relative rounded-2xl overflow-hidden ${isLarge ? 'aspect-[16/10]' : 'aspect-[4/3]'} ${!isActive ? 'opacity-90' : ''}`}
      data-testid={`card-service-${name.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <img 
        src={image} 
        alt={name}
        className={`w-full h-full object-cover ${!isActive ? 'blur-[1px]' : ''}`}
        loading="lazy"
      />
      
      <div className={`absolute inset-0 ${isLarge 
        ? 'bg-gradient-to-r from-green-700/80 via-green-600/60 to-transparent' 
        : 'bg-gradient-to-t from-black/60 to-transparent'
      }`} />
      
      <div className={`absolute ${isLarge ? 'bottom-6 left-6' : 'bottom-3 left-3'}`}>
        <h3 className={`font-bold text-white ${isLarge ? 'text-3xl' : 'text-lg'}`}>
          {name.toUpperCase()}
        </h3>
        <p className={`text-white/90 ${isLarge ? 'text-base' : 'text-xs'}`}>
          {description}
        </p>
      </div>
      
      {!isActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <div className="flex items-center gap-2 bg-white/90 px-4 py-2 rounded-full shadow-lg">
            <Lock className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">COMING SOON</span>
          </div>
        </div>
      )}
    </div>
  );

  if (isActive && href) {
    return (
      <Link href={href} className="block hover-elevate active-elevate-2">
        {content}
      </Link>
    );
  }

  return content;
}

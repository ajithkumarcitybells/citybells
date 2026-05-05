import type { Hotel } from "@shared/schema";

export type HotelAvailabilityWindow = {
  checkIn: string;
  checkOut: string;
};

export type HotelPropertyType = "Hotel" | "Resort" | "Villa" | "Apartment" | "Boutique" | "Homestay";
export type HotelRoomTypeFilter = "Single" | "Double" | "Deluxe" | "Suite";
export type HotelSortOption = "recommended" | "price-low" | "price-high" | "rating-high" | "popularity" | "newest" | "stars-high" | "name";

export type HotelFilterRecord = {
  id: string;
  name: string;
  price: number;
  rating: number;
  amenities: string[];
  location: string;
  type: HotelPropertyType;
  roomType: HotelRoomTypeFilter;
  availabilityDates: HotelAvailabilityWindow[];
  city: string;
  starRating: number;
  reviewCount: number;
  image?: string;
  images?: string[];
  address?: string;
  description?: string;
  guestRating: number;
  originalHotel?: Hotel;
};

export type HotelFilterState = {
  search: string;
  priceRange: [number, number];
  starRatings: number[];
  amenities: string[];
  propertyTypes: HotelPropertyType[];
  guestRating: number | null;
  locations: string[];
  roomTypes: HotelRoomTypeFilter[];
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  availableOnly: boolean;
  sortBy: HotelSortOption;
};

export type HotelFilterTag = {
  key: string;
  label: string;
};

export const HOTEL_AMENITY_OPTIONS = [
  "WiFi",
  "AC",
  "Pool",
  "Parking",
  "Breakfast",
  "Spa",
  "Gym",
  "Restaurant",
  "Bar",
  "Beach Access",
  "Airport Shuttle",
  "Pet Friendly",
  "Heritage Walk",
  "Kitchenette",
  "Work Desk",
];

export const HOTEL_PROPERTY_TYPE_OPTIONS: HotelPropertyType[] = ["Hotel", "Resort", "Villa", "Apartment", "Boutique", "Homestay"];
export const HOTEL_ROOM_TYPE_OPTIONS: HotelRoomTypeFilter[] = ["Single", "Double", "Deluxe", "Suite"];
export const HOTEL_GUEST_RATING_OPTIONS = [3, 4, 4.5];

export const SAMPLE_HOTEL_FILTER_DATASET: HotelFilterRecord[] = [
  {
    id: "sample-hotel-1",
    name: "Coral Bay Resort & Spa",
    price: 5200,
    rating: 4.6,
    amenities: ["WiFi", "AC", "Pool", "Breakfast", "Parking", "Spa"],
    location: "Beach Road",
    type: "Resort",
    roomType: "Suite",
    availabilityDates: [
      { checkIn: "2026-04-21", checkOut: "2026-05-22" },
      { checkIn: "2026-06-01", checkOut: "2026-07-15" },
    ],
    city: "Pondicherry",
    starRating: 5,
    reviewCount: 412,
    guestRating: 4.6,
    address: "12 Beach Road",
    description: "Ocean-facing resort with spa and infinity pool.",
  },
  {
    id: "sample-hotel-2",
    name: "Lotus Grand Hotel",
    price: 3400,
    rating: 4.2,
    amenities: ["WiFi", "AC", "Parking", "Breakfast", "Restaurant"],
    location: "Heritage Town",
    type: "Hotel",
    roomType: "Deluxe",
    availabilityDates: [
      { checkIn: "2026-04-24", checkOut: "2026-05-30" },
      { checkIn: "2026-06-10", checkOut: "2026-07-08" },
    ],
    city: "Pondicherry",
    starRating: 4,
    reviewCount: 276,
    guestRating: 4.2,
    address: "88 Mission Street",
    description: "Central stay with free breakfast and covered parking.",
  },
  {
    id: "sample-hotel-3",
    name: "Palm Grove Villa Stays",
    price: 6100,
    rating: 4.8,
    amenities: ["WiFi", "AC", "Pool", "Parking", "Breakfast"],
    location: "ECR",
    type: "Villa",
    roomType: "Suite",
    availabilityDates: [
      { checkIn: "2026-04-22", checkOut: "2026-05-18" },
      { checkIn: "2026-05-25", checkOut: "2026-06-28" },
    ],
    city: "Chennai",
    starRating: 5,
    reviewCount: 193,
    guestRating: 4.8,
    address: "55 ECR Link Road",
    description: "Private villa stay with pool and family-friendly suites.",
  },
  {
    id: "sample-hotel-4",
    name: "Urban Nest Apartments",
    price: 2800,
    rating: 4.0,
    amenities: ["WiFi", "AC", "Parking", "Gym"],
    location: "City Centre",
    type: "Apartment",
    roomType: "Double",
    availabilityDates: [
      { checkIn: "2026-04-21", checkOut: "2026-06-05" },
      { checkIn: "2026-06-15", checkOut: "2026-08-01" },
    ],
    city: "Bengaluru",
    starRating: 3,
    reviewCount: 128,
    guestRating: 4.0,
    address: "3 Residency Cross",
    description: "Business-friendly serviced apartment near downtown.",
  },
  {
    id: "sample-hotel-5",
    name: "Blue Haven Business Hotel",
    price: 4600,
    rating: 4.4,
    amenities: ["WiFi", "AC", "Breakfast", "Gym", "Restaurant"],
    location: "Airport Corridor",
    type: "Hotel",
    roomType: "Single",
    availabilityDates: [
      { checkIn: "2026-04-21", checkOut: "2026-05-14" },
      { checkIn: "2026-05-20", checkOut: "2026-06-20" },
    ],
    city: "Hyderabad",
    starRating: 4,
    reviewCount: 362,
    guestRating: 4.4,
    address: "1 Airport Avenue",
    description: "Efficient airport stay with fast check-in and breakfast.",
  },
  {
    id: "sample-hotel-6",
    name: "Cedar Peak Resort",
    price: 7200,
    rating: 4.7,
    amenities: ["WiFi", "AC", "Pool", "Parking", "Breakfast", "Spa", "Gym"],
    location: "Hill View",
    type: "Resort",
    roomType: "Deluxe",
    availabilityDates: [
      { checkIn: "2026-04-28", checkOut: "2026-06-25" },
    ],
    city: "Ooty",
    starRating: 5,
    reviewCount: 501,
    guestRating: 4.7,
    address: "77 Hill View Estate",
    description: "Premium mountain resort with spa, pool, and scenic suites.",
  },
  {
    id: "sample-hotel-7",
    name: "Maple Court Hotel",
    price: 3100,
    rating: 3.9,
    amenities: ["WiFi", "Parking", "Breakfast"],
    location: "Railway Station",
    type: "Hotel",
    roomType: "Double",
    availabilityDates: [
      { checkIn: "2026-04-21", checkOut: "2026-07-10" },
    ],
    city: "Coimbatore",
    starRating: 3,
    reviewCount: 97,
    guestRating: 3.9,
    address: "21 Station Road",
    description: "Convenient transit stay with breakfast and parking.",
  },
  {
    id: "sample-hotel-8",
    name: "Sunset Marina Villa",
    price: 6800,
    rating: 4.5,
    amenities: ["WiFi", "AC", "Pool", "Parking", "Breakfast", "Restaurant"],
    location: "Marina Promenade",
    type: "Villa",
    roomType: "Suite",
    availabilityDates: [
      { checkIn: "2026-04-23", checkOut: "2026-05-28" },
      { checkIn: "2026-06-02", checkOut: "2026-07-22" },
    ],
    city: "Visakhapatnam",
    starRating: 5,
    reviewCount: 223,
    guestRating: 4.5,
    address: "44 Marina Bay",
    description: "Stylish villa stay with marina views and breakfast.",
  },
];

const FALLBACK_LOCATIONS = [
  "Beach Road",
  "Heritage Town",
  "City Centre",
  "Airport Corridor",
  "Hill View",
  "Marina Promenade",
  "ECR",
  "Railway Station",
];

function parsePriceRange(value?: string | null) {
  if (!value) {
    return null;
  }

  const matches = value.match(/\d+/g);
  if (!matches || matches.length === 0) {
    return null;
  }

  const numbers = matches.map((entry) => Number(entry));
  return numbers[numbers.length - 1] * 100;
}

function normalizeHotelRating(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function clampStarRating(value: number) {
  return Math.min(5, Math.max(1, Math.round(value || 0)));
}

function normalizeAmenityName(value: string) {
  const normalized = value.trim().toLowerCase();

  if (normalized.includes("wifi") || normalized.includes("wi-fi") || normalized.includes("internet")) return "WiFi";
  if (normalized.includes("air") || normalized === "ac") return "AC";
  if (normalized.includes("pool")) return "Pool";
  if (normalized.includes("parking")) return "Parking";
  if (normalized.includes("breakfast")) return "Breakfast";
  if (normalized.includes("spa")) return "Spa";
  if (normalized.includes("gym") || normalized.includes("fitness")) return "Gym";
  if (normalized.includes("restaurant") || normalized.includes("dining")) return "Restaurant";
  if (normalized.includes("bar") || normalized.includes("lounge")) return "Bar";
  if (normalized.includes("beach")) return "Beach Access";
  if (normalized.includes("airport") || normalized.includes("shuttle")) return "Airport Shuttle";
  if (normalized.includes("pet")) return "Pet Friendly";
  if (normalized.includes("heritage")) return "Heritage Walk";
  if (normalized.includes("kitchen")) return "Kitchenette";
  if (normalized.includes("desk") || normalized.includes("workspace") || normalized.includes("work")) return "Work Desk";

  return value.trim();
}

function normalizeAmenities(values?: string[] | null) {
  const normalized = new Set<string>();

  values?.forEach((value) => {
    if (!value?.trim()) {
      return;
    }

    normalized.add(normalizeAmenityName(value));
  });

  return Array.from(normalized);
}

function normalizePropertyType(value?: string | null): HotelPropertyType {
  const normalized = value?.trim().toLowerCase().replace(/[-_\s]+/g, " ") ?? "";

  if (normalized.includes("resort")) return "Resort";
  if (normalized.includes("villa")) return "Villa";
  if (normalized.includes("apartment") || normalized.includes("serviced")) return "Apartment";
  if (normalized.includes("boutique")) return "Boutique";
  if (normalized.includes("home") || normalized.includes("homestay") || normalized.includes("stay")) return "Homestay";
  return "Hotel";
}

function inferPropertyType(hotel: Hotel) {
  return normalizePropertyType((hotel as Hotel & { propertyType?: string }).propertyType || hotel.name);
}

function inferRoomType(starRating: number, propertyType: HotelPropertyType): HotelRoomTypeFilter {
  if (propertyType === "Villa" || propertyType === "Resort" || starRating >= 5) return "Suite";
  if (propertyType === "Boutique" || starRating >= 4) return "Deluxe";
  if (propertyType === "Apartment") return "Double";
  return "Single";
}

function deriveLocation(hotel: Hotel, fallbackLocation: string) {
  const address = hotel.address?.trim();
  if (!address) {
    return fallbackLocation;
  }

  const [firstSegment] = address.split(",");
  return firstSegment?.trim() || fallbackLocation;
}

export function createDefaultHotelFilterState(overrides?: Partial<HotelFilterState>): HotelFilterState {
  return {
    search: "",
    priceRange: [0, 30000],
    starRatings: [],
    amenities: [],
    propertyTypes: [],
    guestRating: null,
    locations: [],
    roomTypes: [],
    checkIn: "",
    checkOut: "",
    guests: 2,
    rooms: 1,
    availableOnly: false,
    sortBy: "recommended",
    ...overrides,
  };
}

function parseNumericPrice(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

export function buildHotelFilterDataset(hotels: Hotel[]): HotelFilterRecord[] {
  if (hotels.length === 0) {
    return SAMPLE_HOTEL_FILTER_DATASET;
  }

  return hotels.map((hotel, index) => {
    const template = SAMPLE_HOTEL_FILTER_DATASET[index % SAMPLE_HOTEL_FILTER_DATASET.length];
    const rating = normalizeHotelRating(hotel.rating || template.rating);
    const fallbackPrice = Math.round(rating * 900 + (template.starRating || 4) * 650);
    const computedPrice = parseNumericPrice((hotel as Hotel & { bestRoomPrice?: string | number | null }).bestRoomPrice)
      ?? parsePriceRange((hotel as Hotel & { priceRange?: string | null; bestRoomPrice?: string | number | null }).priceRange)
      ?? fallbackPrice;
    const amenities = normalizeAmenities(hotel.amenities);
    const propertyType = inferPropertyType(hotel);
    const starRating = clampStarRating(Number((hotel as Hotel & { starRating?: number }).starRating ?? template.starRating ?? rating));
    const reviewCount = Number((hotel as Hotel & { reviewCount?: number }).reviewCount ?? template.reviewCount ?? 0);

    return {
      id: hotel.id,
      name: hotel.name,
      price: computedPrice,
      rating,
      amenities: amenities.length > 0 ? amenities : template.amenities,
      location: deriveLocation(hotel, template.location || hotel.city || FALLBACK_LOCATIONS[index % FALLBACK_LOCATIONS.length]),
      type: propertyType,
      roomType: inferRoomType(starRating, propertyType),
      availabilityDates: template.availabilityDates,
      city: hotel.city,
      starRating,
      reviewCount,
      image: (hotel as Hotel & { image?: string | null }).image ?? undefined,
      images: hotel.images ?? undefined,
      address: hotel.address ?? undefined,
      description: hotel.description ?? undefined,
      guestRating: rating,
      originalHotel: hotel,
    };
  });
}

function matchesAvailability(hotel: HotelFilterRecord, checkIn: string, checkOut: string) {
  if (!checkIn || !checkOut) {
    return true;
  }

  const desiredStart = new Date(checkIn);
  const desiredEnd = new Date(checkOut);

  if (Number.isNaN(desiredStart.getTime()) || Number.isNaN(desiredEnd.getTime()) || desiredEnd <= desiredStart) {
    return true;
  }

  return hotel.availabilityDates.some((window) => {
    const availableStart = new Date(window.checkIn);
    const availableEnd = new Date(window.checkOut);
    return desiredStart >= availableStart && desiredEnd <= availableEnd;
  });
}

export function filterHotels(hotels: HotelFilterRecord[], filters: HotelFilterState): HotelFilterRecord[] {
  const searchTerm = filters.search.trim().toLowerCase();

  return hotels.filter((hotel) => {
    const matchesSearch = searchTerm.length === 0 || [hotel.name, hotel.city, hotel.location, hotel.type]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(searchTerm));
    const matchesPrice = hotel.price >= filters.priceRange[0] && hotel.price <= filters.priceRange[1];
    const matchesStars = filters.starRatings.length === 0 || filters.starRatings.includes(hotel.starRating);
    const matchesAmenities = filters.amenities.length === 0
      || filters.amenities.every((amenity) => hotel.amenities.some((item) => item.toLowerCase() === amenity.toLowerCase()));
    const matchesType = filters.propertyTypes.length === 0 || filters.propertyTypes.includes(hotel.type);
    const matchesGuestRating = filters.guestRating == null || hotel.guestRating >= filters.guestRating;
    const matchesLocation = filters.locations.length === 0
      || filters.locations.some((location) => location.toLowerCase() === hotel.location.toLowerCase() || location.toLowerCase() === hotel.city.toLowerCase());
    const matchesRoomType = filters.roomTypes.length === 0 || filters.roomTypes.includes(hotel.roomType);
    const matchesDates = matchesAvailability(hotel, filters.checkIn, filters.checkOut);

    return matchesSearch
      && matchesPrice
      && matchesStars
      && matchesAmenities
      && matchesType
      && matchesGuestRating
      && matchesLocation
      && matchesRoomType
      && matchesDates;
  });
}

export function sortHotels(hotels: HotelFilterRecord[], sortBy: HotelSortOption): HotelFilterRecord[] {
  const sorted = [...hotels];

  switch (sortBy) {
    case "price-low":
      sorted.sort((left, right) => left.price - right.price);
      break;
    case "price-high":
      sorted.sort((left, right) => right.price - left.price);
      break;
    case "rating-high":
      sorted.sort((left, right) => right.rating - left.rating || right.reviewCount - left.reviewCount);
      break;
    case "popularity":
      sorted.sort((left, right) => right.reviewCount - left.reviewCount || right.rating - left.rating);
      break;
    case "newest":
      sorted.sort((left, right) => String((right.originalHotel as any)?.createdAt || "").localeCompare(String((left.originalHotel as any)?.createdAt || "")));
      break;
    case "stars-high":
      sorted.sort((left, right) => right.starRating - left.starRating || right.rating - left.rating);
      break;
    case "name":
      sorted.sort((left, right) => left.name.localeCompare(right.name));
      break;
    case "recommended":
    default:
      sorted.sort((left, right) => (right.rating * 100 + right.reviewCount) - (left.rating * 100 + left.reviewCount));
      break;
  }

  return sorted;
}

export function getHotelFilterBounds(hotels: HotelFilterRecord[]) {
  if (hotels.length === 0) {
    return { min: 0, max: 30000 };
  }

  const prices = hotels.map((hotel) => hotel.price);
  const min = Math.floor(Math.min(...prices) / 500) * 500;
  const max = Math.ceil(Math.max(...prices) / 500) * 500;
  return { min, max };
}

export function parseHotelFilterState(searchParams: URLSearchParams, bounds?: { min: number; max: number }) {
  const minBound = bounds?.min ?? 0;
  const maxBound = bounds?.max ?? 30000;
  const stars = searchParams.get("stars")?.split(",").map((entry) => Number(entry)).filter(Boolean) ?? [];
  const amenities = searchParams.get("amenities")?.split(",").filter(Boolean) ?? [];
  const propertyTypes = searchParams.get("types")?.split(",").filter(Boolean) as HotelPropertyType[] | undefined;
  const locations = searchParams.get("locations")?.split(",").filter(Boolean) ?? [];
  const roomTypes = searchParams.get("roomTypes")?.split(",").filter(Boolean) as HotelRoomTypeFilter[] | undefined;
  const guestRating = searchParams.get("guestRating");
  const minPrice = Number(searchParams.get("minPrice") ?? minBound);
  const maxPrice = Number(searchParams.get("maxPrice") ?? maxBound);
  const guests = Number(searchParams.get("guests") ?? 2);
  const rooms = Number(searchParams.get("rooms") ?? 1);

  return createDefaultHotelFilterState({
    search: searchParams.get("search") ?? "",
    priceRange: [Number.isFinite(minPrice) ? minPrice : minBound, Number.isFinite(maxPrice) ? maxPrice : maxBound],
    starRatings: stars,
    amenities,
    propertyTypes: propertyTypes ?? [],
    guestRating: guestRating ? Number(guestRating) : null,
    locations,
    roomTypes: roomTypes ?? [],
    checkIn: searchParams.get("checkIn") ?? "",
    checkOut: searchParams.get("checkOut") ?? "",
    guests: Number.isFinite(guests) ? Math.max(1, Math.min(30, Math.round(guests))) : 2,
    rooms: Number.isFinite(rooms) ? Math.max(1, Math.min(10, Math.round(rooms))) : 1,
    availableOnly: searchParams.get("availableOnly") === "true",
    sortBy: (searchParams.get("sortBy") as HotelSortOption) || (searchParams.get("sort") as HotelSortOption) || "recommended",
  });
}

export function buildHotelFilterQuery(filters: HotelFilterState) {
  const params = new URLSearchParams();

  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.starRatings.length > 0) params.set("stars", filters.starRatings.join(","));
  if (filters.amenities.length > 0) params.set("amenities", filters.amenities.join(","));
  if (filters.propertyTypes.length > 0) params.set("types", filters.propertyTypes.join(","));
  if (filters.guestRating != null) params.set("guestRating", String(filters.guestRating));
  if (filters.locations.length > 0) params.set("locations", filters.locations.join(","));
  if (filters.roomTypes.length > 0) params.set("roomTypes", filters.roomTypes.join(","));
  if (filters.checkIn) params.set("checkIn", filters.checkIn);
  if (filters.checkOut) params.set("checkOut", filters.checkOut);
  if (filters.guests !== 2) params.set("guests", String(filters.guests));
  if (filters.rooms !== 1) params.set("rooms", String(filters.rooms));
  if (filters.availableOnly) params.set("availableOnly", "true");
  params.set("minPrice", String(filters.priceRange[0]));
  params.set("maxPrice", String(filters.priceRange[1]));
  if (filters.sortBy !== "recommended") params.set("sortBy", filters.sortBy);

  return params.toString();
}

export function getActiveHotelFilterTags(filters: HotelFilterState): HotelFilterTag[] {
  const tags: HotelFilterTag[] = [];

  if (filters.search.trim()) {
    tags.push({ key: "search", label: `Search: ${filters.search.trim()}` });
  }

  if (filters.priceRange[0] > 0 || filters.priceRange[1] < 30000) {
    tags.push({ key: "price", label: `Rs ${filters.priceRange[0].toLocaleString("en-IN")} - Rs ${filters.priceRange[1].toLocaleString("en-IN")}` });
  }

  filters.starRatings.forEach((stars) => {
    tags.push({ key: `star:${stars}`, label: `${stars} star` });
  });

  filters.amenities.forEach((amenity) => {
    tags.push({ key: `amenity:${amenity}`, label: amenity });
  });

  filters.propertyTypes.forEach((type) => {
    tags.push({ key: `type:${type}`, label: type });
  });

  filters.locations.forEach((location) => {
    tags.push({ key: `location:${location}`, label: location });
  });

  filters.roomTypes.forEach((roomType) => {
    tags.push({ key: `room:${roomType}`, label: roomType });
  });

  if (filters.guestRating != null) {
    tags.push({ key: "guestRating", label: `${filters.guestRating}+ guest rating` });
  }

  if (filters.checkIn || filters.checkOut) {
    tags.push({
      key: "dates",
      label: `${filters.checkIn || "Any"} to ${filters.checkOut || "Any"}`,
    });
  }

  if (filters.guests !== 2) {
    tags.push({ key: "guests", label: `${filters.guests} guest${filters.guests === 1 ? "" : "s"}` });
  }

  if (filters.rooms !== 1) {
    tags.push({ key: "rooms", label: `${filters.rooms} room${filters.rooms === 1 ? "" : "s"}` });
  }

  if (filters.availableOnly) {
    tags.push({ key: "availableOnly", label: "Available rooms only" });
  }

  return tags;
}

# Taxi interactive map (Leaflet + OSRM) setup

This project has two map experiences:

- `"/map"`: open-source demo map (Leaflet + OSRM + Nominatim)
- **Live ride tracking** (user booking page + admin assign drawer): **Google Maps** (Directions API)

The interactive taxi ride-map at route `"/map"` is implemented with **Leaflet** (`react-leaflet`) on the frontend and uses open services for geocoding + routing:

- **Search + reverse geocoding**: Nominatim (OpenStreetMap)
- **Routing (distance/time + polyline)**: OSRM demo server (`router.project-osrm.org`)

No Google API key is required.

## Features

- **Interactive map** with zoom + pan (Leaflet)
- **Pickup selection**
  - Click map to set pickup (first click)
  - Draggable pickup marker
  - Reverse-geocoded address auto-fills “Pickup Location”
- **Drop selection**
  - Click map to set drop (second click)
  - Draggable drop marker
  - Search-based drop input with autocomplete (Nominatim)
- **Route + distance + ETA**
  - Route polyline drawn between pickup and drop
  - Distance and duration update whenever either marker changes
- **Fare estimate**
  - Simple fare calculation based on distance (see `RideSummary` and `ride-map-page.tsx`)
- **Bonus**
  - **Driver simulation** toggle: animated marker moves along the route
  - **Map theme** toggle: light/dark tiles

## Running locally

From the repo root:

```bash
npm install
npm run dev
```

Then open the app and go to:

- `"/map"` for the interactive ride map page
- Use **Use Current Location** to set pickup from browser geolocation (permission required)

## Google Maps key (for live tracking)

Live ride tracking uses Google Maps. Set this in your environment and restart dev server:

```bash
VITE_GOOGLE_MAPS_API_KEY=your_key_here
```

## Notes / production guidance

- **Rate limits & usage policies**: Nominatim and the public OSRM demo server are for low-volume usage and demos.
  - For production, run your own Nominatim/Photon (search) and OSRM/Valhalla (routing), or use a paid maps provider.
- **Geolocation permissions**:
  - If the user denies permission, the UI still works by searching/clicking the map.
- **Leaflet CSS**:
  - The Leaflet stylesheet is imported in `client/src/index.css` (`@import "leaflet/dist/leaflet.css";`).

## Key files

- **Page**: `client/src/pages/ride-map-page.tsx`
- **Components**:
  - `client/src/components/MapComponent.tsx`
  - `client/src/components/LocationSearchInput.tsx`
  - `client/src/components/RideSummary.tsx`
- **Optional backend storage**:
  - `server/map-routes.ts` registers `POST /api/rides` (stores payload in MongoDB collection `rides`)


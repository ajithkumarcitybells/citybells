# Taxi Driver Selection Test Steps

## Customer selects a driver and books

1. Open `/taxi`.
2. Select pickup and drop locations.
3. Select a vehicle type.
4. In "Choose your driver", use sort/filter controls and select a nearby driver.
5. Confirm the ride.
6. Expected:
   - `POST /api/taxi/rides` includes `driverId`.
   - Ride stores `customerSelectedDriver: true`.
   - Ride status becomes `driver_assigned` when the selected driver is still available.
   - Taxi booking page shows "Your selected driver".

## Auto assign fallback

1. Open `/taxi`.
2. Select pickup, drop, and vehicle type.
3. Click "Auto assign" in the selected driver summary.
4. Confirm ride.
5. Expected:
   - `POST /api/taxi/rides` omits `driverId`.
   - Existing auto/admin assignment flow remains unchanged.

## Selected driver unavailable

1. Select a nearby driver.
2. Make that driver offline or assign them to another active ride before confirming.
3. Confirm ride.
4. Expected:
   - API returns `409`.
   - UI shows "Selected driver is no longer available".
   - Driver selection clears and refreshes nearby drivers.

## Vehicle type switch

1. Select a car driver.
2. Switch vehicle type to bike or auto.
3. Expected:
   - Nearby driver query refetches by compatible type.
   - Existing selected driver is cleared if no longer in the compatible nearby list.

## No GPS or no drivers

1. Deny GPS or use a pickup area with no online approved drivers.
2. Expected:
   - Empty state says "No drivers nearby. Try auto assign."
   - Customer can still book using auto assign.

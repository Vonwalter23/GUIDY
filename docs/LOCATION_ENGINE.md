# GUIDY - Location Engine Documentation

## Overview

The Location Engine is a core module of the GUIDY application that provides GPS location functionality. It handles location permissions, real-time location updates, and movement detection.

## Architecture

### Directory Structure

```
src/services/location/
├── LocationTypes.ts         # TypeScript interfaces and types
├── LocationPermissions.ts    # Android permission handling
├── LocationUtils.ts         # Geolocation utility functions
├── DistanceCalculator.ts    # Haversine formula implementation
├── MovementDetector.ts      # Movement detection (walking/running/driving)
├── LocationService.ts       # Main service with getCurrentLocation, startLocationUpdates
├── LocationProvider.tsx     # React Context provider
├── useLocationStore.ts     # Zustand global store
└── index.ts                # Module exports
```

### Provider Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         App.tsx                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │              LocationProvider                       │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │         LocationService (Singleton)           │  │  │
│  │  │  - Geolocation API                          │  │  │
│  │  │  - Permission handling                      │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │         useLocationStore (Zustand)           │  │  │
│  │  │  - State management                         │  │  │
│  │  │  - Persistence                             │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Android Permissions

### Required Permissions

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

### Permission Flow

1. **Initial State**: Permission status is 'denied'
2. **Request Permission**: User clicks "Conceder Permiso" button
3. **System Dialog**: Android shows permission dialog
4. **Result Handling**:
   - `granted`: GPS tracking starts automatically
   - `denied`: User can try again
   - `blocked`: User must open Settings to grant permission

### Android Version Compatibility

| Android Version | API Level | Permission Handling |
|-----------------|-----------|---------------------|
| Android 12 | 31 | Standard location permissions |
| Android 13 | 33 | Same as Android 12+ |
| Android 14 | 34 | Same as Android 13+ |

## Usage

### Basic Usage

```typescript
import {LocationProvider, useLocation} from './services/location';

function App() {
  return (
    <LocationProvider>
      <MyApp />
    </LocationProvider>
  );
}

function MyComponent() {
  const {
    currentLocation,
    permissionStatus,
    gpsStatus,
    isTracking,
    requestPermission,
    startTracking,
    stopTracking,
  } = useLocation();

  if (permissionStatus !== 'granted') {
    return <PermissionScreen onRequestPermission={requestPermission} />;
  }

  return (
    <View>
      <Text>Lat: {currentLocation?.latitude}</Text>
      <Text>Lng: {currentLocation?.longitude}</Text>
      <Text>Accuracy: {currentLocation?.accuracy}m</Text>
    </View>
  );
}
```

### Available Hooks

- `useLocation()`: Full location context
- `useCurrentLocation()`: Current location only
- `useHasLocationPermission()`: Boolean for permission status
- `useGpsStatus()`: GPS status ('active', 'inactive', 'unavailable')

## GPS Status

| Status | Description | Indicator Color |
|--------|-------------|----------------|
| active | GPS is receiving updates | Green (#4CAF50) |
| inactive | GPS is enabled but no updates | Orange (#FF9800) |
| unavailable | GPS is disabled or unavailable | Red (#F44336) |

## Location Data

### LocationData Interface

```typescript
interface LocationData {
  latitude: number;        // Degrees
  longitude: number;       // Degrees
  altitude?: number;       // Meters
  accuracy: number;       // Meters
  altitudeAccuracy?: number;
  speed?: number;         // m/s
  heading?: number;       // Degrees
  timestamp: number;      // Unix timestamp
}
```

## Movement Detection

The Movement Detector analyzes GPS data to determine user movement:

- **Stationary**: Speed < 0.5 m/s
- **Walking**: Speed 0.5 - 2 m/s
- **Running**: Speed 2 - 5 m/s
- **Driving**: Speed > 5 m/s

## Distance Calculations

Uses the Haversine formula for accurate distance calculations:

```typescript
import {calculateDistance} from './services/location';

const distance = calculateDistance(
  {latitude: -43.3, longitude: -65.1},
  {latitude: -43.31, longitude: -65.11},
);
// Returns distance in meters
```

## Testing

Tests are located in `__tests__/LocationPermissions.test.ts`:

```bash
npm test -- --testPathPattern=LocationPermissions
```

Test coverage includes:
- Permission granted flow
- Permission denied flow
- Permission blocked flow
- Error handling
- Settings opening

## Security Considerations

1. **Location Data**: Never stored or transmitted without user consent
2. **Battery Impact**: GPS updates are optimized to minimize battery drain
3. **Privacy**: User can revoke permission at any time
4. **Background**: Location tracking requires explicit user consent

## Limitations

1. **GPS Required**: Device must have GPS hardware
2. **Internet**: Some features require internet connection
3. **Battery**: Continuous GPS updates drain battery
4. **Accuracy**: GPS accuracy varies by device and environment

## Dependencies

```json
{
  "@react-native-community/geolocation": "^3.x"
}
```

## Changelog

| Version | Changes |
|---------|---------|
| 0.0.3 | STAGE 3.1: Hardened permissions, improved UX |
| 0.0.2 | STAGE 2: Initial Location Engine implementation |

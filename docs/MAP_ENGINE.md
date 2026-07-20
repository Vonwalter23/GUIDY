# GUIDY - Map Engine Documentation

## Overview

The Map Engine is a core module of the GUIDY application that provides map visualization using OpenStreetMap tiles. It is designed to work seamlessly with the Location Engine to display user position and navigate through the map.

## Architecture

### Directory Structure

```
src/services/maps/
├── MapTypes.ts         # TypeScript interfaces and types
├── MapConstants.ts     # Map configuration constants
├── MapUtils.ts        # Utility functions for map operations
├── MapService.ts      # Core map service class
├── MapProvider.tsx    # React Context provider
├── useMapStore.ts     # Zustand global store
└── index.ts           # Module exports
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      App.tsx                                │
│  ┌─────────────────┐    ┌─────────────────────────────┐  │
│  │ LocationProvider │    │       MapProvider            │  │
│  │ (LocationEngine) │    │    (MapProvider)             │  │
│  └────────┬─────────┘    └──────────────┬──────────────┘  │
│           │                              │                 │
│           └──────────────┬───────────────┘                 │
│                          ▼                                 │
│              ┌───────────────────────┐                    │
│              │   RecorridoScreen     │                    │
│              │   (Uses OpenStreetMap │                    │
│              │    component)         │                    │
│              └───────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

## Provider Selection

### Why OpenStreetMap?

- **No API Key Required**: Unlike Google Maps or Mapbox, OpenStreetMap is free to use
- **Open Source**: Licensed under ODbL, allowing commercial use
- **Global Coverage**: Comprehensive map data for most of the world
- **No Cost**: No usage fees or quotas

### Implementation Choice: WebView + Leaflet

We selected `react-native-webview` with Leaflet.js for the following reasons:

1. **Direct OSM Support**: Leaflet has native support for OpenStreetMap tiles
2. **No Native Dependencies**: Avoids complex native module configuration
3. **Proven Technology**: Leaflet is a battle-tested mapping library
4. **Full OSM Features**: Access to all OSM tile servers and features
5. **Lightweight**: Minimal impact on app bundle size

### Alternative Approaches Considered

| Approach | Pros | Cons |
|----------|------|------|
| react-native-maps + OSM | Native performance | Requires Google Play Services, complex setup |
| Mapbox GL Native | Beautiful maps | API key required, usage costs |
| Custom tile provider | Full control | High development effort |
| WebView + Leaflet | Simple, free | Slightly less native feel |

## Communication with Location Engine

### Data Flow

```
Location Engine          Map Engine
       │                      │
       │  currentLocation      │
       ├─────────────────────►│
       │                      │
       │              Updates user marker
       │              on map
       │                      │
       │                      ▼
       │              ┌──────────────┐
       │              │ OpenStreetMap│
       │              │   Display    │
       │              └──────────────┘
```

### Integration Points

1. **LocationProvider**: Provides location data via React Context
2. **MapProvider**: Consumes location data and updates the map
3. **OpenStreetMap Component**: Receives commands via postMessage API

### Message Protocol

The WebView communicates with React Native using JSON messages:

```typescript
// Update user location
{type: 'updateLocation', latitude: number, longitude: number}

// Center on user
{type: 'centerOnUser', latitude: number, longitude: number, animate: boolean}

// Set region
{type: 'setRegion', latitude: number, longitude: number, zoom: number}
```

## Scalability

### Performance Optimizations

1. **Memoization**: Map state is memoized to prevent unnecessary re-renders
2. **Debounced Updates**: Location updates are debounced to reduce frequency
3. **Lazy Loading**: Map loads only when needed

### Future Enhancements

1. **Offline Maps**: Cache tiles for offline use
2. **Multiple Markers**: Support for POI markers
3. **Route Planning**: Calculate and display routes
4. **Clustering**: Group nearby markers at low zoom levels

## Limitations

1. **WebView Dependency**: Uses WebView which has slightly different UX than native maps
2. **Internet Required**: Tiles require internet connection (no offline maps yet)
3. **Battery Impact**: Continuous location tracking affects battery life
4. **Limited Gestures**: Touch gestures depend on WebView implementation

## Usage

### Basic Usage

```typescript
import {MapProvider, useMap} from './services/maps';
import {LocationProvider} from './services/location';
import OpenStreetMap from './components/OpenStreetMap';

function MyScreen() {
  const {centerOnUser, isFollowingUser} = useMap();

  return (
    <OpenStreetMap
      followsUserLocation={isFollowingUser}
      onRegionChange={(region) => console.log('Region changed')}
    />
  );
}

// Wrap in providers
function App() {
  return (
    <LocationProvider>
      <MapProvider>
        <MyScreen />
      </MapProvider>
    </LocationProvider>
  );
}
```

### Available Hooks

- `useMap()`: Full map context
- `useMapRegion()`: Current map region
- `useIsFollowingUser()`: Follow mode state
- `useUserMarker()`: Current user marker

## Dependencies

```json
{
  "react-native-webview": "^14.x"
}
```

## Configuration

### Map Constants

Located in `MapConstants.ts`:

- `OSM_TILE_URL`: OpenStreetMap tile server URL
- `DEFAULT_REGION`: Default map center (Trelew, Argentina)
- `ZOOM_LEVELS`: Min/Max/Default zoom levels
- `REGION_DELTAS`: Delta values for different zoom levels

### Map Types

- `standard`: Default street map
- `satellite`: Not available in OSM (future enhancement)
- `hybrid`: Not available in OSM (future enhancement)

## Security Considerations

1. **Tile Source**: Only uses official OpenStreetMap tile servers
2. **HTTPS**: All tile requests use HTTPS
3. **Attribution**: Proper attribution is displayed on the map
4. **No User Data**: No location data is stored or transmitted

## Testing

The Map Engine includes comprehensive tests:

- Unit tests for MapUtils
- Unit tests for MapService
- Integration tests with Location Engine (planned)

Run tests:
```bash
npm test -- --testPathPattern=MapService
```

## Changelog

| Version | Changes |
|---------|---------|
| 0.0.3 | Initial Map Engine implementation with WebView + Leaflet |

# STAGE 4.4 - POI Engine Orchestration

## Overview

This stage implements the complete integration of all POI components into a single, unified pipeline. The goal is to connect Location Engine, Discovery Engine, Repository, Datasource, Session Manager, and Store into an automated discovery workflow.

## Architecture

### Pipeline Flow

```
Location Engine
       │
       ▼
DiscoveryScheduler (decides when to search)
       │
       ▼
DiscoveryEngine (orchestrates discovery)
       │
       ▼
POIRepository (data access layer)
       │
       ▼
DatasourceFactory → OverpassDatasource
       │
       ▼
POIRanking (ranks results)
       │
       ▼
POIDeduplicator (removes duplicates)
       │
       ▼
POISessionManager (session lifecycle)
       │
       ▼
POIStore (Zustand - UI state)
       │
       ▼
Map Component (displays POIs)
```

### Components

#### POIOrchestrator
Main orchestrator that coordinates all components.

```typescript
import { poiOrchestrator } from './services/poi';

// Initialize
await poiOrchestrator.initialize();

// Start
poiOrchestrator.start();

// Update location (called by Location Engine)
poiOrchestrator.updateLocation(40.7128, -74.0060);

// Get results
const pois = poiOrchestrator.getPOIs();

// Stop
poiOrchestrator.stop();
```

#### POIOrchestratorProvider
React provider for integration with React Native.

```tsx
import { POIOrchestratorProvider } from './services/poi';

function App() {
  return (
    <POIOrchestratorProvider autoStart={true}>
      <YourApp />
    </POIOrchestratorProvider>
  );
}
```

### Hooks

| Hook | Description |
|------|-------------|
| `usePOIOrchestrator()` | Full orchestrator context |
| `useIsOrchestratorRunning()` | Check if running |
| `useOrchestratorState()` | Get state enum |
| `useOrchestratorStats()` | Get statistics |
| `useSessionStats()` | Get session stats |
| `useDiscovery()` | Trigger discovery manually |

## Logging

Structured logging for debugging and monitoring:

```
[DISCOVERY] Movement detected { distance: 58, totalMoved: 158 }
[DISCOVERY] Starting POI discovery { location: {...}, radius: 300 }
[DISCOVERY] Discovery completed { poiCount: 12, durationMs: 245 }
[SESSION] POIs processed through session { added: 8 }
[ORCHESTRATOR] Store synced successfully
```

## State Machine

### Orchestrator States

| State | Description |
|-------|-------------|
| `IDLE` | Initial state, not initialized |
| `INITIALIZED` | Orchestrator initialized |
| `RUNNING` | Actively discovering POIs |
| `PAUSED` | Temporarily paused |
| `STOPPED` | Stopped, can restart |
| `ERROR` | Error occurred |

### State Transitions

```
IDLE ──initialize──> INITIALIZED
                         │
                         │ start
                         ▼
                    RUNNING
                         │
          ┌──────────────┼──────────────┐
          │              │              │
       pause          stop           error
          │              │              │
          ▼              ▼              ▼
       PAUSED         STOPPED        ERROR
          │              │              │
          │           start            │
       resume            │              ▼
          │              │            IDLE
          └──────► RUNNING ◄───────────┘
```

## Configuration

```typescript
interface POIOrchestratorConfig {
  autoDiscovery: boolean;       // Enable auto-discovery
  movementThreshold: number;     // Min distance to trigger search (meters)
  cooldownMs: number;           // Time between searches (ms)
  defaultRadius: number;       // Default search radius (meters)
  maxResults: number;           // Max POIs to return
  sessionEnabled: boolean;      // Enable session management
  storeSyncEnabled: boolean;    // Sync with Zustand store
}

const DEFAULT_ORCHESTRATOR_CONFIG = {
  autoDiscovery: true,
  movementThreshold: 50,
  cooldownMs: 20000,
  defaultRadius: 300,
  maxResults: 50,
  sessionEnabled: true,
  storeSyncEnabled: true,
};
```

## Integration

### With Location Engine

The orchestrator receives location updates from Location Engine:

```typescript
// In Location Engine listener
locationEngine.onLocationUpdate((location) => {
  poiOrchestrator.updateLocation(location.latitude, location.longitude);
});
```

### With Map Component

```typescript
import { usePOIStore } from './services/poi';

function MapComponent() {
  const pois = usePOIStore(state => state.pois);
  
  return (
    <Map>
      {pois.map(poi => (
        <Marker key={poi.id} coordinate={poi} />
      ))}
    </Map>
  );
}
```

## Statistics

The orchestrator tracks:

| Stat | Description |
|------|-------------|
| `totalDiscoveries` | Total number of discovery operations |
| `totalPOIsDiscovered` | Total POIs discovered |
| `lastDiscoveryTime` | Timestamp of last discovery |
| `lastDiscoveryDuration` | Time taken for last discovery (ms) |
| `cacheHits` | Number of cache hits |
| `cacheMisses` | Number of cache misses |

## Error Handling

- Network errors: Fall back to cache
- Location errors: Retry with exponential backoff
- Session errors: Reset session and continue
- Discovery errors: Log and continue

## Performance Considerations

1. **Cooldown**: Prevents rapid consecutive searches (20s default)
2. **Movement Threshold**: Only searches after user moves 50m
3. **Cache**: LRU cache with 5-minute TTL
4. **Deduplication**: Removes duplicate POIs before processing
5. **Ranking**: Prioritizes relevant POIs

## Future Enhancements

1. Predictive loading based on user movement patterns
2. Background sync for offline support
3. Adaptive search radius based on POI density
4. Machine learning for POI ranking

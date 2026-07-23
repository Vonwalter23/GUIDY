# POI Discovery Engine Architecture

**STAGE 4.2** - POI Discovery Engine

---

## Overview

The POI Discovery Engine is the intelligent "brain" that decides when, what, and how much to search for Points of Interest. It operates completely decoupled from the UI and uses the existing architecture (STAGE 4.0, 4.1).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     UI Components (Future)                        │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       POIProvider                                │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        POIEngine                                 │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DiscoveryEngine ⭐                             │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ State Machine                                               ││
│  │ MovementThreshold                                           ││
│  │ Scheduler                                                   ││
│  │ Cache                                                       ││
│  │ Deduplicator                                                ││
│  │ Ranking                                                     ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      POIRepository                               │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DatasourceFactory                           │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Datasources                                │
└─────────────────────────────────────────────────────────────────┘
```

## State Machine

### States

| State | Description |
|-------|-------------|
| `IDLE` | Engine not started |
| `WAITING_MOVEMENT` | Waiting for user to move threshold distance |
| `WAITING_COOLDOWN` | Waiting for cooldown period |
| `SEARCHING` | Performing network search |
| `USING_CACHE` | Using cached results |
| `RESULTS_READY` | Results available |
| `ERROR` | Error occurred |
| `OFFLINE` | Network unavailable |

### State Diagram

```
IDLE ──START──> WAITING_MOVEMENT
                      │
                      │ MOVEMENT_THRESHOLD_EXCEEDED
                      ▼
              WAITING_COOLDOWN
                      │
                      │ COOLDOWN_COMPLETE
                      ▼
                 SEARCHING
                 /        \
         CACHE_HIT    SEARCH_COMPLETE
           /                \
    USING_CACHE         RESULTS_READY
           \                /
            ──> WAITING_MOVEMENT
```

### Events

- `START` - Start discovery
- `STOP` - Stop discovery
- `LOCATION_UPDATE` - New location received
- `MOVEMENT_THRESHOLD_EXCEEDED` - User moved enough
- `COOLDOWN_COMPLETE` - Cooldown finished
- `SEARCH_START` - Search initiated
- `SEARCH_COMPLETE` - Search finished
- `CACHE_HIT` - Cache hit
- `CACHE_MISS` - Cache miss
- `ERROR` - Error occurred
- `NETWORK_OFFLINE` - Network unavailable
- `NETWORK_ONLINE` - Network restored
- `RETRY` - Retry failed search

## Movement Threshold

Determines when the user has moved enough to warrant a new search.

### Configuration

```typescript
interface MovementConfig {
  // Distance to move before searching (meters)
  movementThreshold: 50; // default
  
  // Search radius by movement mode
  radiusByMode: {
    WALKING: 150,    // 150m
    CYCLING: 300,    // 300m
    VEHICLE: 600,    // 600m
  };
}
```

### Algorithm

1. Track cumulative distance traveled
2. When threshold exceeded:
   - Reset movement counter
   - Trigger cooldown
3. Movement modes affect search radius

## Dynamic Radius

Search radius adapts to movement mode:

| Mode | Radius | Use Case |
|------|--------|----------|
| WALKING | 150m | Pedestrian exploration |
| CYCLING | 300m | Bike routes |
| VEHICLE | 600m | Driving directions |

## Scheduler

Intelligent scheduling to avoid unnecessary searches.

### Features

- **Cooldown** - Prevent rapid consecutive searches (20s default)
- **Debouncing** - Wait for location stability (300ms default)
- **Network Check** - Skip if offline
- **Task Priority** - Execute high priority tasks first

### Configuration

```typescript
interface SchedulerConfig {
  cooldownMs: 20000;        // 20 seconds
  debounceMs: 300;          // 300ms
  enableCooldown: true;
  enableNetworkCheck: true;
}
```

## Intelligent Cache

LRU cache with TTL for discovery results.

### Features

- **Location-based** - Cache by lat/lng/radius
- **TTL** - Automatic expiration (5 min default)
- **Nearby matching** - Return nearby cache if exact not found
- **LRU eviction** - Remove least recently used

### Configuration

```typescript
interface CacheConfig {
  cacheTTLMs: 300000;  // 5 minutes
  maxSize: 50;         // Max entries
}
```

## POI Ranking

Automatic ranking based on multiple criteria.

### Weights (configurable)

| Criterion | Weight | Description |
|-----------|--------|-------------|
| Distance | 0.4 | Closer = higher rank |
| Relevance | 0.3 | OSM importance, Wikipedia, images |
| Quality | 0.15 | Rating, reviews, accessibility |
| Category | 0.1 | Preferred categories |
| Custom | 0.05 | User preferences |

### Ranking Algorithm

```
score = (
  distance * 0.4 +
  relevance * 0.3 +
  quality * 0.15 +
  category * 0.1 +
  custom * 0.05
)
```

## Deduplication

Remove duplicate POIs from results.

### Deduplication Rules

1. **Coordinate threshold** - 10 meters
2. **Name similarity** - 80% Levenshtein distance
3. **Metadata merge** - Combine duplicate info

### Validation

Discard POIs that are:
- Missing ID
- Missing coordinates
- Invalid coordinates
- Missing category

## Components

### DiscoveryEngine

Main orchestrator that coordinates all components.

```typescript
const engine = new DiscoveryEngine({
  movementThreshold: 50,
  cooldownMs: 20000,
  cacheTTLMs: 300000,
});
```

### MovementThreshold

Tracks user movement and calculates distances.

```typescript
const threshold = new MovementThreshold(50);
threshold.updateLocation(lat, lng);
const exceeded = threshold.isThresholdExceeded();
```

### DiscoveryScheduler

Manages search timing and debouncing.

```typescript
const scheduler = new DiscoveryScheduler(20000, 300);
scheduler.scheduleSearch(callback);
```

### DiscoveryCache

LRU cache for discovery results.

```typescript
const cache = new DiscoveryCache(300000, 50);
cache.set(lat, lng, radius, pois);
const result = cache.get(lat, lng, radius);
```

### POIRanking

Ranks POIs by multiple criteria.

```typescript
const ranking = new POIRanking();
ranking.setUserLocation(lat, lng);
ranking.setPreferredCategories(['food', 'attraction']);
const ranked = ranking.rank(pois);
```

### POIDeduplicator

Removes duplicate POIs.

```typescript
const dedup = new POIDeduplicator();
const unique = dedup.deduplicate(pois);
```

### DiscoveryStateMachine

Manages engine state transitions.

```typescript
const sm = new DiscoveryStateMachine();
sm.sendEvent(DiscoveryEvent.START);
const state = sm.getState();
```

## Usage Example

```typescript
import { discoveryEngine, MovementMode } from './discovery';

// Initialize
await discoveryEngine.initialize();

// Configure
discoveryEngine.setMovementMode(MovementMode.WALKING);
discoveryEngine.setPreferredCategories(['restaurant', 'cafe']);

// Start discovery
discoveryEngine.start();

// Update location (called by Location Engine)
discoveryEngine.updateLocation(40.7128, -74.0060);

// Get results
const pois = discoveryEngine.getResults();

// Check status
const state = discoveryEngine.getState();
const stats = discoveryEngine.getStats();

// Stop when done
discoveryEngine.stop();
```

## Performance Optimizations

1. **Debouncing** - Avoid searches for every tiny movement
2. **Cooldown** - Prevent API abuse
3. **Cache** - Avoid redundant network requests
4. **Deduplication** - Reduce POI count
5. **Ranking** - Prioritize relevant results

## Security Considerations

- No sensitive data stored
- Cache TTL prevents stale data
- Rate limiting via cooldown
- Error messages don't expose internals

## Future Enhancements

1. **Predictive Loading** - Anticipate user movement
2. **Background Sync** - Update POIs in background
3. **Offline Mode** - Full offline support
4. **Clustering** - Server-side POI clustering
5. **A/B Testing** - Test different configurations

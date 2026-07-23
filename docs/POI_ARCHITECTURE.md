# POI Engine Architecture

**STAGE 4.0** - POI Engine Architecture

---

## Overview

The POI (Point of Interest) Engine is a fully decoupled, extensible system for managing POIs in GUIDY. It follows SOLID principles and uses established patterns for maintainability and testability.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         UI Components                            │
│                   (RecorridoScreen, etc.)                       │
└─────────────────────────────┬───────────────────────────────────┘
                              │ usePOI()
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         POIProvider                             │
│              (React Context + Hooks)                            │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Zustand     │  │ AppState      │  │ Location Engine       │  │
│  │ Store       │  │ Hook          │  │ (Consumed only)      │  │
│  └─────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         POIEngine                               │
│                    (Orchestrator)                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Repository  │  │ Cache        │  │ Filter               │  │
│  │ Pattern     │  │              │  │                      │  │
│  └─────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       POIRepository                             │
│                   (Data Access Layer)                            │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    POIDatasource (Interface)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Overpass    │  │ Google       │  │ Future datasources   │  │
│  │             │  │ Places       │  │                      │  │
│  └─────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Design Patterns Used

### 1. Repository Pattern
- **Purpose**: Single entry point for all POI data access
- **Benefit**: Swapping data sources without changing UI
- **Location**: `src/services/poi/POIRepository.ts`

### 2. Provider Pattern
- **Purpose**: React Context for POI state management
- **Benefit**: Clean hook-based API for components
- **Location**: `src/services/poi/POIProvider.tsx`

### 3. State Machine Pattern
- **Purpose**: Predictable state transitions
- **Benefit**: No invalid states, clear transitions
- **Location**: `src/services/poi/POIStateMachine.ts`

### 4. Singleton Pattern
- **Purpose**: Single instance of services
- **Benefit**: Memory efficiency, global access
- **Examples**: `poiEngine`, `poiRepository`, `poiCache`

## Components

### POITypes.ts
Type definitions for all POI-related entities:
- `POI` - Main data model
- `POICategory` / `POISubcategory` - Classification
- `POISource` - Data source identifiers
- `POIState` / `POIEvent` - State machine
- `POIErrorCode` - Error handling

### POIConstants.ts
Configuration constants:
- Default engine configuration
- Cache TTL values
- Distance thresholds
- Icon mappings
- Color mappings

### POIStateMachine.ts
Single source of truth for POI state:
- States: IDLE, SEARCHING, LOADING, READY, FILTERING, SELECTED, NARRATING, VISITED, CACHED, ERROR
- Events: SEARCH, FILTER, SELECT, etc.
- Listener pattern for state changes

### usePOIStore.ts
Zustand store:
- Derived from state machine
- Provides selectors for UI
- Sync function for state machine integration

### POIRepository.ts
Data access layer:
- Datasource registration
- Fallback sources
- Distance/bearing calculations
- Data enrichment

### POIDatasource.ts
Datasource interface:
- `BasePOIDatasource` abstract class
- Future datasources implement this interface

### POIEngine.ts
Main orchestrator:
- Coordinates repository, cache, filter
- Consumes Location Engine (read-only)
- Handles search, filter, selection

### POICache.ts
In-memory cache:
- TTL support
- LRU eviction
- Version tracking
- Invalidación

### POIFilter.ts
Filter system:
- Multiple criteria (category, distance, rating, etc.)
- Sorting options
- Grouping

### POIProvider.tsx
React Context provider:
- Integrates POI Engine
- Consumes Location Engine
- Provides hooks for components

## Data Flow

```
User Search
    │
    ▼
POIProvider.searchPOIs()
    │
    ▼
POIEngine.searchPOIs()
    │
    ├──► POICache.get() ──► Return cached
    │
    └──► POIRepository.searchPOIs()
              │
              ▼
         POIDatasource.search()
              │
              ▼
         Return POIs
              │
              ▼
         POIEngine.enrichPOIs()
              │
              ▼
         POICache.set()
              │
              ▼
         POIStateMachine.sendEvent()
              │
              ▼
         POIStore.sync()
              │
              ▼
         UI Re-render
```

## Extensibility

### Adding New Data Sources

1. Create datasource class implementing `POIDatasource`:
```typescript
class GooglePlacesDatasource extends BasePOIDatasource {
  readonly source = 'google_places';
  
  async search(options: POISearchOptions): Promise<POI[]> {
    // Implementation
  }
}
```

2. Register in repository:
```typescript
poiRepository.registerDatasource(new GooglePlacesDatasource());
```

### Adding New Filters

1. Add filter criteria to `POIFilterCriteria` interface
2. Implement filter logic in `POIFilter.apply()`

## Performance Considerations

- Cache with configurable TTL
- Debounced search requests
- Memoized context values
- Efficient state selectors

## Testing Strategy

- Unit tests for filter, cache, state machine
- Mock datasources for repository
- Component tests with mock providers

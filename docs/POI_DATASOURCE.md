# POI Datasource Layer Architecture

**STAGE 4.1** - POI Datasource Layer

---

## Overview

The POI Datasource Layer provides a clean, extensible interface for accessing POI data from various external sources. This layer follows the Repository pattern and implements proper separation of concerns.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         UI Components                            │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         POIProvider                             │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         POIEngine                               │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       POIRepository                             │
│              (Abstracts datasource access)                       │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DatasourceFactory                            │
│              (Manages datasource lifecycle)                      │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Datasources                                │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Overpass    │  │ Google       │  │ Future datasources   │  │
│  │ Datasource  │  │ Places       │  │                      │  │
│  └─────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       External APIs                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Overpass    │  │ Google       │  │ Other APIs            │  │
│  │ API         │  │ Places API   │  │                      │  │
│  └─────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### BaseNetworkClient

Provides common network functionality:
- **AbortController** for request cancellation
- **Configurable timeouts**
- **Retry logic** with exponential backoff
- **Error handling** with proper error codes
- **Rate limiting** support

```typescript
interface NetworkConfig {
  baseUrl: string;
  timeout: number;      // milliseconds
  retries: number;
  retryDelay: number;   // milliseconds
  headers: Record<string, string>;
}
```

### OverpassDatasource

OpenStreetMap Overpass API implementation:
- **OSM Tag Mapping** - Maps OSM tags to POI categories
- **Query Builder** - Builds Overpass QL queries
- **Response Parser** - Converts OSM elements to POI objects
- **Rate Limiting** - Prevents API abuse
- **Error Handling** - Graceful error recovery

```typescript
interface OverpassConfig {
  baseUrl: string;
  timeout: number;
  maxResultSize: number;
  rateLimitDelay: number;
}
```

### DatasourceFactory

Manages datasource lifecycle:
- **Singleton Pattern** - Global factory instance
- **Health Checks** - Periodic datasource availability
- **Automatic Fallback** - Fails over to secondary sources
- **Priority System** - Configurable source priority
- **Registration** - Register/unregister datasources

```typescript
interface DatasourceFactoryConfig {
  defaultType: DatasourceType;
  healthCheckEnabled: boolean;
  healthCheckInterval: number;
  automaticFallback: boolean;
  fallbackOrder: DatasourceType[];
}
```

## Supported Data Sources

| Source | Status | Auth Required | API Key |
|--------|--------|---------------|---------|
| Overpass | ✅ Ready | No | No |
| Google Places | 🔜 Planned | Yes | Yes |
| Mapbox | 🔜 Planned | Yes | Yes |
| GeoNames | 🔜 Planned | Yes | Yes |
| Foursquare | 🔜 Planned | Yes | Yes |
| Offline | 🔜 Planned | No | No |

## OSM Tag Mapping

### Food & Drink
| OSM Tag | Category | Subcategory |
|---------|----------|------------|
| amenity=restaurant | food | restaurant |
| amenity=cafe | food | cafe |
| amenity=bar | food | bar |
| amenity=fast_food | food | fast_food |

### Attractions
| OSM Tag | Category | Subcategory |
|---------|----------|------------|
| tourism=museum | attraction | museum |
| tourism=attraction | attraction | landmark |
| tourism=viewpoint | attraction | viewpoint |

### Culture
| OSM Tag | Category | Subcategory |
|---------|----------|------------|
| amenity=place_of_worship | culture | church |
| historic=castle | culture | castle |
| historic=monument | culture | monument |

### Transport
| OSM Tag | Category | Subcategory |
|---------|----------|------------|
| amenity=parking | transport | parking |
| amenity=fuel | transport | gas_station |
| railway=station | transport | train_station |

## Usage

### Initialize Datasource
```typescript
import { OverpassDatasource } from './datasources';

const datasource = new OverpassDatasource();
await datasource.initialize();
```

### Search POIs
```typescript
const pois = await datasource.search({
  latitude: 40.7128,
  longitude: -74.0060,
  radius: 1000, // meters
  limit: 50,
});
```

### Use Factory
```typescript
import { datasourceFactory } from './datasources';

await datasourceFactory.initialize();

// Get default datasource
const datasource = datasourceFactory.getDefaultDatasource();

// Get datasource with fallback
const ds = datasourceFactory.getDatasourceWithFallback('overpass');

// Check health
const healthy = await datasourceFactory.checkHealth('overpass');
```

## Error Handling

### Error Codes
- `NETWORK_ERROR` - Network connectivity issues
- `RATE_LIMITED` - API rate limit exceeded
- `SOURCE_UNAVAILABLE` - Datasource not available
- `PERMISSION_DENIED` - Authentication required
- `UNKNOWN` - Unknown error

### Retry Logic
- Automatic retry on network errors
- Configurable retry count
- Exponential backoff
- Request cancellation support

## Security

### Best Practices
- No hardcoded API keys in source
- Timeout protection against hanging requests
- Rate limiting to prevent abuse
- User-Agent header identification
- Error messages don't expose internals

### Rate Limiting
- Overpass API: 1 request/second
- Configurable per datasource
- Queue-based request management

## Extensibility

### Add New Datasource

1. **Create datasource class:**
```typescript
export class GooglePlacesDatasource extends BasePOIDatasource {
  readonly source: POISource = 'google_places';
  
  // Implement required methods
}
```

2. **Register with factory:**
```typescript
await datasourceFactory.registerDatasource(
  'google_places',
  new GooglePlacesDatasource(),
  1 // priority
);
```

3. **Update factory config:**
```typescript
datasourceFactory.updateConfig({
  defaultType: 'google_places',
  fallbackOrder: ['google_places', 'overpass'],
});
```

## Testing

### Mock Datasources
```typescript
class MockDatasource extends BasePOIDatasource {
  readonly source = 'mock';
  
  async search(options) {
    return mockPOIs;
  }
}
```

### Unit Tests
```typescript
describe('OverpassDatasource', () => {
  it('should parse OSM response', () => {
    // test implementation
  });
});
```

## Performance

### Caching
- Network responses can be cached by upper layers
- POICache provides LRU cache with TTL

### Optimization
- Request debouncing
- Response pagination
- Lazy initialization
- Resource cleanup

## Future Enhancements

1. **Offline Mode** - Cache POIs for offline access
2. **Background Sync** - Sync POI data in background
3. **Delta Updates** - Incremental POI updates
4. **Prefetching** - Anticipate user movements
5. **Clustering** - Server-side POI clustering

/**
 * GUIDY - POI Services
 * Public API for POI functionality
 * 
 * STAGE 4.0: POI Engine Architecture
 */

// Types
export type { POISource, POI, POICategory, POISubcategory, POICacheEntry } from './POITypes';
export { POISources, POIState, POIEvent, POISortOption, POIErrorCode, POIErrorCodes } from './POITypes';

// Constants
export * from './POIConstants';

// State Machine
export { poiStateMachine, POIStateMachine } from './POIStateMachine';

// Store
export {
  usePOIStore,
  usePOIState,
  usePOIs,
  useSelectedPOI,
  useIsPOILoading,
  useIsPOIFiltering,
  usePOIError,
  useIsPOIReady,
  usePOIById,
  usePOIStats,
  useVisitedPOIs,
  usePOIsByCategory,
  useNearbyPOIs,
  usePOICountByCategory,
  syncPOIStoreWithStateMachine,
} from './usePOIStore';

// Repository
export { poiRepository, POIRepository, POIRepositoryError } from './POIRepository';

// Datasource interface
export { BasePOIDatasource } from './POIDatasource';

// Engine
export { poiEngine, POIEngine } from './POIEngine';

// Cache
export { poiCache, POICache } from './POICache';

// Filter
export { poiFilter, POIFilter } from './POIFilter';

// Provider
export {
  POIProvider,
  usePOI,
  usePOISearch,
} from './POIProvider';

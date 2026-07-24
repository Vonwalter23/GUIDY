/**
 * GUIDY - POI Services
 * Public API for POI functionality
 * 
 * STAGE 4.1 CERTIFIED BASE
 * Recovery from Stage 4.4H - Removed Stage 4.2-4.4 code
 * 
 * POI Orchestrator, Discovery, and Session temporarily disabled
 * for architectural recovery.
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

// Datasources (STAGE 4.1)
export * from './datasources';

// Engine
export { poiEngine, POIEngine } from './POIEngine';

// Cache
export { poiCache, POICache } from './POICache';

// Filter
export { poiFilter, POIFilter } from './POIFilter';

/**
 * NOTE: POI Orchestrator, Discovery Engine, and Session Manager
 * have been temporarily disabled for Stage 4.1 recovery.
 * These features will be re-implemented properly in a future stage.
 */

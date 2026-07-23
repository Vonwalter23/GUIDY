/**
 * GUIDY - POI Services
 * Public API for POI functionality
 * 
 * STAGE 4.4: POI Engine Orchestration
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

// Discovery Engine (STAGE 4.2)
export * from './discovery';

// Session Manager (STAGE 4.3)
export * from './session';

// Engine
export { poiEngine, POIEngine } from './POIEngine';

// Cache
export { poiCache, POICache } from './POICache';

// Filter
export { poiFilter, POIFilter } from './POIFilter';

// Orchestrator (STAGE 4.4)
export { poiOrchestrator, POIOrchestrator } from './POIOrchestrator';
export type { POIOrchestratorConfig, OrchestratorState } from './POIOrchestrator';

// Orchestrator Provider (STAGE 4.4)
export {
  POIOrchestratorProvider,
  usePOIOrchestrator,
  useIsOrchestratorRunning,
  useOrchestratorState,
  useOrchestratorStats,
  useSessionStats,
  useDiscovery,
} from './POIOrchestratorProvider';

// Provider
export {
  POIProvider,
  usePOI,
  usePOISearch,
} from './POIProvider';

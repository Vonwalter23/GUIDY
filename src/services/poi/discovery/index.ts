/**
 * GUIDY - POI Discovery
 * Public API for POI Discovery Engine
 * 
 * STAGE 4.2: POI Discovery Engine
 */

// Types
export type {
  DiscoveryConfig,
  DiscoveryResult,
  DiscoveryStats,
  MovementData,
  SchedulerTask,
  ValidationResult,
  DeduplicationOptions,
} from './DiscoveryTypes';
export { DiscoveryState, DiscoveryEvent, MovementMode } from './DiscoveryTypes';
export { DEFAULT_DISCOVERY_CONFIG } from './DiscoveryTypes';

// Components
export { DiscoveryEngine, discoveryEngine } from './DiscoveryEngine';
export { MovementThreshold } from './MovementThreshold';
export { POIDeduplicator } from './POIDeduplicator';
export { POIRanking, DEFAULT_RANKING_WEIGHTS } from './POIRanking';
export type { RankingWeights } from './POIRanking';
export { DiscoveryCache } from './DiscoveryCache';
export { DiscoveryScheduler, SchedulerEvent } from './DiscoveryScheduler';
export { DiscoveryStateMachine, discoveryStateMachine } from './DiscoveryStateMachine';

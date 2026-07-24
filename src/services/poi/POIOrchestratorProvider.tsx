/**
 * GUIDY - POI Orchestrator Provider
 * React provider that integrates POIOrchestrator with Location Engine
 * 
 * STAGE 4.4: POI Engine Orchestration
 * 
 * This provider:
 * - Connects Location Engine to POI Orchestrator
 * - Automatically triggers POI discovery on location updates
 * - Syncs results with POI Store
 * - Provides hooks for components
 */

import React, { createContext, useContext, useEffect, useCallback, useMemo, useRef } from 'react';
import type { POI } from './POITypes';
import { poiOrchestrator, OrchestratorState } from './POIOrchestrator';
import { useLocation } from '../location';
import { syncPOIStoreWithStateMachine } from './usePOIStore';

// Context types
interface POIOrchestratorContextValue {
  // State
  state: OrchestratorState;
  isRunning: boolean;
  isInitialized: boolean;
  
  // POI data
  pois: POI[];
  discoveredPOIs: POI[];
  activePOIs: POI[];
  visitedPOIs: POI[];
  
  // Statistics
  stats: ReturnType<typeof poiOrchestrator.getStats>;
  sessionStats: ReturnType<typeof poiOrchestrator.getSessionStats>;
  
  // Actions
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  discover: () => Promise<POI[]>;
  forceDiscover: () => Promise<POI[]>;
  
  // Location
  currentLocation: { latitude: number; longitude: number } | null;
  hasLocationPermission: boolean;
}

const POIOrchestratorContext = createContext<POIOrchestratorContextValue | null>(null);

const defaultContextValue: POIOrchestratorContextValue = {
  state: OrchestratorState.IDLE,
  isRunning: false,
  isInitialized: false,
  pois: [],
  discoveredPOIs: [],
  activePOIs: [],
  visitedPOIs: [],
  stats: {
    totalDiscoveries: 0,
    totalPOIsDiscovered: 0,
    lastDiscoveryTime: 0,
    lastDiscoveryDuration: 0,
    cacheHits: 0,
    cacheMisses: 0,
    orchestratorState: OrchestratorState.IDLE,
    discoveryEngineState: 'IDLE' as any,
    movementData: { lastLocation: null, totalDistance: 0, threshold: 50, thresholdExceeded: false, mode: 'WALKING' as any },
    schedulerStatus: { isInCooldown: false, remainingCooldown: 0, pendingTasks: 0, isOnline: true },
  },
  sessionStats: null,
  start: () => {},
  stop: () => {},
  pause: () => {},
  resume: () => {},
  discover: async () => [],
  forceDiscover: async () => [],
  currentLocation: null,
  hasLocationPermission: false,
};

/**
 * POI Orchestrator Provider Props
 */
interface POIOrchestratorProviderProps {
  children: React.ReactNode;
  autoStart?: boolean;
  autoDiscovery?: boolean;
}

/**
 * POI Orchestrator Provider Component
 */
export function POIOrchestratorProvider({
  children,
  autoStart = false,
  autoDiscovery = true,
}: POIOrchestratorProviderProps): React.JSX.Element {
  const isInitializedRef = useRef(false);
  const autoStartRef = useRef(autoStart);
  autoStartRef.current = autoStart;
  
  // Subscribe to location updates
  const {
    currentLocation: location,
    permissionStatus,
  } = useLocation();
  
  // Initialize orchestrator
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    const init = async () => {
      console.log(`[PROVIDER] Initializing POI Orchestrator...`);
      await poiOrchestrator.initialize();
      isInitializedRef.current = true;
      console.log(`[PROVIDER] Orchestrator initialized`);
      
      // Sync store with state machine
      syncPOIStoreWithStateMachine();
      
      // Auto-start if enabled
      if (autoStartRef.current) {
        console.log(`[PROVIDER] Auto-starting Orchestrator...`);
        poiOrchestrator.start();
        console.log(`[PROVIDER] Orchestrator started, isRunning: ${poiOrchestrator.isRunning()}`);
      }
    };
    
    init();
    
    return () => {
      poiOrchestrator.cleanup();
      isInitializedRef.current = false;
    };
  }, []);
  
  // Update orchestrator with location changes
  useEffect(() => {
    if (location) {
      console.log(`[PROVIDER] ============================================`);
      console.log(`[PROVIDER] Location update: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`);
      console.log(`[PROVIDER] autoDiscovery: ${autoDiscovery}`);
      console.log(`[PROVIDER] orchestrator.isRunning(): ${poiOrchestrator.isRunning()}`);
      console.log(`[PROVIDER] orchestrator.isReady(): ${poiOrchestrator.isReady()}`);
      
      // Always update location in orchestrator
      poiOrchestrator.updateLocation(location.latitude, location.longitude);
      
      // Auto-discover if enabled and orchestrator is running
      if (autoDiscovery) {
        if (poiOrchestrator.isRunning()) {
          console.log(`[PROVIDER] Triggering auto-discovery (orchestrator running)`);
          poiOrchestrator.discoverPOIs();
        } else {
          console.log(`[PROVIDER] Orchestrator not running yet, skipping discoverPOIs()`);
          console.log(`[PROVIDER] NOTE: Discovery will happen when orchestrator starts or on next location`);
        }
      } else {
        console.log(`[PROVIDER] Auto-discovery disabled`);
      }
      console.log(`[PROVIDER] ============================================`);
    } else {
      console.log(`[PROVIDER] No location available yet`);
    }
  }, [location, autoDiscovery]);
  
  // Trigger discovery when orchestrator starts (in case we missed location updates)
  useEffect(() => {
    if (poiOrchestrator.isRunning() && location && autoDiscovery) {
      console.log(`[PROVIDER] Orchestrator just started, triggering initial discovery`);
      poiOrchestrator.discoverPOIs();
    }
  }, [poiOrchestrator.isRunning(), location, autoDiscovery]);
  
  // Actions
  const start = useCallback(() => {
    poiOrchestrator.start();
  }, []);
  
  const stop = useCallback(() => {
    poiOrchestrator.stop();
  }, []);
  
  const pause = useCallback(() => {
    poiOrchestrator.pause();
  }, []);
  
  const resume = useCallback(() => {
    poiOrchestrator.resume();
  }, []);
  
  const discover = useCallback(async () => {
    return poiOrchestrator.discoverPOIs();
  }, []);
  
  const forceDiscover = useCallback(async () => {
    return poiOrchestrator.forceDiscover();
  }, []);
  
  // Memoize context value
  const contextValue = useMemo<POIOrchestratorContextValue>(() => ({
    state: poiOrchestrator.getState(),
    isRunning: poiOrchestrator.isRunning(),
    isInitialized: poiOrchestrator.isReady(),
    pois: poiOrchestrator.getPOIs(),
    discoveredPOIs: poiOrchestrator.getDiscoveredPOIs(),
    activePOIs: poiOrchestrator.getActivePOIs(),
    visitedPOIs: poiOrchestrator.getVisitedPOIs(),
    stats: poiOrchestrator.getStats(),
    sessionStats: poiOrchestrator.getSessionStats(),
    start,
    stop,
    pause,
    resume,
    discover,
    forceDiscover,
    currentLocation: location,
    hasLocationPermission: permissionStatus === 'granted' || permissionStatus === 'limited',
  }), [
    location,
    permissionStatus,
    start,
    stop,
    pause,
    resume,
    discover,
    forceDiscover,
  ]);
  
  return (
    <POIOrchestratorContext.Provider value={contextValue}>
      {children}
    </POIOrchestratorContext.Provider>
  );
}

/**
 * Hook to access POI Orchestrator context
 */
export function usePOIOrchestrator(): POIOrchestratorContextValue {
  const context = useContext(POIOrchestratorContext);
  if (!context) {
    console.warn('usePOIOrchestrator must be used within a POIOrchestratorProvider');
    return defaultContextValue;
  }
  return context;
}

/**
 * Hook to check if orchestrator is running
 */
export function useIsOrchestratorRunning(): boolean {
  const context = usePOIOrchestrator();
  return context.isRunning;
}

/**
 * Hook to get orchestrator state
 */
export function useOrchestratorState(): OrchestratorState {
  const context = usePOIOrchestrator();
  return context.state;
}

/**
 * Hook to get orchestrator statistics
 */
export function useOrchestratorStats() {
  const context = usePOIOrchestrator();
  return context.stats;
}

/**
 * Hook to get session statistics
 */
export function useSessionStats() {
  const context = usePOIOrchestrator();
  return context.sessionStats;
}

/**
 * Hook to trigger discovery
 */
export function useDiscovery() {
  const context = usePOIOrchestrator();
  return {
    discover: context.discover,
    forceDiscover: context.forceDiscover,
    pois: context.pois,
    discoveredPOIs: context.discoveredPOIs,
    activePOIs: context.activePOIs,
    visitedPOIs: context.visitedPOIs,
  };
}

export default usePOIOrchestrator;

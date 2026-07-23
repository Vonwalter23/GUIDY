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
import { syncPOIStoreWithStateMachine, usePOIStore } from './usePOIStore';

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
  
  // POI Store for syncing
  const storePOIs = usePOIStore((state) => state.pois);
  
  // Initialize orchestrator
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    const init = async () => {
      await poiOrchestrator.initialize();
      isInitializedRef.current = true;
      
      // Sync store with state machine
      syncPOIStoreWithStateMachine();
      
      // Auto-start if enabled
      if (autoStartRef.current) {
        poiOrchestrator.start();
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
      poiOrchestrator.updateLocation(location.latitude, location.longitude);
      
      // Auto-discover if enabled
      if (autoDiscovery && poiOrchestrator.isRunning()) {
        poiOrchestrator.discoverPOIs();
      }
    }
  }, [location, autoDiscovery]);
  
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

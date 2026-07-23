/**
 * GUIDY - POI Provider
 * React Context and hooks for POI functionality
 * 
 * STAGE 4.0: POI Engine Architecture
 * 
 * This provider integrates:
 * - POI Engine
 * - POI State Machine
 * - POI Store
 * - Location Engine (consumed, not modified)
 */

import React, { createContext, useContext, useEffect, useCallback, useMemo, useRef } from 'react';
import type { POI, POISearchOptions, POIFilterCriteria, POIError, POIEngineConfig } from './POITypes';
import { POIState } from './POITypes';
import { poiEngine } from './POIEngine';
import { syncPOIStoreWithStateMachine, usePOIStore } from './usePOIStore';
import { useLocation } from '../location';

// Context types
interface POIContextValue {
  // POI data
  pois: POI[];
  selectedPOI: POI | null;
  
  // State
  state: POIState;
  error: POIError | null;
  isLoading: boolean;
  isFiltering: boolean;
  
  // Search
  searchPOIs: (radius?: number, options?: Partial<POISearchOptions>) => Promise<POI[]>;
  searchAtLocation: (lat: number, lng: number, radius?: number) => Promise<POI[]>;
  
  // Filter
  filterPOIs: (criteria: POIFilterCriteria) => POI[];
  
  // Selection
  selectPOI: (poi: POI) => void;
  deselectPOI: () => void;
  
  // Actions
  markVisited: (poiId: string) => void;
  loadMore: () => Promise<POI[]>;
  retry: () => Promise<POI[]>;
  reset: () => void;
  clearCache: () => void;
  
  // Location
  currentLocation: { latitude: number; longitude: number } | null;
  hasLocationPermission: boolean;
}

const POIContext = createContext<POIContextValue | null>(null);

const defaultContextValue: POIContextValue = {
  pois: [],
  selectedPOI: null,
  state: POIState.IDLE,
  error: null,
  isLoading: false,
  isFiltering: false,
  searchPOIs: async () => [],
  searchAtLocation: async () => [],
  filterPOIs: () => [],
  selectPOI: () => {},
  deselectPOI: () => {},
  markVisited: () => {},
  loadMore: async () => [],
  retry: async () => [],
  reset: () => {},
  clearCache: () => {},
  currentLocation: null,
  hasLocationPermission: false,
};

/**
 * POI Provider Props
 */
interface POIProviderProps {
  children: React.ReactNode;
  config?: Partial<POIEngineConfig>;
  autoSearch?: boolean;
  autoSearchRadius?: number;
}

/**
 * POI Provider Component
 */
export function POIProvider({
  children,
  config,
  autoSearch = false,
  autoSearchRadius = 1000,
}: POIProviderProps): React.JSX.Element {
  const isInitializedRef = useRef(false);
  const autoSearchRef = useRef(autoSearch);
  autoSearchRef.current = autoSearch;
  
  // Sync with location engine
  const {
    currentLocation: location,
    permissionStatus,
  } = useLocation();
  
  // Sync with POI store
  const {
    pois,
    selectedPOI,
    state,
    error,
  } = usePOIStore();
  
  // Initialize POI Engine
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    const init = async () => {
      await poiEngine.initialize(config);
      isInitializedRef.current = true;
    };
    
    init();
    
    // Sync store with state machine
    const unsubscribe = syncPOIStoreWithStateMachine();
    
    return () => {
      unsubscribe();
    };
  }, [config]);
  
  // Update POI Engine location when location changes
  useEffect(() => {
    if (location) {
      poiEngine.updateLocation(location.latitude, location.longitude);
      
      // Auto-search when location is available and enabled
      if (autoSearchRef.current && permissionStatus === 'granted') {
        poiEngine.searchPOIs(autoSearchRadius);
      }
    }
  }, [location, permissionStatus, autoSearchRadius]);
  
  // Search POIs
  const searchPOIs = useCallback(async (
    radius?: number,
    options?: Partial<POISearchOptions>
  ): Promise<POI[]> => {
    return poiEngine.searchPOIs(radius, options);
  }, []);
  
  // Search at specific location
  const searchAtLocation = useCallback(async (
    lat: number,
    lng: number,
    radius?: number
  ): Promise<POI[]> => {
    return poiEngine.searchPOIsAtLocation(lat, lng, radius ?? 1000);
  }, []);
  
  // Filter POIs
  const filterPOIs = useCallback((criteria: POIFilterCriteria): POI[] => {
    return poiEngine.filterPOIs(criteria);
  }, []);
  
  // Select POI
  const selectPOI = useCallback((poi: POI): void => {
    poiEngine.selectPOI(poi);
  }, []);
  
  // Deselect POI
  const deselectPOI = useCallback((): void => {
    poiEngine.deselectPOI();
  }, []);
  
  // Mark visited
  const markVisited = useCallback((poiId: string): void => {
    poiEngine.markPOIVisited(poiId);
  }, []);
  
  // Load more
  const loadMore = useCallback(async (): Promise<POI[]> => {
    return poiEngine.loadMorePOIs();
  }, []);
  
  // Retry
  const retry = useCallback(async (): Promise<POI[]> => {
    return poiEngine.retry();
  }, []);
  
  // Reset
  const reset = useCallback((): void => {
    poiEngine.reset();
  }, []);
  
  // Clear cache
  const clearCache = useCallback((): void => {
    poiEngine.clearCache();
  }, []);
  
  // Compute loading state
  const isLoading = state === POIState.SEARCHING || state === POIState.LOADING;
  const isFiltering = state === POIState.FILTERING;
  
  // Memoize context value
  const contextValue = useMemo<POIContextValue>(() => ({
    pois,
    selectedPOI,
    state,
    error,
    isLoading,
    isFiltering,
    searchPOIs,
    searchAtLocation,
    filterPOIs,
    selectPOI,
    deselectPOI,
    markVisited,
    loadMore,
    retry,
    reset,
    clearCache,
    currentLocation: location,
    hasLocationPermission: permissionStatus === 'granted' || permissionStatus === 'limited',
  }), [
    pois,
    selectedPOI,
    state,
    error,
    isLoading,
    isFiltering,
    location,
    permissionStatus,
    searchPOIs,
    searchAtLocation,
    filterPOIs,
    selectPOI,
    deselectPOI,
    markVisited,
    loadMore,
    retry,
    reset,
    clearCache,
  ]);
  
  return (
    <POIContext.Provider value={contextValue}>
      {children}
    </POIContext.Provider>
  );
}

/**
 * Hook to access POI context
 */
export function usePOI(): POIContextValue {
  const context = useContext(POIContext);
  if (!context) {
    console.warn('usePOI must be used within a POIProvider');
    return defaultContextValue;
  }
  return context;
}

/**
 * Hook to get all POIs
 */
export function usePOIs(): POI[] {
  const { pois } = usePOI();
  return pois;
}

/**
 * Hook to get selected POI
 */
export function useSelectedPOI(): POI | null {
  const { selectedPOI } = usePOI();
  return selectedPOI;
}

/**
 * Hook to get POI state
 */
export function usePOIState(): POIState {
  const { state } = usePOI();
  return state;
}

/**
 * Hook to check if POIs are loading
 */
export function useIsPOILoading(): boolean {
  const { isLoading } = usePOI();
  return isLoading;
}

/**
 * Hook to get POI error
 */
export function usePOIError(): POIError | null {
  const { error } = usePOI();
  return error;
}

/**
 * Hook to search POIs
 */
export function usePOISearch() {
  const { searchPOIs, searchAtLocation } = usePOI();
  return { searchPOIs, searchAtLocation };
}

/**
 * Hook to get nearby POIs
 */
export function useNearbyPOIs(maxDistance?: number) {
  const pois = usePOIs();
  
  if (maxDistance === undefined) {
    return pois;
  }
  
  return pois.filter(p => (p.distance ?? Infinity) <= maxDistance);
}

/**
 * Hook to get POIs by category
 */
export function usePOIsByCategory(category: string) {
  const pois = usePOIs();
  return pois.filter(p => p.category === category);
}

export default usePOI;

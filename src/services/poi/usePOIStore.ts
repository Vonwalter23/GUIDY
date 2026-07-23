/**
 * GUIDY - POI Store
 * Zustand store synchronized with POIStateMachine
 * 
 * STAGE 4.0: POI Engine Architecture
 * 
 * This store provides UI-friendly access to POI state.
 * Most state is derived from the POIStateMachine.
 */

import { create } from 'zustand';
import type { POI, POIError, POIFilterCriteria } from './POITypes';
import { POIState } from './POITypes';
import { poiStateMachine } from './POIStateMachine';

/**
 * POI Store State
 */
interface POIStoreState {
  // Derived from state machine
  state: POIState;
  
  // POI data
  pois: POI[];
  selectedPOI: POI | null;
  
  // Search parameters
  searchCenter: { lat: number; lng: number } | null;
  searchRadius: number;
  currentFilter: POIFilterCriteria | null;
  
  // Status
  error: POIError | null;
  loadingMore: boolean;
  
  // Statistics
  totalCount: number;
  visitedCount: number;
  narratedCount: number;
}

/**
 * POI Store Actions
 */
interface POIStoreActions {
  // State sync
  setState: (state: POIState) => void;
  
  // POI actions
  setPOIs: (pois: POI[]) => void;
  setSelectedPOI: (poi: POI | null) => void;
  
  // Search actions
  setSearchCenter: (center: { lat: number; lng: number } | null) => void;
  setSearchRadius: (radius: number) => void;
  setFilter: (filter: POIFilterCriteria | null) => void;
  
  // Status actions
  setError: (error: POIError | null) => void;
  setLoadingMore: (loading: boolean) => void;
  
  // Statistics
  updateStats: () => void;
  
  // Reset
  reset: () => void;
}

type POIStore = POIStoreState & POIStoreActions;

/**
 * Initial state
 */
const initialState: POIStoreState = {
  state: POIState.IDLE,
  pois: [],
  selectedPOI: null,
  searchCenter: null,
  searchRadius: 0,
  currentFilter: null,
  error: null,
  loadingMore: false,
  totalCount: 0,
  visitedCount: 0,
  narratedCount: 0,
};

/**
 * POI Store
 */
export const usePOIStore = create<POIStore>((set, get) => ({
  // Initial State
  ...initialState,

  // State sync
  setState: (state: POIState) => {
    set({ state });
  },

  // POI actions
  setPOIs: (pois: POI[]) => {
    set({ pois });
    get().updateStats();
  },

  setSelectedPOI: (poi: POI | null) => {
    set({ selectedPOI: poi });
  },

  // Search actions
  setSearchCenter: (center: { lat: number; lng: number } | null) => {
    set({ searchCenter: center });
  },

  setSearchRadius: (radius: number) => {
    set({ searchRadius: radius });
  },

  setFilter: (filter: POIFilterCriteria | null) => {
    set({ currentFilter: filter });
  },

  // Status actions
  setError: (error: POIError | null) => {
    set({ error });
  },

  setLoadingMore: (loading: boolean) => {
    set({ loadingMore: loading });
  },

  // Statistics
  updateStats: () => {
    const { pois } = get();
    set({
      totalCount: pois.length,
      visitedCount: pois.filter(p => p.visited).length,
      narratedCount: pois.filter(p => p.narrated).length,
    });
  },

  // Reset
  reset: () => {
    poiStateMachine.sendEvent({ type: 'RESET' } as any);
    set(initialState);
  },
}));

/**
 * Selector: Current state
 */
export const usePOIState = () => usePOIStore(state => state.state);

/**
 * Selector: All POIs
 */
export const usePOIs = () => usePOIStore(state => state.pois);

/**
 * Selector: Selected POI
 */
export const useSelectedPOI = () => usePOIStore(state => state.selectedPOI);

/**
 * Selector: Is loading
 */
export const useIsPOILoading = () => {
  const poiState = usePOIStore(storeState => storeState.state);
  return poiState === POIState.SEARCHING || poiState === POIState.LOADING;
};

/**
 * Selector: Is filtering
 */
export const useIsPOIFiltering = () => {
  const poiState = usePOIStore(storeState => storeState.state);
  return poiState === POIState.FILTERING;
};

/**
 * Selector: Has error
 */
export const usePOIError = () => usePOIStore(s => s.error);

/**
 * Selector: Is ready
 */
export const useIsPOIReady = () => {
  const poiState = usePOIStore(storeState => storeState.state);
  return poiState === POIState.READY;
};

/**
 * Selector: POI by ID
 */
export const usePOIById = (id: string) => {
  return usePOIStore(state => state.pois.find(p => p.id === id) ?? null);
};

/**
 * Selector: POI statistics
 */
export const usePOIStats = () => {
  return usePOIStore(state => ({
    total: state.totalCount,
    visited: state.visitedCount,
    narrated: state.narratedCount,
  }));
};

/**
 * Selector: Visited POIs
 */
export const useVisitedPOIs = () => {
  return usePOIStore(state => state.pois.filter(p => p.visited));
};

/**
 * Selector: POIs by category
 */
export const usePOIsByCategory = (category: string) => {
  return usePOIStore(state => state.pois.filter(p => p.category === category));
};

/**
 * Selector: Nearby POIs (within radius)
 */
export const useNearbyPOIs = (maxDistance: number) => {
  return usePOIStore(state => 
    state.pois.filter(p => (p.distance ?? Infinity) <= maxDistance)
  );
};

/**
 * Selector: POI count by category
 */
export const usePOICountByCategory = () => {
  const pois = usePOIStore(state => state.pois);
  return pois.reduce((acc, poi) => {
    acc[poi.category] = (acc[poi.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
};

/**
 * Sync POI store with state machine
 * Call this once in POIProvider to establish sync
 */
export function syncPOIStoreWithStateMachine(): () => void {
  const unsubscribers: (() => void)[] = [];
  
  // Sync state changes
  unsubscribers.push(
    poiStateMachine.onStateChange((state) => {
      usePOIStore.getState().setState(state);
    })
  );
  
  // Sync POI updates
  unsubscribers.push(
    poiStateMachine.onPOIUpdate((pois) => {
      usePOIStore.getState().setPOIs(pois);
    })
  );
  
  // Sync selected POI
  unsubscribers.push(
    poiStateMachine.onSelectedChange((poi) => {
      usePOIStore.getState().setSelectedPOI(poi);
    })
  );
  
  // Sync errors
  unsubscribers.push(
    poiStateMachine.onErrorChange((error) => {
      usePOIStore.getState().setError(error);
    })
  );
  
  // Return cleanup function
  return () => {
    unsubscribers.forEach(unsub => unsub());
  };
}

export default usePOIStore;

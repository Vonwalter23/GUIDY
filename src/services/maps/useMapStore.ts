/**
 * GUIDY - Map Store
 * Zustand store for global map state
 */

import {create} from 'zustand';
import type {MapRegion, MapState, MapActions} from './MapTypes';
import {DEFAULT_REGION} from './MapConstants';

/**
 * Initial map state
 */
const initialMapState: MapState = {
  region: DEFAULT_REGION,
  isReady: false,
  isLoading: false,
  error: null,
  mapType: 'standard',
};

/**
 * Map Store
 */
export const useMapStore = create<MapState & MapActions>((set) => ({
  // Initial State
  ...initialMapState,

  // Actions
  setRegion: (region: MapRegion) => set({region}),

  setIsReady: (ready: boolean) => set({isReady: ready}),

  setIsLoading: (loading: boolean) => set({isLoading: loading}),

  setError: (error: string | null) => set({error}),

  setMapType: (type: 'standard' | 'satellite' | 'hybrid') =>
    set({mapType: type}),

  centerOnUser: (coordinate: {latitude: number; longitude: number}) =>
    set({
      region: {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
    }),

  reset: () => set(initialMapState),
}));

/**
 * Selector for region
 */
export const useRegion = () => useMapStore(state => state.region);

/**
 * Selector for ready state
 */
export const useMapReady = () => useMapStore(state => state.isReady);

/**
 * Selector for map type
 */
export const useMapType = () => useMapStore(state => state.mapType);

/**
 * GUIDY - Global State Management (Zustand)
 */

import {create} from 'zustand';

// Types
export interface Location {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  timestamp: number;
}

export interface POI {
  id: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  category?: string;
  imageUrl?: string;
  distance?: number;
}

export interface AppSettings {
  language: string;
  voiceSpeed: number;
  autoPlay: boolean;
  maxPOIDistance: number; // meters
}

export interface AppState {
  // UI State
  isLoading: boolean;
  error: string | null;
  isDarkMode: boolean;

  // Location State
  currentLocation: Location | null;
  isTracking: boolean;
  locationError: string | null;

  // POI State
  nearbyPOIs: POI[];
  selectedPOI: POI | null;
  poiError: string | null;

  // Audio State
  isPlaying: boolean;
  currentTrackId: string | null;
  audioQueue: string[];
  audioError: string | null;

  // Settings
  settings: AppSettings;
}

export interface AppActions {
  // UI Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  toggleDarkMode: () => void;

  // Location Actions
  setCurrentLocation: (location: Location | null) => void;
  setIsTracking: (tracking: boolean) => void;
  setLocationError: (error: string | null) => void;

  // POI Actions
  setNearbyPOIs: (pois: POI[]) => void;
  setSelectedPOI: (poi: POI | null) => void;
  setPOIError: (error: string | null) => void;

  // Audio Actions
  setIsPlaying: (playing: boolean) => void;
  setCurrentTrack: (trackId: string | null) => void;
  addToQueue: (trackId: string) => void;
  clearQueue: () => void;
  setAudioError: (error: string | null) => void;

  // Settings Actions
  updateSettings: (settings: Partial<AppSettings>) => void;

  // Reset
  reset: () => void;
}

const initialState: AppState = {
  // UI State
  isLoading: false,
  error: null,
  isDarkMode: false,

  // Location State
  currentLocation: null,
  isTracking: false,
  locationError: null,

  // POI State
  nearbyPOIs: [],
  selectedPOI: null,
  poiError: null,

  // Audio State
  isPlaying: false,
  currentTrackId: null,
  audioQueue: [],
  audioError: null,

  // Settings
  settings: {
    language: 'es',
    voiceSpeed: 1.0,
    autoPlay: true,
    maxPOIDistance: 500, // 500 meters
  },
};

/**
 * Global Application Store
 */
export const useAppStore = create<AppState & AppActions>((set, _get) => ({
  // Initial State
  ...initialState,

  // UI Actions
  setLoading: loading => set({isLoading: loading}),
  setError: error => set({error}),
  toggleDarkMode: () => set(state => ({isDarkMode: !state.isDarkMode})),

  // Location Actions
  setCurrentLocation: location => set({currentLocation: location, locationError: null}),
  setIsTracking: tracking => set({isTracking: tracking}),
  setLocationError: error => set({locationError: error, isTracking: false}),

  // POI Actions
  setNearbyPOIs: pois => set({nearbyPOIs: pois}),
  setSelectedPOI: poi => set({selectedPOI: poi}),
  setPOIError: error => set({poiError: error}),

  // Audio Actions
  setIsPlaying: playing => set({isPlaying: playing}),
  setCurrentTrack: trackId => set({currentTrackId: trackId}),
  addToQueue: trackId => set(state => ({audioQueue: [...state.audioQueue, trackId]})),
  clearQueue: () => set({audioQueue: [], currentTrackId: null}),
  setAudioError: error => set({audioError: error, isPlaying: false}),

  // Settings Actions
  updateSettings: newSettings =>
    set(state => ({settings: {...state.settings, ...newSettings}})),

  // Reset
  reset: () => set(initialState),
}));

export default useAppStore;

/**
 * GUIDY - POI Constants
 * Configuration constants for POI Engine
 * 
 * STAGE 4.0: POI Engine Architecture
 */

import { POIErrorCode } from './POITypes';

/**
 * Default POI Engine configuration
 */
export const DEFAULT_POI_ENGINE_CONFIG = {
  // Sources
  defaultSource: 'openstreetmap' as const,
  fallbackSources: ['overpass', 'local_cache'] as const,
  
  // Cache
  cacheEnabled: true,
  cacheTTL: 30 * 60 * 1000, // 30 minutes
  maxCacheSize: 1000,
  
  // Search
  defaultRadius: 1000, // 1km
  maxRadius: 50000, // 50km
  defaultLimit: 50,
  maxLimit: 500,
  
  // Performance
  debounceMs: 300,
  prefetchDistance: 100, // meters
  
  // Audio
  audioEnabled: false,
  audioCacheEnabled: true,
} as const;

/**
 * Cache TTL values in milliseconds
 */
export const CACHE_TTL = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 2 * 60 * 60 * 1000, // 2 hours
  DAY: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Distance thresholds in meters
 */
export const DISTANCE_THRESHOLDS = {
  VERY_CLOSE: 100,
  CLOSE: 500,
  MEDIUM: 1000,
  FAR: 5000,
  VERY_FAR: 10000,
};

/**
 * Category to icon mapping
 */
export const CATEGORY_ICONS: Record<string, string> = {
  accommodation: 'bed',
  food: 'food',
  attraction: 'star',
  transport: 'bus',
  shopping: 'shopping',
  entertainment: 'party-popper',
  nature: 'tree',
  culture: 'bank',
  services: 'wrench',
  other: 'map-marker',
};

/**
 * Subcategory to icon mapping
 */
export const SUBCATEGORY_ICONS: Record<string, string> = {
  hotel: 'bed',
  hostel: 'bed-outline',
  restaurant: 'food',
  cafe: 'coffee',
  bar: 'glass-wine',
  museum: 'bank',
  church: 'church',
  monument: 'pillar',
  park: 'tree',
  beach: 'beach',
  mountain: 'image-filter-hdr',
  view: 'image',
  bus_station: 'bus',
  train_station: 'train',
  airport: 'airplane',
  parking: 'parking',
  atm: 'cash',
  pharmacy: 'medical-bag',
  hospital: 'hospital',
  information: 'information',
  shopping: 'shopping',
  supermarket: 'cart',
  cinema: 'movie',
  theater: 'drama-masks',
};

/**
 * Category colors
 */
export const CATEGORY_COLORS: Record<string, string> = {
  accommodation: '#8B4513',
  food: '#FF6B35',
  attraction: '#FFD700',
  transport: '#4169E1',
  shopping: '#FF1493',
  entertainment: '#9932CC',
  nature: '#228B22',
  culture: '#8B0000',
  services: '#808080',
  other: '#A9A9A9',
};

/**
 * Search radius presets in meters
 */
export const RADIUS_PRESETS = [
  { label: '500m', value: 500 },
  { label: '1km', value: 1000 },
  { label: '2km', value: 2000 },
  { label: '5km', value: 5000 },
  { label: '10km', value: 10000 },
];

/**
 * POI importance levels
 */
export const IMPORTANCE_LEVELS = {
  MAXIMUM: 1.0,
  HIGH: 0.8,
  MEDIUM: 0.5,
  LOW: 0.3,
  MINIMUM: 0.1,
};

/**
 * Narration text templates
 */
export const NARRATION_TEMPLATES = {
  ARRIVING: 'You are arriving at {name}.',
  NEARBY: 'There is a {name} nearby, about {distance} away.',
  VISITING: 'Now visiting {name}.',
  DEPARTING: 'Leaving {name}.',
  INFO: '{name} is a {subcategory} located {distance} away.',
};

/**
 * POI API Endpoints (for future implementation)
 */
export const POI_ENDPOINTS = {
  OPENSTREETMAP: 'https://nominatim.openstreetmap.org',
  OVERPASS: 'https://overpass-api.de/api/interpreter',
  GOOGLE_PLACES: 'https://maps.googleapis.com/maps/api/place',
  MAPBOX: 'https://api.mapbox.com',
  GEONAMES: 'http://api.geonames.org',
  FOURSQUARE: 'https://api.foursquare.com/v2',
};

/**
 * Error messages
 */
export const POI_ERROR_MESSAGES = {
  [POIErrorCode.UNKNOWN]: 'An unknown error occurred',
  [POIErrorCode.NETWORK_ERROR]: 'Network error. Please check your connection.',
  [POIErrorCode.SOURCE_UNAVAILABLE]: 'Data source is currently unavailable.',
  [POIErrorCode.NO_RESULTS]: 'No points of interest found in this area.',
  [POIErrorCode.INVALID_LOCATION]: 'Invalid location provided.',
  [POIErrorCode.RATE_LIMITED]: 'Too many requests. Please wait.',
  [POIErrorCode.CACHE_ERROR]: 'Cache error occurred.',
  [POIErrorCode.PERMISSION_DENIED]: 'Location permission required.',
};

/**
 * POI Source priorities (lower = higher priority)
 */
export const SOURCE_PRIORITIES: Record<string, number> = {
  local_cache: 0,
  openstreetmap: 1,
  overpass: 2,
  google_places: 3,
  mapbox: 4,
  geonames: 5,
  foursquare: 6,
};

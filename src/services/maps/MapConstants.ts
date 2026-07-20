/**
 * GUIDY - Map Constants
 * Configuration constants for OpenStreetMap integration
 */

/**
 * OpenStreetMap Tile Server URLs
 */
export const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

/**
 * Alternative OSM tile servers (for redundancy)
 */
export const OSM_TILE_SERVERS = [
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
  'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
];

/**
 * Attribution text for OpenStreetMap
 */
export const OSM_ATTRIBUTION = '© OpenStreetMap contributors';

/**
 * Map zoom levels
 */
export const ZOOM_LEVELS = {
  MIN: 3,
  MAX: 18,
  DEFAULT: 15,
  STREET: 16,
  BUILDING: 17,
  CITY: 12,
  COUNTRY: 6,
  WORLD: 3,
} as const;

/**
 * Region delta values for different zoom levels
 */
export const REGION_DELTAS = {
  VERY_CLOSE: 0.001, // ~100m
  CLOSE: 0.005, // ~500m
  MEDIUM: 0.01, // ~1km
  FAR: 0.05, // ~5km
  VERY_FAR: 0.1, // ~10km
} as const;

/**
 * Default map region (Trelew, Argentina as default)
 */
export const DEFAULT_REGION = {
  latitude: -43.3001,
  longitude: -65.1028,
  latitudeDelta: REGION_DELTAS.MEDIUM,
  longitudeDelta: REGION_DELTAS.MEDIUM,
} as const;

/**
 * Trelew city center
 */
export const TRELEW_CENTER = {
  latitude: -43.3001,
  longitude: -65.1028,
} as const;

/**
 * Animation durations (ms)
 */
export const ANIMATION_DURATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
} as const;

/**
 * Marker colors
 */
export const MARKER_COLORS = {
  USER: '#2196F3', // Blue
  POI: '#FF5722', // Orange
  DESTINATION: '#4CAF50', // Green
  WARNING: '#FFC107', // Yellow
  ERROR: '#F44336', // Red
} as const;

/**
 * Map type options
 */
export const MAP_TYPES = {
  STANDARD: 'standard',
  SATELLITE: 'satellite',
  HYBRID: 'hybrid',
} as const;

/**
 * Supported map providers
 */
export const MAP_PROVIDERS = {
  OPENSTREETMAP: 'openstreetmap',
  GOOGLE: 'google',
  CUSTOM: 'custom',
} as const;

/**
 * Cache configuration
 */
export const TILE_CACHE = {
  MAX_SIZE: 50 * 1024 * 1024, // 50MB
  TTL: 24 * 60 * 60 * 1000, // 24 hours
} as const;

/**
 * Accuracy thresholds for displaying accuracy circle
 */
export const ACCURACY_THRESHOLDS = {
  HIGH: 10, // meters
  MEDIUM: 30, // meters
  LOW: 100, // meters
} as const;

/**
 * Default map style configuration
 */
export const DEFAULT_MAP_STYLE = {
  mapType: MAP_TYPES.STANDARD,
  showsUserLocation: true,
  showsMyLocationButton: false,
  showsCompass: true,
  showsScale: true,
  showsZoomControls: false,
} as const;

/**
 * User location marker default config
 */
export const DEFAULT_USER_LOCATION_CONFIG = {
  showsHeadingIndicator: true,
  fillColor: MARKER_COLORS.USER,
  strokeColor: '#FFFFFF',
  strokeWidth: 2,
} as const;

/**
 * Coordinate bounds for Argentina
 */
export const ARGENTINA_BOUNDS = {
  north: -21.0,
  south: -55.0,
  east: -53.0,
  west: -73.0,
} as const;

/**
 * Coordinate bounds for Patagonia
 */
export const PATAGONIA_BOUNDS = {
  north: -39.0,
  south: -55.0,
  east: -62.0,
  west: -73.0,
} as const;

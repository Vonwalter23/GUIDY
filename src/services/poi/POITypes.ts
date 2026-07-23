/**
 * GUIDY - POI Types
 * Type definitions for Point of Interest system
 * 
 * STAGE 4.0: POI Engine Architecture
 * 
 * This model is prepared for future AI features:
 * - Audio generation (TTS)
 * - Popularity scoring
 * - Importance ranking
 * - User interest matching
 */

/**
 * POI Categories - Top level categories
 */
export enum POICategory {
  ACCOMMODATION = 'accommodation',
  FOOD = 'food',
  ATTRACTION = 'attraction',
  TRANSPORT = 'transport',
  SHOPPING = 'shopping',
  ENTERTAINMENT = 'entertainment',
  NATURE = 'nature',
  CULTURE = 'culture',
  SERVICES = 'services',
  OTHER = 'other',
}

/**
 * POI Subcategories - Detailed types
 */
export enum POISubcategory {
  // Accommodation
  HOTEL = 'hotel',
  HOSTEL = 'hostel',
  APARTMENT = 'apartment',
  CAMPING = 'camping',
  
  // Food
  RESTAURANT = 'restaurant',
  CAFE = 'cafe',
  BAR = 'bar',
  FAST_FOOD = 'fast_food',
  MARKET = 'market',
  
  // Attraction
  MUSEUM = 'museum',
  MONUMENT = 'monument',
  LANDMARK = 'landmark',
  VIEWPOINT = 'viewpoint',
  BEACH = 'beach',
  PARK = 'park',
  
  // Transport
  BUS_STATION = 'bus_station',
  TRAIN_STATION = 'train_station',
  AIRPORT = 'airport',
  PARKING = 'parking',
  GAS_STATION = 'gas_station',
  
  // Shopping
  SUPERMARKET = 'supermarket',
  SHOP = 'shop',
  MALL = 'mall',
  
  // Entertainment
  CINEMA = 'cinema',
  THEATER = 'theater',
  NIGHTCLUB = 'nightclub',
  
  // Nature
  MOUNTAIN = 'mountain',
  LAKE = 'lake',
  FOREST = 'forest',
  WATERFALL = 'waterfall',
  
  // Culture
  CHURCH = 'church',
  TEMPLE = 'temple',
  CASTLE = 'castle',
  HISTORICAL = 'historical',
  
  // Services
  ATM = 'atm',
  BANK = 'bank',
  HOSPITAL = 'hospital',
  POLICE = 'police',
  PHARMACY = 'pharmacy',
  
  // Other
  UNKNOWN = 'unknown',
  INFORMATION = 'information',
}

/**
 * Data source types for POIs
 * Allows switching between providers without changing UI
 */
export type POISource = 
  | 'openstreetmap' 
  | 'google_places' 
  | 'mapbox' 
  | 'geonames' 
  | 'foursquare' 
  | 'overpass' 
  | 'local_cache';

export const POISources = {
  OPENSTREETMAP: 'openstreetmap' as const,
  GOOGLE_PLACES: 'google_places' as const,
  MAPBOX: 'mapbox' as const,
  GEONAMES: 'geonames' as const,
  FOURSQUARE: 'foursquare' as const,
  OVERPASS: 'overpass' as const,
  LOCAL_CACHE: 'local_cache' as const,
};

/**
 * POI data model
 * Comprehensive model prepared for AI features
 */
export interface POI {
  // Core identifiers
  id: string;
  source: POISource;
  externalId?: string; // ID from external provider
  
  // Naming
  name: string;
  displayName: string;
  localName?: string;
  
  // Classification
  category: POICategory;
  subcategory: POISubcategory;
  
  // Location
  latitude: number;
  longitude: number;
  
  // Spatial calculations
  distance?: number; // Distance from user in meters
  bearing?: number; // Bearing from user in degrees
  
  // Ranking
  importance?: number; // OSM importance (0-1)
  popularity?: number; // Calculated popularity score (0-1)
  
  // Content
  description?: string;
  language?: string;
  
  // Metadata
  lastUpdated: number; // Unix timestamp
  version?: number;
  
  // User state
  visited: boolean;
  visitedAt?: number; // Unix timestamp
  narrated: boolean;
  narrationText?: string;
  
  // Audio
  audioGenerated: boolean;
  audioUrl?: string;
  audioDuration?: number; // Duration in seconds
  
  // Visual
  icon?: string; // Icon identifier
  imageUrl?: string;
  
  // AI prepared
  metadata: Record<string, unknown>;
  
  // Address
  address?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  
  // Contact
  phone?: string;
  website?: string;
  email?: string;
  
  // Hours
  openingHours?: string[];
  openingHoursText?: string;
  
  // Rating
  rating?: number; // 0-5
  ratingCount?: number;
  
  // Price
  priceLevel?: number; // 0-4 (free to expensive)
  
  // Accessibility
  wheelchairAccessible?: boolean;
  
  // Service
  toilets?: boolean;
  wifi?: boolean;
}

/**
 * POI Search Options
 */
export interface POISearchOptions {
  // Location
  latitude: number;
  longitude: number;
  radius: number; // in meters
  
  // Filters
  categories?: POICategory[];
  subcategories?: POISubcategory[];
  maxDistance?: number;
  minRating?: number;
  
  // Content
  language?: string;
  
  // Limits
  limit?: number;
  offset?: number;
  
  // Sorting
  sortBy?: POISortOption;
  sortOrder?: 'asc' | 'desc';
  
  // Caching
  useCache?: boolean;
  forceRefresh?: boolean;
}

/**
 * Sort options for POI search
 */
export enum POISortOption {
  DISTANCE = 'distance',
  IMPORTANCE = 'importance',
  POPULARITY = 'popularity',
  NAME = 'name',
  RATING = 'rating',
  RECENCY = 'recency',
}

/**
 * POI Filter criteria
 */
export interface POIFilterCriteria {
  categories?: POICategory[];
  subcategories?: POISubcategory[];
  maxDistance?: number;
  minRating?: number;
  priceLevel?: number;
  wheelchairAccessible?: boolean;
  language?: string;
  hasVisited?: boolean;
  hasNarration?: boolean;
  searchText?: string;
}

/**
 * POI State Machine States
 */
export enum POIState {
  IDLE = 'IDLE',
  SEARCHING = 'SEARCHING',
  LOADING = 'LOADING',
  READY = 'READY',
  FILTERING = 'FILTERING',
  SELECTED = 'SELECTED',
  NARRATING = 'NARRATING',
  VISITED = 'VISITED',
  CACHED = 'CACHED',
  ERROR = 'ERROR',
}

/**
 * POI State Machine Events
 */
export enum POIEvent {
  SEARCH = 'SEARCH',
  LOAD_MORE = 'LOAD_MORE',
  FILTER = 'FILTER',
  SELECT = 'SELECT',
  DESELECT = 'DESELECT',
  START_NARRATION = 'START_NARRATION',
  END_NARRATION = 'END_NARRATION',
  MARK_VISITED = 'MARK_VISITED',
  CACHE = 'CACHE',
  CLEAR_CACHE = 'CLEAR_CACHE',
  ERROR = 'ERROR',
  RETRY = 'RETRY',
  RESET = 'RESET',
}

/**
 * Cache entry for POIs
 */
export interface POICacheEntry {
  pois: POI[];
  timestamp: number;
  ttl: number;
  version: number;
  source: POISource;
  centerLat: number;
  centerLng: number;
  radius: number;
}

/**
 * POI Engine configuration
 */
export interface POIEngineConfig {
  // Sources
  defaultSource: POISource;
  fallbackSources: readonly POISource[];
  
  // Cache
  cacheEnabled: boolean;
  cacheTTL: number; // milliseconds
  maxCacheSize: number; // entries
  
  // Search
  defaultRadius: number;
  maxRadius: number;
  defaultLimit: number;
  maxLimit: number;
  
  // Performance
  debounceMs: number;
  prefetchDistance: number; // meters
  
  // Audio
  audioEnabled: boolean;
  audioCacheEnabled: boolean;
}

/**
 * POI Narrator configuration
 */
export interface POINarratorConfig {
  enabled: boolean;
  language: string;
  voiceSpeed: number; // 0.5 - 2.0
  autoPlay: boolean;
}

/**
 * POI Statistics
 */
export interface POIStatistics {
  totalPOIs: number;
  cachedPOIs: number;
  visitedPOIs: number;
  narratedPOIs: number;
  byCategory: Record<POICategory, number>;
  lastSearch: number;
  searchCount: number;
}

/**
 * POI Engine Error
 */
export interface POIError {
  code: POIErrorCode;
  message: string;
  source?: POISource;
  retryable: boolean;
}

/**
 * POI Error Codes
 */
export enum POIErrorCode {
  UNKNOWN = 'UNKNOWN',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SOURCE_UNAVAILABLE = 'SOURCE_UNAVAILABLE',
  NO_RESULTS = 'NO_RESULTS',
  INVALID_LOCATION = 'INVALID_LOCATION',
  RATE_LIMITED = 'RATE_LIMITED',
  CACHE_ERROR = 'CACHE_ERROR',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
}

export const POIErrorCodes = {
  UNKNOWN: 'UNKNOWN' as const,
  NETWORK_ERROR: 'NETWORK_ERROR' as const,
  SOURCE_UNAVAILABLE: 'SOURCE_UNAVAILABLE' as const,
  NO_RESULTS: 'NO_RESULTS' as const,
  INVALID_LOCATION: 'INVALID_LOCATION' as const,
  RATE_LIMITED: 'RATE_LIMITED' as const,
  CACHE_ERROR: 'CACHE_ERROR' as const,
  PERMISSION_DENIED: 'PERMISSION_DENIED' as const,
};

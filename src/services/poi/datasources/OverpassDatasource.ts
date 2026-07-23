/**
 * GUIDY - Overpass Datasource
 * OpenStreetMap Overpass API implementation
 * 
 * STAGE 4.1: POI Datasource Layer
 * 
 * This datasource provides POI data from OpenStreetMap via the Overpass API.
 * It is prepared for future queries but returns controlled results.
 */

import type { POI, POISearchOptions, POISource } from '../POITypes';
import { BasePOIDatasource } from '../POIDatasource';
import { BaseNetworkClient, NetworkConfig } from './BaseNetworkClient';

/**
 * Overpass API Configuration
 */
export interface OverpassConfig {
  baseUrl: string;
  timeout: number;
  maxResultSize: number;
  rateLimitDelay: number;
}

/**
 * Default Overpass configuration
 */
export const DEFAULT_OVERPASS_CONFIG: OverpassConfig = {
  baseUrl: 'https://overpass-api.de/api/interpreter',
  timeout: 30000,
  maxResultSize: 500,
  rateLimitDelay: 1000,
};

/**
 * Overpass API response types
 */
interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  version: number;
  generator: string;
  osm3s: {
    timestamp_osm_base: string;
    copyright: string;
  };
  elements: OverpassElement[];
}

/**
 * OSM tag to POI category mapping
 */
const OSM_TAG_MAPPING: Record<string, { category: string; subcategory: string }> = {
  // Food
  'amenity=restaurant': { category: 'food', subcategory: 'restaurant' },
  'amenity=cafe': { category: 'food', subcategory: 'cafe' },
  'amenity=bar': { category: 'food', subcategory: 'bar' },
  'amenity=fast_food': { category: 'food', subcategory: 'fast_food' },
  'shop=supermarket': { category: 'shopping', subcategory: 'supermarket' },
  'shop=bakery': { category: 'food', subcategory: 'restaurant' },
  
  // Attractions
  'tourism=museum': { category: 'attraction', subcategory: 'museum' },
  'tourism=attraction': { category: 'attraction', subcategory: 'landmark' },
  'tourism=viewpoint': { category: 'attraction', subcategory: 'viewpoint' },
  'tourism=artwork': { category: 'attraction', subcategory: 'landmark' },
  
  // Nature
  'natural=beach': { category: 'nature', subcategory: 'beach' },
  'natural=water': { category: 'nature', subcategory: 'lake' },
  'natural=wood': { category: 'nature', subcategory: 'forest' },
  'natural=peak': { category: 'nature', subcategory: 'mountain' },
  
  // Culture
  'amenity=place_of_worship': { category: 'culture', subcategory: 'church' },
  'historic=castle': { category: 'culture', subcategory: 'castle' },
  'historic=monument': { category: 'culture', subcategory: 'monument' },
  'historic=archaeological_site': { category: 'culture', subcategory: 'historical' },
  
  // Transport
  'amenity=parking': { category: 'transport', subcategory: 'parking' },
  'amenity=fuel': { category: 'transport', subcategory: 'gas_station' },
  'railway=station': { category: 'transport', subcategory: 'train_station' },
  'amenity=bus_station': { category: 'transport', subcategory: 'bus_station' },
  
  // Services
  'amenity=atm': { category: 'services', subcategory: 'atm' },
  'amenity=bank': { category: 'services', subcategory: 'bank' },
  'amenity=hospital': { category: 'services', subcategory: 'hospital' },
  'amenity=pharmacy': { category: 'services', subcategory: 'pharmacy' },
  'amenity=police': { category: 'services', subcategory: 'police' },
  'tourism=information': { category: 'other', subcategory: 'information' },
};

/**
 * Overpass Datasource
 * Provides POI data from OpenStreetMap
 */
export class OverpassDatasource extends BasePOIDatasource {
  readonly source: POISource = 'overpass';
  
  private networkClient: BaseNetworkClient;
  private overpassConfig: OverpassConfig;
  private lastRequestTime: number = 0;
  private pendingRequests: AbortController | null = null;

  constructor(config: Partial<OverpassConfig> = {}) {
    super();
    this.overpassConfig = { ...DEFAULT_OVERPASS_CONFIG, ...config };
    
    const networkConfig: NetworkConfig = {
      baseUrl: this.overpassConfig.baseUrl,
      timeout: this.overpassConfig.timeout,
      retries: 3,
      retryDelay: 1000,
      headers: {
        'User-Agent': 'GUIDY/1.0 (Android App; POI Engine)',
        'Accept': 'application/json',
      },
    };
    
    this.networkClient = new BaseNetworkClient(networkConfig);
  }

  /**
   * Initialize datasource
   */
  async initialize(config?: Record<string, unknown>): Promise<void> {
    await super.initialize(config);
    
    if (config?.baseUrl && typeof config.baseUrl === 'string') {
      this.overpassConfig.baseUrl = config.baseUrl;
      this.networkClient.updateConfig({ baseUrl: this.overpassConfig.baseUrl });
    }
    
    if (config?.timeout && typeof config.timeout === 'number') {
      this.overpassConfig.timeout = config.timeout;
    }
    
    console.log(`[OVERPASS] Initialized with URL: ${this.overpassConfig.baseUrl}`);
  }

  /**
   * Check if datasource is available
   */
  isAvailable(): boolean {
    return this.initialized && this.overpassConfig.baseUrl.length > 0;
  }

  /**
   * Check if source requires authentication
   */
  requiresAuth(): boolean {
    return false; // Overpass API is free and doesn't require auth
  }

  /**
   * Get authentication status
   */
  getAuthStatus(): { authenticated: boolean; message?: string } {
    return {
      authenticated: true,
      message: 'Overpass API does not require authentication',
    };
  }

  /**
   * Health check for Overpass API
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    try {
      const start = Date.now();
      await this.networkClient.get<OverpassResponse>(
        '',
        { data: '[out:json];node["amenity"="restaurant"](51.5,7.4,51.6,7.5);out count;' },
        { method: 'POST' } as RequestInit
      );
      return {
        healthy: true,
        latency: Date.now() - start,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cancel pending requests
   */
  cancelPendingRequests(): void {
    this.pendingRequests?.abort();
    this.pendingRequests = null;
    this.networkClient.cancelAllRequests();
  }

  /**
   * Search for POIs
   */
  async search(options: POISearchOptions): Promise<POI[]> {
    this.validateInitialized();
    
    const radius = options.radius || 1000;
    const limit = options.limit || this.overpassConfig.maxResultSize;
    
    // Build Overpass query
    const query = this.buildSearchQuery(options.latitude, options.longitude, radius, limit);
    
    try {
      const response = await this.executeQuery(query);
      return this.parseResponse(response, options.latitude, options.longitude);
    } catch (error) {
      console.error('[OVERPASS] Search error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get POI by ID
   */
  async getById(id: string): Promise<POI | null> {
    this.validateInitialized();
    
    const nodeId = parseInt(id.replace('node/', ''), 10);
    if (isNaN(nodeId)) {
      return null;
    }
    
    const query = `[out:json];node(${nodeId});out body;`;
    
    try {
      const response = await this.executeQuery(query);
      const pois = this.parseResponse(response, 0, 0);
      return pois[0] || null;
    } catch (error) {
      console.error('[OVERPASS] getById error:', error);
      return null;
    }
  }

  /**
   * Get POI details
   */
  async getDetails(id: string): Promise<POI | null> {
    return this.getById(id);
  }

  /**
   * Get nearby POIs
   */
  async getNearby(latitude: number, longitude: number, radius: number): Promise<POI[]> {
    return this.search({
      latitude,
      longitude,
      radius,
      limit: this.overpassConfig.maxResultSize,
    });
  }

  /**
   * Search by radius
   */
  async searchByRadius(
    latitude: number,
    longitude: number,
    radius: number,
    categories?: string[]
  ): Promise<POI[]> {
    return this.search({
      latitude,
      longitude,
      radius,
      categories: categories as any,
    });
  }

  /**
   * Search by bounding box
   */
  async searchByBoundingBox(
    south: number,
    west: number,
    north: number,
    east: number
  ): Promise<POI[]> {
    this.validateInitialized();
    
    const query = `[out:json];(node["amenity"](${south},${west},${north},${east}););out body;`;
    
    try {
      const response = await this.executeQuery(query);
      const centerLat = (south + north) / 2;
      const centerLng = (west + east) / 2;
      return this.parseResponse(response, centerLat, centerLng);
    } catch (error) {
      console.error('[OVERPASS] searchByBoundingBox error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Build Overpass query
   */
  private buildSearchQuery(
    latitude: number,
    longitude: number,
    radius: number,
    _limit: number
  ): string {
    // Default amenity types to search for
    const amenityTypes = [
      'restaurant', 'cafe', 'bar', 'fast_food',
      'bank', 'atm', 'pharmacy', 'hospital',
      'parking', 'fuel', 'place_of_worship',
    ];
    
    const tourismTypes = [
      'museum', 'attraction', 'viewpoint', 'information', 'hotel',
    ];
    
    const shopTypes = [
      'supermarket', 'bakery', 'clothes', 'shoes',
    ];
    
    const amenityFilter = amenityTypes.map(t => `"amenity=${t}"`).join(',');
    const tourismFilter = tourismTypes.map(t => `"tourism=${t}"`).join(',');
    const shopFilter = shopTypes.map(t => `"shop=${t}"`).join(',');
    
    return `[out:json][timeout:25];(
      node[${amenityFilter}](around:${radius},${latitude},${longitude});
      node[${tourismFilter}](around:${radius},${latitude},${longitude});
      node[${shopFilter}](around:${radius},${latitude},${longitude});
      way[${amenityFilter}](around:${radius},${latitude},${longitude});
      way[${tourismFilter}](around:${radius},${latitude},${longitude});
      way[${shopFilter}](around:${radius},${latitude},${longitude});
    );
    out body center;
    >;
    out skel qt;`;
  }

  /**
   * Execute Overpass query
   */
  private async executeQuery(query: string): Promise<OverpassResponse> {
    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.overpassConfig.rateLimitDelay) {
      const delayMs = this.overpassConfig.rateLimitDelay - timeSinceLastRequest;
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    }
    
    this.lastRequestTime = Date.now();
    this.pendingRequests = new AbortController();
    
    try {
      const response = await this.networkClient.post<OverpassResponse>(
        '',
        { data: query },
        { method: 'POST' } as RequestInit
      );
      
      return response.data;
    } finally {
      this.pendingRequests = null;
    }
  }

  /**
   * Parse Overpass response to POI array
   */
  private parseResponse(
    response: OverpassResponse,
    userLat: number,
    userLng: number
  ): POI[] {
    return response.elements
      .filter(element => element.type === 'node' || element.type === 'way')
      .map(element => this.elementToPOI(element, userLat, userLng))
      .filter((poi): poi is POI => poi !== null);
  }

  /**
   * Convert Overpass element to POI
   */
  private elementToPOI(
    element: OverpassElement,
    userLat: number,
    userLng: number
  ): POI | null {
    const tags = element.tags || {};
    
    // Get coordinates
    let lat: number, lng: number;
    
    if (element.type === 'node') {
      lat = element.lat!;
      lng = element.lon!;
    } else if (element.center) {
      lat = element.center.lat;
      lng = element.center.lon;
    } else {
      return null;
    }
    
    // Determine category and subcategory
    const categoryInfo = this.determineCategory(tags);
    
    // Calculate distance
    const distance = this.calculateDistance(userLat, userLng, lat, lng);
    
    // Generate name
    const name = tags.name || tags['name:en'] || tags['name:es'] || 
      `${categoryInfo.subcategory} #${element.id}`;
    
    return {
      id: `node/${element.id}`,
      source: this.source,
      name,
      displayName: name,
      category: categoryInfo.category as any,
      subcategory: categoryInfo.subcategory as any,
      latitude: lat,
      longitude: lng,
      distance,
      bearing: this.calculateBearing(userLat, userLng, lat, lng),
      importance: this.parseImportance(tags),
      description: tags.description || tags.wikipedia ? 
        `Wikipedia: ${tags.wikipedia}` : undefined,
      language: tags['name:lang'] || 'en',
      lastUpdated: Date.now(),
      visited: false,
      narrated: false,
      audioGenerated: false,
      icon: categoryInfo.subcategory,
      metadata: {
        osmId: element.id,
        osmType: element.type,
        osmTags: tags,
      },
      address: this.buildAddress(tags),
      city: tags['addr:city'] || tags.city,
      country: tags.country,
      countryCode: tags['addr:country'] || tags.iso3166_1_alpha2,
      phone: tags.phone || tags['contact:phone'],
      website: tags.website || tags.url,
      openingHoursText: tags.opening_hours,
      wheelchairAccessible: tags.wheelchair === 'yes',
      toilets: tags.toilets === 'yes',
      wifi: tags.wifi === 'yes',
    };
  }

  /**
   * Determine POI category from OSM tags
   */
  private determineCategory(tags: Record<string, string>): { category: string; subcategory: string } {
    // Check amenity tag
    if (tags.amenity) {
      const key = `amenity=${tags.amenity}`;
      if (OSM_TAG_MAPPING[key]) {
        return OSM_TAG_MAPPING[key];
      }
    }
    
    // Check tourism tag
    if (tags.tourism) {
      const key = `tourism=${tags.tourism}`;
      if (OSM_TAG_MAPPING[key]) {
        return OSM_TAG_MAPPING[key];
      }
      return { category: 'attraction', subcategory: 'landmark' };
    }
    
    // Check shop tag
    if (tags.shop) {
      const key = `shop=${tags.shop}`;
      if (OSM_TAG_MAPPING[key]) {
        return OSM_TAG_MAPPING[key];
      }
      return { category: 'shopping', subcategory: 'shop' };
    }
    
    // Check historic tag
    if (tags.historic) {
      const key = `historic=${tags.historic}`;
      if (OSM_TAG_MAPPING[key]) {
        return OSM_TAG_MAPPING[key];
      }
      return { category: 'culture', subcategory: 'historical' };
    }
    
    // Check natural tag
    if (tags.natural) {
      const key = `natural=${tags.natural}`;
      if (OSM_TAG_MAPPING[key]) {
        return OSM_TAG_MAPPING[key];
      }
      return { category: 'nature', subcategory: 'other' };
    }
    
    // Default
    return { category: 'other', subcategory: 'unknown' };
  }

  /**
   * Parse importance from OSM tags
   */
  private parseImportance(tags: Record<string, string>): number {
    // OSM doesn't have direct importance, so we derive it
    if (tags.wikipedia) return 0.8;
    if (tags.amenity === 'hospital' || tags.amenity === 'police') return 0.9;
    if (tags.tourism === 'museum' || tags.tourism === 'hotel') return 0.7;
    if (tags.amenity) return 0.5;
    return 0.3;
  }

  /**
   * Build address from tags
   */
  private buildAddress(tags: Record<string, string>): string {
    const parts: string[] = [];
    
    if (tags['addr:housenumber']) {
      parts.push(tags['addr:housenumber']);
    }
    if (tags['addr:street']) {
      parts.push(tags['addr:street']);
    }
    
    return parts.join(' ');
  }

  /**
   * Calculate distance between two points (Haversine)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Calculate bearing between two points
   */
  private calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLng = this.toRad(lng2 - lng1);
    const y = Math.sin(dLng) * Math.cos(this.toRad(lat2));
    const x =
      Math.cos(this.toRad(lat1)) * Math.sin(this.toRad(lat2)) -
      Math.sin(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * Math.cos(dLng);
    
    let bearing = this.toDeg(Math.atan2(y, x));
    bearing = (bearing + 360) % 360;
    return bearing;
  }

  /**
   * Convert degrees to radians
   */
  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  /**
   * Convert radians to degrees
   */
  private toDeg(rad: number): number {
    return (rad * 180) / Math.PI;
  }

  /**
   * Handle error
   */
  private handleError(error: unknown): Error {
    if (error instanceof Error) {
      return new Error(`[OVERPASS] ${error.message}`);
    }
    return new Error('[OVERPASS] Unknown error');
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.cancelPendingRequests();
    this.networkClient.cleanup();
    await super.cleanup();
  }
}

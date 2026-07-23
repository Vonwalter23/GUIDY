/**
 * GUIDY - Datasource Factory
 * Factory for creating and managing POI datasources
 * 
 * STAGE 4.1: POI Datasource Layer
 * 
 * This factory manages datasource creation and lifecycle.
 * Supports multiple datasource types:
 * - OverpassDatasource (OpenStreetMap)
 * - GooglePlacesDatasource (future)
 * - GeoNamesDatasource (future)
 * - FoursquareDatasource (future)
 * - MapboxDatasource (future)
 * - OfflineDatasource (future)
 */

import type { POIDatasource } from '../POIDatasource';
import { OverpassDatasource } from './OverpassDatasource';
import type { POISource } from '../POITypes';

/**
 * Datasource types supported by the factory
 */
export type DatasourceType = 
  | 'overpass'
  | 'google_places'
  | 'geonames'
  | 'foursquare'
  | 'mapbox'
  | 'offline';

/**
 * Factory configuration
 */
export interface DatasourceFactoryConfig {
  /**
   * Default datasource type
   */
  defaultType: DatasourceType;
  
  /**
   * Enable datasource health checks
   */
  healthCheckEnabled: boolean;
  
  /**
   * Health check interval (ms)
   */
  healthCheckInterval: number;
  
  /**
   * Enable automatic fallback
   */
  automaticFallback: boolean;
  
  /**
   * Fallback order when default fails
   */
  fallbackOrder: DatasourceType[];
}

/**
 * Default factory configuration
 */
export const DEFAULT_FACTORY_CONFIG: DatasourceFactoryConfig = {
  defaultType: 'overpass',
  healthCheckEnabled: true,
  healthCheckInterval: 60000, // 1 minute
  automaticFallback: true,
  fallbackOrder: ['overpass', 'offline'],
};

/**
 * Datasource registration
 */
interface DatasourceRegistration {
  type: DatasourceType;
  instance: POIDatasource;
  healthy: boolean;
  lastHealthCheck: number;
  priority: number;
}

/**
 * Datasource Factory
 * Creates and manages POI datasources
 */
export class DatasourceFactory {
  private static instance: DatasourceFactory | null = null;
  
  private datasources: Map<DatasourceType, DatasourceRegistration> = new Map();
  private config: DatasourceFactoryConfig;
  private initialized: boolean = false;
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null;
  
  private constructor(config: Partial<DatasourceFactoryConfig> = {}) {
    this.config = { ...DEFAULT_FACTORY_CONFIG, ...config };
  }
  
  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<DatasourceFactoryConfig>): DatasourceFactory {
    if (!DatasourceFactory.instance) {
      DatasourceFactory.instance = new DatasourceFactory(config);
    }
    return DatasourceFactory.instance;
  }
  
  /**
   * Reset singleton instance (for testing)
   */
  static resetInstance(): void {
    if (DatasourceFactory.instance) {
      DatasourceFactory.instance.cleanup();
      DatasourceFactory.instance = null;
    }
  }
  
  /**
   * Initialize factory
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    // Register default datasources
    await this.registerDatasource('overpass', new OverpassDatasource());
    
    // Start health check if enabled
    if (this.config.healthCheckEnabled) {
      this.startHealthChecks();
    }
    
    this.initialized = true;
  }
  
  /**
   * Register a datasource
   */
  async registerDatasource(
    type: DatasourceType,
    instance: POIDatasource,
    priority?: number
  ): Promise<void> {
    await instance.initialize();
    
    const registration: DatasourceRegistration = {
      type,
      instance,
      healthy: true,
      lastHealthCheck: Date.now(),
      priority: priority ?? this.getDefaultPriority(type),
    };
    
    this.datasources.set(type, registration);
    console.log(`[FACTORY] Registered datasource: ${type}`);
  }
  
  /**
   * Unregister a datasource
   */
  async unregisterDatasource(type: DatasourceType): Promise<void> {
    const registration = this.datasources.get(type);
    if (registration) {
      await registration.instance.cleanup();
      this.datasources.delete(type);
      console.log(`[FACTORY] Unregistered datasource: ${type}`);
    }
  }
  
  /**
   * Get datasource by type
   */
  getDatasource(type: DatasourceType): POIDatasource | null {
    const registration = this.datasources.get(type);
    return registration?.instance ?? null;
  }
  
  /**
   * Get default datasource
   */
  getDefaultDatasource(): POIDatasource | null {
    return this.getDatasource(this.config.defaultType);
  }
  
  /**
   * Get datasource by source identifier
   */
  getDatasourceBySource(source: POISource): POIDatasource | null {
    const typeMap: Record<string, DatasourceType> = {
      overpass: 'overpass',
      google_places: 'google_places',
      geonames: 'geonames',
      foursquare: 'foursquare',
      mapbox: 'mapbox',
      local_cache: 'offline',
    };
    
    const type = typeMap[source];
    return type ? this.getDatasource(type) : null;
  }
  
  /**
   * Get all registered datasources
   */
  getAllDatasources(): POIDatasource[] {
    return Array.from(this.datasources.values()).map(r => r.instance);
  }
  
  /**
   * Get healthy datasources ordered by priority
   */
  getHealthyDatasources(): POIDatasource[] {
    return Array.from(this.datasources.values())
      .filter(r => r.healthy)
      .sort((a, b) => a.priority - b.priority)
      .map(r => r.instance);
  }
  
  /**
   * Get fallback datasource
   */
  getFallbackDatasource(): POIDatasource | null {
    for (const type of this.config.fallbackOrder) {
      const registration = this.datasources.get(type);
      if (registration?.healthy) {
        return registration.instance;
      }
    }
    return null;
  }
  
  /**
   * Get datasource with fallback
   */
  getDatasourceWithFallback(primaryType: DatasourceType): POIDatasource | null {
    const primary = this.getDatasource(primaryType);
    if (primary?.isAvailable()) {
      return primary;
    }
    
    if (this.config.automaticFallback) {
      return this.getFallbackDatasource();
    }
    
    return primary;
  }
  
  /**
   * Check datasource health
   */
  async checkHealth(type: DatasourceType): Promise<boolean> {
    const registration = this.datasources.get(type);
    if (!registration) {
      return false;
    }
    
    try {
      const healthCheck = (registration.instance as any).healthCheck;
      if (typeof healthCheck === 'function') {
        const result = await healthCheck();
        registration.healthy = result.healthy;
      } else {
        registration.healthy = registration.instance.isAvailable();
      }
    } catch (error) {
      registration.healthy = false;
      console.error(`[FACTORY] Health check failed for ${type}:`, error);
    }
    
    registration.lastHealthCheck = Date.now();
    return registration.healthy;
  }
  
  /**
   * Check all datasources health
   */
  async checkAllHealth(): Promise<Map<DatasourceType, boolean>> {
    const results = new Map<DatasourceType, boolean>();
    
    for (const type of this.datasources.keys()) {
      results.set(type, await this.checkHealth(type));
    }
    
    return results;
  }
  
  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    if (this.healthCheckTimer) {
      return;
    }
    
    this.healthCheckTimer = setInterval(() => {
      this.checkAllHealth();
    }, this.config.healthCheckInterval);
  }
  
  /**
   * Stop health checks
   */
  private stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
  }
  
  /**
   * Get default priority for datasource type
   */
  private getDefaultPriority(type: DatasourceType): number {
    const priorities: Record<DatasourceType, number> = {
      google_places: 1,
      mapbox: 2,
      overpass: 3,
      foursquare: 4,
      geonames: 5,
      offline: 10,
    };
    return priorities[type] ?? 5;
  }
  
  /**
   * Create datasource by type (factory method)
   */
  createDatasource(type: DatasourceType): POIDatasource | null {
    switch (type) {
      case 'overpass':
        return new OverpassDatasource();
      
      case 'google_places':
        // TODO: Implement when Google Places API is available
        console.warn('[FACTORY] Google Places datasource not yet implemented');
        return null;
      
      case 'geonames':
        // TODO: Implement when GeoNames API is available
        console.warn('[FACTORY] GeoNames datasource not yet implemented');
        return null;
      
      case 'foursquare':
        // TODO: Implement when Foursquare API is available
        console.warn('[FACTORY] Foursquare datasource not yet implemented');
        return null;
      
      case 'mapbox':
        // TODO: Implement when Mapbox API is available
        console.warn('[FACTORY] Mapbox datasource not yet implemented');
        return null;
      
      case 'offline':
        // TODO: Implement offline datasource
        console.warn('[FACTORY] Offline datasource not yet implemented');
        return null;
      
      default:
        console.error(`[FACTORY] Unknown datasource type: ${type}`);
        return null;
    }
  }
  
  /**
   * Check if type is registered
   */
  isRegistered(type: DatasourceType): boolean {
    return this.datasources.has(type);
  }
  
  /**
   * Check if type is healthy
   */
  isHealthy(type: DatasourceType): boolean {
    return this.datasources.get(type)?.healthy ?? false;
  }
  
  /**
   * Get factory statistics
   */
  getStats(): {
    totalDatasources: number;
    healthyCount: number;
    registeredTypes: DatasourceType[];
    healthyTypes: DatasourceType[];
    defaultType: DatasourceType;
  } {
    const registrations = Array.from(this.datasources.values());
    
    return {
      totalDatasources: registrations.length,
      healthyCount: registrations.filter(r => r.healthy).length,
      registeredTypes: registrations.map(r => r.type),
      healthyTypes: registrations.filter(r => r.healthy).map(r => r.type),
      defaultType: this.config.defaultType,
    };
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<DatasourceFactoryConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Restart health checks if interval changed
    if (config.healthCheckEnabled !== undefined || config.healthCheckInterval !== undefined) {
      this.stopHealthChecks();
      if (this.config.healthCheckEnabled) {
        this.startHealthChecks();
      }
    }
  }
  
  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    this.stopHealthChecks();
    
    for (const [type, registration] of this.datasources) {
      await registration.instance.cleanup();
      console.log(`[FACTORY] Cleaned up datasource: ${type}`);
    }
    
    this.datasources.clear();
    this.initialized = false;
  }
}

/**
 * Singleton export
 */
export const datasourceFactory = DatasourceFactory.getInstance();

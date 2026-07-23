/**
 * GUIDY - POI Session Store
 * In-memory storage for POI session data
 * 
 * STAGE 4.3: POI Session Manager
 */

import type {
  POIWithSession,
  POIGroup,
  POISessionConfig,
  POISessionStats,
} from './POISessionTypes';
import { POILifecycleState } from './POISessionTypes';
import { POILifecycleManager } from './POILifecycle';

/**
 * POI Session Store
 * Manages all POI groups and provides query methods
 */
export class POISessionStore {
  private pois: Map<string, POIWithSession> = new Map();
  private lifecycleManager: POILifecycleManager;
  private config: POISessionConfig;

  constructor(config: POISessionConfig, lifecycleManager: POILifecycleManager) {
    this.config = config;
    this.lifecycleManager = lifecycleManager;
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<POISessionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): POISessionConfig {
    return { ...this.config };
  }

  /**
   * Add POI to store
   */
  add(poiWithSession: POIWithSession): void {
    this.pois.set(poiWithSession.poi.id, poiWithSession);
  }

  /**
   * Add multiple POIs
   */
  addAll(pois: POIWithSession[]): void {
    for (const poi of pois) {
      this.add(poi);
    }
  }

  /**
   * Get POI by ID
   */
  get(id: string): POIWithSession | undefined {
    return this.pois.get(id);
  }

  /**
   * Check if POI exists
   */
  has(id: string): boolean {
    return this.pois.has(id);
  }

  /**
   * Update POI
   */
  update(poiWithSession: POIWithSession): void {
    if (this.pois.has(poiWithSession.poi.id)) {
      this.pois.set(poiWithSession.poi.id, poiWithSession);
    }
  }

  /**
   * Remove POI
   */
  remove(id: string): boolean {
    return this.pois.delete(id);
  }

  /**
   * Clear all POIs
   */
  clear(): void {
    this.pois.clear();
  }

  /**
   * Get all POIs
   */
  getAll(): POIWithSession[] {
    return Array.from(this.pois.values());
  }

  /**
   * Get POIs by lifecycle state
   */
  getByState(state: POILifecycleState): POIWithSession[] {
    return this.getAll().filter(p => p.lifecycleState === state);
  }

  /**
   * Get discovered POIs
   */
  getDiscovered(): POIWithSession[] {
    return this.getByState(POILifecycleState.DISCOVERED);
  }

  /**
   * Get active POIs
   */
  getActive(): POIWithSession[] {
    return this.getByState(POILifecycleState.ACTIVE);
  }

  /**
   * Get selected POI
   */
  getSelected(): POIWithSession | undefined {
    return this.getByState(POILifecycleState.SELECTED)[0];
  }

  /**
   * Get visited POIs
   */
  getVisited(): POIWithSession[] {
    return this.getByState(POILifecycleState.VISITED);
  }

  /**
   * Get expired POIs
   */
  getExpired(): POIWithSession[] {
    return this.getByState(POILifecycleState.EXPIRED);
  }

  /**
   * Get archived POIs
   */
  getArchived(): POIWithSession[] {
    return this.getByState(POILifecycleState.ARCHIVED);
  }

  /**
   * Get all groups
   */
  getGroups(): POIGroup {
    return {
      discovered: this.getDiscovered(),
      active: this.getActive(),
      visited: this.getVisited(),
      expired: this.getExpired(),
    };
  }

  /**
   * Get count by state
   */
  getCountByState(state: POILifecycleState): number {
    return this.getByState(state).length;
  }

  /**
   * Get total count
   */
  getTotalCount(): number {
    return this.pois.size;
  }

  /**
   * Get active count
   */
  getActiveCount(): number {
    return this.getActive().length;
  }

  /**
   * Get visited count
   */
  getVisitedCount(): number {
    return this.getVisited().length;
  }

  /**
   * Check if POI is visited
   */
  isVisited(id: string): boolean {
    const poi = this.get(id);
    return poi ? this.lifecycleManager.isVisited(poi) : false;
  }

  /**
   * Check if POI is expired
   */
  isExpired(id: string): boolean {
    const poi = this.get(id);
    return poi ? this.lifecycleManager.isExpired(poi) : false;
  }

  /**
   * Check if POI is active
   */
  isActive(id: string): boolean {
    const poi = this.get(id);
    return poi ? this.lifecycleManager.isActive(poi) : false;
  }

  /**
   * Get POI IDs by state
   */
  getIdsByState(state: POILifecycleState): string[] {
    return this.getByState(state).map(p => p.poi.id);
  }

  /**
   * Find POI by coordinates (for deduplication)
   */
  findByCoordinates(
    latitude: number,
    longitude: number,
    threshold: number = this.config.coordinateThreshold
  ): POIWithSession | undefined {
    return this.getAll().find(poi => {
      const distance = this.calculateDistance(
        poi.poi.latitude,
        poi.poi.longitude,
        latitude,
        longitude
      );
      return distance <= threshold;
    });
  }

  /**
   * Calculate distance between two points (Haversine)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert to radians
   */
  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  /**
   * Calculate Levenshtein similarity
   */
  calculateNameSimilarity(name1: string, name2: string): number {
    const longer = name1.length > name2.length ? name1 : name2;
    const shorter = name1.length > name2.length ? name2 : name1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Find duplicate POI
   */
  isDuplicate(
    latitude: number,
    longitude: number,
    name: string
  ): POIWithSession | undefined {
    // Check coordinate duplicate
    const byCoords = this.findByCoordinates(latitude, longitude, this.config.coordinateThreshold);
    if (byCoords) return byCoords;

    // Check name similarity
    if (this.config.deduplicationEnabled) {
      return this.getAll().find(poi => {
        const similarity = this.calculateNameSimilarity(
          poi.poi.name.toLowerCase(),
          name.toLowerCase()
        );
        return similarity >= this.config.nameSimilarityThreshold;
      });
    }

    return undefined;
  }

  /**
   * Get stats
   */
  getStats(sessionId: string, startTime: number): POISessionStats {
    const visited = this.getVisited();
    const totalDiscovered = this.getDiscovered().length + visited.length + this.getExpired().length;
    
    return {
      sessionId,
      startTime,
      totalDiscovered,
      totalActive: this.getActive().length,
      totalVisited: visited.length,
      totalExpired: this.getExpired().length,
      totalArchived: this.getArchived().length,
      currentActiveCount: this.getActiveCount(),
      visitedPercentage: totalDiscovered > 0 
        ? (visited.length / totalDiscovered) * 100 
        : 0,
    };
  }

  /**
   * Get recently discovered
   */
  getRecentlyDiscovered(count: number = 10): POIWithSession[] {
    return this.getDiscovered()
      .sort((a, b) => b.discoveredAt - a.discoveredAt)
      .slice(0, count);
  }

  /**
   * Get recently visited
   */
  getRecentlyVisited(count: number = 10): POIWithSession[] {
    return this.getVisited()
      .sort((a, b) => (b.visitedAt || 0) - (a.visitedAt || 0))
      .slice(0, count);
  }

  /**
   * Filter by category
   */
  getByCategory(category: string): POIWithSession[] {
    return this.getActive().filter(p => p.poi.category === category);
  }

  /**
   * Get categories in active POIs
   */
  getActiveCategories(): string[] {
    const categories = new Set(this.getActive().map(p => p.poi.category));
    return Array.from(categories);
  }
}

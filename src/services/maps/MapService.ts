/**
 * GUIDY - Map Service
 * Main service for handling map operations
 */

import type {MapRegion, MapCoordinate, MapMarker} from './MapTypes';
import {
  DEFAULT_REGION,
  ZOOM_LEVELS,
  REGION_DELTAS,
  MARKER_COLORS,
} from './MapConstants';
import {
  createRegionFromCoordinate,
  isValidCoordinate,
  normalizeRegion,
  calculateBoundingRegion,
} from './MapUtils';

/**
 * Map Service class for managing map state and operations
 */
class MapService {
  private currentRegion: MapRegion;
  private markers: MapMarker[];
  private userMarker: MapMarker | null;
  private isFollowingUser: boolean;
  private mapType: 'standard' | 'satellite' | 'hybrid';

  constructor() {
    this.currentRegion = DEFAULT_REGION;
    this.markers = [];
    this.userMarker = null;
    this.isFollowingUser = true;
    this.mapType = 'standard';
  }

  /**
   * Get current map region
   */
  getRegion(): MapRegion {
    return this.currentRegion;
  }

  /**
   * Set current map region
   */
  setRegion(region: MapRegion): void {
    this.currentRegion = normalizeRegion(region);
  }

  /**
   * Center map on a specific coordinate
   */
  centerOnCoordinate(
    coordinate: MapCoordinate,
    delta: number = REGION_DELTAS.MEDIUM,
  ): MapRegion {
    if (!isValidCoordinate(coordinate)) {
      console.warn('Invalid coordinate provided to centerOnCoordinate');
      return this.currentRegion;
    }
    this.currentRegion = createRegionFromCoordinate(coordinate, delta);
    return this.currentRegion;
  }

  /**
   * Update user location on map
   */
  updateUserLocation(coordinate: MapCoordinate): void {
    if (!isValidCoordinate(coordinate)) {
      return;
    }

    this.userMarker = {
      id: 'user-location',
      coordinate,
      title: 'Tu ubicación',
      pinColor: MARKER_COLORS.USER,
    };

    // Center on user if following is enabled
    if (this.isFollowingUser) {
      this.centerOnCoordinate(coordinate);
    }
  }

  /**
   * Get user marker
   */
  getUserMarker(): MapMarker | null {
    return this.userMarker;
  }

  /**
   * Set following user mode
   */
  setFollowingUser(follow: boolean): void {
    this.isFollowingUser = follow;
  }

  /**
   * Check if following user
   */
  isFollowingUserLocation(): boolean {
    return this.isFollowingUser;
  }

  /**
   * Add a marker to the map
   */
  addMarker(marker: MapMarker): void {
    const existingIndex = this.markers.findIndex(m => m.id === marker.id);
    if (existingIndex >= 0) {
      this.markers[existingIndex] = marker;
    } else {
      this.markers.push(marker);
    }
  }

  /**
   * Remove a marker by ID
   */
  removeMarker(markerId: string): void {
    this.markers = this.markers.filter(m => m.id !== markerId);
  }

  /**
   * Get all markers
   */
  getMarkers(): MapMarker[] {
    return [...this.markers];
  }

  /**
   * Clear all markers except user
   */
  clearMarkers(): void {
    this.markers = [];
  }

  /**
   * Set map type
   */
  setMapType(type: 'standard' | 'satellite' | 'hybrid'): void {
    this.mapType = type;
  }

  /**
   * Get map type
   */
  getMapType(): 'standard' | 'satellite' | 'hybrid' {
    return this.mapType;
  }

  /**
   * Zoom in
   */
  zoomIn(): MapRegion {
    const newDelta = Math.max(
      this.currentRegion.latitudeDelta / 2,
      REGION_DELTAS.VERY_CLOSE,
    );
    this.currentRegion = {
      ...this.currentRegion,
      latitudeDelta: newDelta,
      longitudeDelta: newDelta,
    };
    return this.currentRegion;
  }

  /**
   * Zoom out
   */
  zoomOut(): MapRegion {
    const newDelta = Math.min(
      this.currentRegion.latitudeDelta * 2,
      360,
    );
    this.currentRegion = {
      ...this.currentRegion,
      latitudeDelta: newDelta,
      longitudeDelta: newDelta,
    };
    return this.currentRegion;
  }

  /**
   * Fit all markers in view
   */
  fitAllMarkers(): MapRegion | null {
    const allCoordinates: MapCoordinate[] = [];

    if (this.userMarker) {
      allCoordinates.push(this.userMarker.coordinate);
    }

    this.markers.forEach(marker => {
      allCoordinates.push(marker.coordinate);
    });

    if (allCoordinates.length === 0) {
      return null;
    }

    const boundingRegion = calculateBoundingRegion(allCoordinates);
    if (boundingRegion) {
      this.currentRegion = boundingRegion;
    }

    return this.currentRegion;
  }

  /**
   * Animate to region
   */
  animateToRegion(region: MapRegion, animated: boolean = true): MapRegion {
    this.currentRegion = normalizeRegion(region);
    return this.currentRegion;
  }

  /**
   * Reset map to default region
   */
  resetToDefault(): MapRegion {
    this.currentRegion = DEFAULT_REGION;
    return this.currentRegion;
  }

  /**
   * Stop following user
   */
  stopFollowing(): void {
    this.isFollowingUser = false;
  }

  /**
   * Start following user
   */
  startFollowing(): void {
    this.isFollowingUser = true;
    if (this.userMarker) {
      this.centerOnCoordinate(this.userMarker.coordinate);
    }
  }

  /**
   * Toggle follow mode
   */
  toggleFollowMode(): boolean {
    this.isFollowingUser = !this.isFollowingUser;
    return this.isFollowingUser;
  }

  /**
   * Get current zoom level (approximate)
   */
  getZoomLevel(): number {
    const delta = this.currentRegion.latitudeDelta;
    if (delta <= REGION_DELTAS.VERY_CLOSE) return ZOOM_LEVELS.BUILDING;
    if (delta <= REGION_DELTAS.CLOSE) return ZOOM_LEVELS.STREET;
    if (delta <= REGION_DELTAS.MEDIUM) return ZOOM_LEVELS.DEFAULT;
    if (delta <= REGION_DELTAS.FAR) return ZOOM_LEVELS.CITY;
    return ZOOM_LEVELS.COUNTRY;
  }
}

// Singleton instance
export const mapService = new MapService();
export {MapService};

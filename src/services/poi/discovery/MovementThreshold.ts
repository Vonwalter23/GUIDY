/**
 * GUIDY - Movement Threshold
 * Handles movement detection and distance calculations
 * 
 * STAGE 4.2: POI Discovery Engine
 */

import { MovementMode } from './DiscoveryTypes';

/**
 * Earth radius in meters
 */
const EARTH_RADIUS = 6371000;

/**
 * Movement Threshold
 * Tracks user movement and determines when threshold is exceeded
 */
export class MovementThreshold {
  private lastLocation: { latitude: number; longitude: number } | null = null;
  private totalDistance: number = 0;
  private threshold: number;
  private mode: MovementMode = MovementMode.WALKING;

  constructor(thresholdMeters: number = 50) {
    this.threshold = thresholdMeters;
  }

  /**
   * Update threshold
   */
  setThreshold(meters: number): void {
    this.threshold = meters;
  }

  /**
   * Get current threshold
   */
  getThreshold(): number {
    return this.threshold;
  }

  /**
   * Update movement mode
   */
  setMode(mode: MovementMode): void {
    this.mode = mode;
  }

  /**
   * Get current mode
   */
  getMode(): MovementMode {
    return this.mode;
  }

  /**
   * Update location and calculate distance
   */
  updateLocation(latitude: number, longitude: number): {
    distanceFromLast: number;
    totalDistance: number;
    thresholdExceeded: boolean;
  } {
    const currentLocation = { latitude, longitude };
    
    let distanceFromLast = 0;
    
    if (this.lastLocation) {
      distanceFromLast = this.calculateDistance(
        this.lastLocation.latitude,
        this.lastLocation.longitude,
        latitude,
        longitude
      );
      this.totalDistance += distanceFromLast;
    }
    
    this.lastLocation = currentLocation;
    
    const thresholdExceeded = this.totalDistance >= this.threshold;
    
    return {
      distanceFromLast,
      totalDistance: this.totalDistance,
      thresholdExceeded,
    };
  }

  /**
   * Get last known location
   */
  getLastLocation(): { latitude: number; longitude: number } | null {
    return this.lastLocation;
  }

  /**
   * Get total distance traveled
   */
  getTotalDistance(): number {
    return this.totalDistance;
  }

  /**
   * Reset tracking
   */
  reset(): void {
    this.lastLocation = null;
    this.totalDistance = 0;
  }

  /**
   * Reset only the movement tracking (keeps last location)
   */
  resetMovement(): void {
    this.totalDistance = 0;
  }

  /**
   * Check if threshold is exceeded
   */
  isThresholdExceeded(): boolean {
    return this.totalDistance >= this.threshold;
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return EARTH_RADIUS * c;
  }

  /**
   * Calculate bearing between two points
   */
  calculateBearing(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const dLng = this.toRadians(lng2 - lng1);
    const y = Math.sin(dLng) * Math.cos(this.toRadians(lat2));
    const x =
      Math.cos(this.toRadians(lat1)) * Math.sin(this.toRadians(lat2)) -
      Math.sin(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.cos(dLng);
    
    let bearing = this.toDegrees(Math.atan2(y, x));
    bearing = (bearing + 360) % 360;
    
    return bearing;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Convert radians to degrees
   */
  private toDegrees(radians: number): number {
    return (radians * 180) / Math.PI;
  }

  /**
   * Get movement data
   */
  getMovementData(): {
    lastLocation: { latitude: number; longitude: number } | null;
    totalDistance: number;
    threshold: number;
    thresholdExceeded: boolean;
    mode: MovementMode;
  } {
    return {
      lastLocation: this.lastLocation,
      totalDistance: this.totalDistance,
      threshold: this.threshold,
      thresholdExceeded: this.isThresholdExceeded(),
      mode: this.mode,
    };
  }
}

/**
 * GUIDY - Movement Detector
 * Detect movement based on location changes
 */

import type {LocationData, MovementState} from './LocationTypes';
import {calculateDistanceMeters} from './DistanceCalculator';

/**
 * Movement detection configuration
 */
export interface MovementDetectorConfig {
  /** Minimum speed (m/s) to consider as moving */
  minSpeedThreshold: number;
  /** Minimum distance (meters) to consider as moving */
  minDistanceThreshold: number;
  /** Time window (ms) to consider for speed calculation */
  speedWindowMs: number;
  /** Minimum time between movement detections (ms) */
  movementDebounceMs: number;
}

/**
 * Default movement detector configuration
 */
export const DEFAULT_MOVEMENT_CONFIG: MovementDetectorConfig = {
  minSpeedThreshold: 0.5, // ~1.8 km/h
  minDistanceThreshold: 3, // meters
  speedWindowMs: 5000, // 5 seconds
  movementDebounceMs: 1000, // 1 second
};

/**
 * MovementDetector class
 * Detects if the user is moving based on location updates
 */
export class MovementDetector {
  private config: MovementDetectorConfig;
  private previousLocation: LocationData | null = null;
  private lastMovementTimestamp: number | null = null;
  private isMoving: boolean = false;
  private speedHistory: Array<{speed: number; timestamp: number}> = [];

  constructor(config: Partial<MovementDetectorConfig> = {}) {
    this.config = {...DEFAULT_MOVEMENT_CONFIG, ...config};
  }

  /**
   * Update the detector with a new location
   * @param location - New location data
   * @returns Current movement state
   */
  update(location: LocationData): MovementState {
    const now = Date.now();

    // Add speed to history if available
    if (location.speed !== null && location.speed !== undefined) {
      this.speedHistory.push({speed: location.speed, timestamp: now});

      // Clean old entries
      this.speedHistory = this.speedHistory.filter(
        entry => now - entry.timestamp <= this.config.speedWindowMs,
      );
    }

    // Calculate distance from previous location
    let movementDetected = false;
    if (this.previousLocation) {
      const distance = calculateDistanceMeters(this.previousLocation, location);
      const timeDiff = location.timestamp - this.previousLocation.timestamp;

      // Check if moved enough
      if (distance >= this.config.minDistanceThreshold) {
        movementDetected = true;
      }

      // Check speed if we have enough data
      if (this.speedHistory.length > 0) {
        const avgSpeed =
          this.speedHistory.reduce((sum, entry) => sum + entry.speed, 0) /
          this.speedHistory.length;
        if (avgSpeed >= this.config.minSpeedThreshold) {
          movementDetected = true;
        }
      }

      // Check if time diff is reasonable (not a jump in time)
      if (timeDiff > 0 && timeDiff < 60000) {
        const impliedSpeed = distance / (timeDiff / 1000);
        if (impliedSpeed >= this.config.minSpeedThreshold) {
          movementDetected = true;
        }
      }
    }

    // Apply debounce
    if (movementDetected) {
      if (
        this.lastMovementTimestamp &&
        now - this.lastMovementTimestamp < this.config.movementDebounceMs
      ) {
        movementDetected = false;
      } else {
        this.lastMovementTimestamp = now;
      }
    }

    // Update state
    this.isMoving = movementDetected;
    this.previousLocation = location;

    return this.getState(location);
  }

  /**
   * Get current movement state
   * @param currentLocation - Current location for speed/heading info
   * @returns Current movement state
   */
  getState(currentLocation: LocationData): MovementState {
    return {
      isMoving: this.isMoving,
      speed: currentLocation.speed ?? null,
      heading: currentLocation.heading ?? null,
      lastMovementTimestamp: this.lastMovementTimestamp,
    };
  }

  /**
   * Check if currently moving
   * @returns True if moving
   */
  getIsMoving(): boolean {
    return this.isMoving;
  }

  /**
   * Get average speed from history
   * @returns Average speed in m/s or null if no data
   */
  getAverageSpeed(): number | null {
    if (this.speedHistory.length === 0) {
      return null;
    }
    return (
      this.speedHistory.reduce((sum, entry) => sum + entry.speed, 0) /
      this.speedHistory.length
    );
  }

  /**
   * Reset the detector
   */
  reset(): void {
    this.previousLocation = null;
    this.lastMovementTimestamp = null;
    this.isMoving = false;
    this.speedHistory = [];
  }

  /**
   * Update configuration
   * @param config - New configuration (partial)
   */
  updateConfig(config: Partial<MovementDetectorConfig>): void {
    this.config = {...this.config, ...config};
  }
}

/**
 * Create a new movement detector instance
 * @param config - Optional configuration
 * @returns MovementDetector instance
 */
export function createMovementDetector(
  config?: Partial<MovementDetectorConfig>,
): MovementDetector {
  return new MovementDetector(config);
}

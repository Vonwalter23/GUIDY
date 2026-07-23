/**
 * Movement Threshold Tests
 */

import { MovementThreshold } from '../../src/services/poi/discovery/MovementThreshold';
import { MovementMode } from '../../src/services/poi/discovery/DiscoveryTypes';

describe('MovementThreshold', () => {
  let threshold: MovementThreshold;

  beforeEach(() => {
    threshold = new MovementThreshold(50);
  });

  describe('Constructor', () => {
    it('should initialize with default threshold', () => {
      const t = new MovementThreshold();
      expect(t.getThreshold()).toBe(50);
    });

    it('should initialize with custom threshold', () => {
      expect(threshold.getThreshold()).toBe(50);
    });
  });

  describe('setThreshold', () => {
    it('should update threshold', () => {
      threshold.setThreshold(100);
      expect(threshold.getThreshold()).toBe(100);
    });
  });

  describe('Movement Mode', () => {
    it('should default to WALKING mode', () => {
      expect(threshold.getMode()).toBe(MovementMode.WALKING);
    });

    it('should update mode', () => {
      threshold.setMode(MovementMode.CYCLING);
      expect(threshold.getMode()).toBe(MovementMode.CYCLING);
    });

    it('should switch to VEHICLE mode', () => {
      threshold.setMode(MovementMode.VEHICLE);
      expect(threshold.getMode()).toBe(MovementMode.VEHICLE);
    });
  });

  describe('updateLocation', () => {
    it('should return zero distance on first update', () => {
      const result = threshold.updateLocation(40.7128, -74.0060);
      expect(result.distanceFromLast).toBe(0);
      expect(result.totalDistance).toBe(0);
      expect(result.thresholdExceeded).toBe(false);
    });

    it('should calculate distance on subsequent updates', () => {
      threshold.updateLocation(40.7128, -74.0060);
      const result = threshold.updateLocation(40.7138, -74.0060);
      
      expect(result.distanceFromLast).toBeGreaterThan(0);
      expect(result.totalDistance).toBeGreaterThan(0);
    });

    it('should track threshold exceeded', () => {
      // First point
      threshold.updateLocation(40.7128, -74.0060);
      
      // Move ~60 meters north (should exceed 50m threshold)
      const result = threshold.updateLocation(40.7134, -74.0060);
      
      expect(result.thresholdExceeded).toBe(true);
    });

    it('should not exceed threshold for small movements', () => {
      threshold.updateLocation(40.7128, -74.0060);
      const result = threshold.updateLocation(40.7129, -74.0060);
      
      expect(result.thresholdExceeded).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all tracking', () => {
      threshold.updateLocation(40.7128, -74.0060);
      threshold.updateLocation(40.7138, -74.0060);
      
      threshold.reset();
      
      expect(threshold.getLastLocation()).toBeNull();
      expect(threshold.getTotalDistance()).toBe(0);
      expect(threshold.isThresholdExceeded()).toBe(false);
    });
  });

  describe('resetMovement', () => {
    it('should reset total distance but keep location', () => {
      threshold.updateLocation(40.7128, -74.0060);
      threshold.updateLocation(40.7138, -74.0060);
      
      threshold.resetMovement();
      
      expect(threshold.getLastLocation()).not.toBeNull();
      expect(threshold.getTotalDistance()).toBe(0);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate Haversine distance', () => {
      // NYC to Times Square (~1km)
      const distance = threshold.calculateDistance(
        40.7128, -74.0060, // NYC
        40.7580, -73.9855  // Times Square
      );
      
      expect(distance).toBeGreaterThan(4000);
      expect(distance).toBeLessThan(6000);
    });

    it('should return 0 for same point', () => {
      const distance = threshold.calculateDistance(
        40.7128, -74.0060,
        40.7128, -74.0060
      );
      
      expect(distance).toBe(0);
    });
  });

  describe('calculateBearing', () => {
    it('should calculate bearing north', () => {
      const bearing = threshold.calculateBearing(
        40.7128, -74.0060,
        40.7228, -74.0060
      );
      
      expect(bearing).toBeCloseTo(0, 0); // North
    });

    it('should calculate bearing east', () => {
      const bearing = threshold.calculateBearing(
        40.7128, -74.0060,
        40.7128, -73.9960
      );
      
      expect(bearing).toBeCloseTo(90, 0); // East
    });

    it('should calculate bearing south', () => {
      const bearing = threshold.calculateBearing(
        40.7128, -74.0060,
        40.7028, -74.0060
      );
      
      expect(bearing).toBeCloseTo(180, 0); // South
    });
  });

  describe('getMovementData', () => {
    it('should return initial state', () => {
      const data = threshold.getMovementData();
      
      expect(data.lastLocation).toBeNull();
      expect(data.totalDistance).toBe(0);
      expect(data.threshold).toBe(50);
      expect(data.thresholdExceeded).toBe(false);
      expect(data.mode).toBe(MovementMode.WALKING);
    });

    it('should return updated state', () => {
      threshold.updateLocation(40.7128, -74.0060);
      threshold.updateLocation(40.7138, -74.0060);
      
      const data = threshold.getMovementData();
      
      expect(data.lastLocation).not.toBeNull();
      expect(data.totalDistance).toBeGreaterThan(0);
      expect(data.thresholdExceeded).toBe(true);
    });
  });
});

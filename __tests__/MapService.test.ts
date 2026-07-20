/**
 * GUIDY - Map Service Tests
 */

import {
  createRegionFromCoordinate,
  deltaFromZoom,
  zoomFromDelta,
  isCoordinateInBounds,
  isValidCoordinate,
  calculateCenter,
  calculateBoundingRegion,
  normalizeRegion,
  areRegionsEqual,
  getZoomDescription,
  getOsmTileUrl,
  latLngToTile,
  tileToLatLng,
} from '../src/services/maps/MapUtils';
import {DEFAULT_REGION} from '../src/services/maps/MapConstants';
import {mapService} from '../src/services/maps/MapService';

describe('MapUtils', () => {
  describe('createRegionFromCoordinate', () => {
    it('should create region from coordinate with default delta', () => {
      const coord = {latitude: -43.3, longitude: -65.1};
      const region = createRegionFromCoordinate(coord);
      
      expect(region.latitude).toBe(coord.latitude);
      expect(region.longitude).toBe(coord.longitude);
      expect(region.latitudeDelta).toBeDefined();
      expect(region.longitudeDelta).toBeDefined();
    });

    it('should create region from coordinate with custom delta', () => {
      const coord = {latitude: -43.3, longitude: -65.1};
      const delta = 0.01;
      const region = createRegionFromCoordinate(coord, delta);
      
      expect(region.latitudeDelta).toBe(delta);
      expect(region.longitudeDelta).toBe(delta);
    });
  });

  describe('deltaFromZoom', () => {
    it('should return smaller delta for higher zoom', () => {
      const deltaLow = deltaFromZoom(10);
      const deltaHigh = deltaFromZoom(16);
      
      expect(deltaHigh).toBeLessThan(deltaLow);
    });
  });

  describe('zoomFromDelta', () => {
    it('should return valid zoom values within range', () => {
      const zoom = zoomFromDelta(0.05);
      
      expect(zoom).toBeGreaterThanOrEqual(3);
      expect(zoom).toBeLessThanOrEqual(18);
    });

    it('should handle extreme delta values', () => {
      const zoomMax = zoomFromDelta(360);
      const zoomMin = zoomFromDelta(0.00001);
      
      expect(zoomMax).toBe(3);
      expect(zoomMin).toBe(18);
    });
  });

  describe('isCoordinateInBounds', () => {
    it('should return true for coordinate within bounds', () => {
      const bounds = {north: -40, south: -50, east: -60, west: -70};
      const coord = {latitude: -43, longitude: -65};
      
      expect(isCoordinateInBounds(coord, bounds)).toBe(true);
    });

    it('should return false for coordinate outside bounds', () => {
      const bounds = {north: -40, south: -50, east: -60, west: -70};
      const coord = {latitude: -30, longitude: -65};
      
      expect(isCoordinateInBounds(coord, bounds)).toBe(false);
    });
  });

  describe('isValidCoordinate', () => {
    it('should return true for valid coordinates', () => {
      expect(isValidCoordinate({latitude: -43.3, longitude: -65.1})).toBe(true);
      expect(isValidCoordinate({latitude: 0, longitude: 0})).toBe(true);
      expect(isValidCoordinate({latitude: 90, longitude: 180})).toBe(true);
      expect(isValidCoordinate({latitude: -90, longitude: -180})).toBe(true);
    });

    it('should return false for invalid coordinates', () => {
      expect(isValidCoordinate({latitude: 91, longitude: 0})).toBe(false);
      expect(isValidCoordinate({latitude: 0, longitude: 181})).toBe(false);
      expect(isValidCoordinate({latitude: NaN, longitude: 0})).toBe(false);
    });
  });

  describe('calculateCenter', () => {
    it('should calculate center between two coordinates', () => {
      const coord1 = {latitude: -40, longitude: -60};
      const coord2 = {latitude: -50, longitude: -70};
      const center = calculateCenter(coord1, coord2);
      
      expect(center.latitude).toBe(-45);
      expect(center.longitude).toBe(-65);
    });
  });

  describe('calculateBoundingRegion', () => {
    it('should calculate bounding region for multiple coordinates', () => {
      const coords = [
        {latitude: -40, longitude: -60},
        {latitude: -50, longitude: -70},
      ];
      const region = calculateBoundingRegion(coords);
      
      expect(region).not.toBeNull();
      expect(region!.latitude).toBe(-45);
      expect(region!.longitude).toBe(-65);
    });

    it('should return null for empty array', () => {
      expect(calculateBoundingRegion([])).toBeNull();
    });
  });

  describe('normalizeRegion', () => {
    it('should normalize latitude to valid range', () => {
      const region = normalizeRegion({
        latitude: 95,
        longitude: -65,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      
      expect(region.latitude).toBeLessThanOrEqual(90);
    });

    it('should normalize longitude to valid range', () => {
      const region = normalizeRegion({
        latitude: -43,
        longitude: 200,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      
      expect(region.longitude).toBeLessThanOrEqual(180);
    });
  });

  describe('areRegionsEqual', () => {
    it('should return true for equal regions within tolerance', () => {
      const region1 = {
        latitude: -43.3,
        longitude: -65.1,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      const region2 = {
        ...region1,
        latitude: -43.30005,
      };
      
      expect(areRegionsEqual(region1, region2, 0.0001)).toBe(true);
    });
  });

  describe('getZoomDescription', () => {
    it('should return building level for high zoom', () => {
      expect(getZoomDescription(17)).toBe('Building level');
    });

    it('should return world view for low zoom', () => {
      expect(getZoomDescription(3)).toBe('World view');
    });
  });

  describe('getOsmTileUrl', () => {
    it('should generate correct OSM tile URL', () => {
      const url = getOsmTileUrl(123, 456, 15, 0);
      
      expect(url).toContain('tile.openstreetmap.org');
      expect(url).toContain('15/123/456.png');
    });

    it('should use different server based on index', () => {
      const url1 = getOsmTileUrl(123, 456, 15, 0);
      const url2 = getOsmTileUrl(123, 456, 15, 1);
      
      expect(url1).toContain('tile.openstreetmap.org');
      expect(url2).toContain('a.tile.openstreetmap.org');
    });
  });

  describe('latLngToTile', () => {
    it('should convert lat/lng to tile coordinates', () => {
      const tile = latLngToTile(-43.3, -65.1, 15);
      
      expect(tile.x).toBeDefined();
      expect(tile.y).toBeDefined();
      expect(typeof tile.x).toBe('number');
      expect(typeof tile.y).toBe('number');
    });
  });

  describe('tileToLatLng', () => {
    it('should convert tile coordinates to lat/lng', () => {
      const coord = tileToLatLng(0, 0, 1);
      
      expect(coord.lat).toBeDefined();
      expect(coord.lng).toBeDefined();
      expect(coord.lat).toBeGreaterThan(-90);
      expect(coord.lat).toBeLessThan(90);
    });
  });
});

describe('MapService', () => {
  beforeEach(() => {
    // Reset map service state
    mapService.setRegion(DEFAULT_REGION);
  });

  describe('getRegion / setRegion', () => {
    it('should return current region', () => {
      const region = mapService.getRegion();
      
      expect(region).toBeDefined();
      expect(region.latitude).toBeDefined();
      expect(region.longitude).toBeDefined();
    });

    it('should update region', () => {
      const newRegion = {
        latitude: -44,
        longitude: -66,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapService.setRegion(newRegion);
      
      expect(mapService.getRegion().latitude).toBe(-44);
    });
  });

  describe('centerOnCoordinate', () => {
    it('should center on valid coordinate', () => {
      const coord = {latitude: -43.5, longitude: -65.5};
      const region = mapService.centerOnCoordinate(coord);
      
      expect(region.latitude).toBe(coord.latitude);
      expect(region.longitude).toBe(coord.longitude);
    });

    it('should return current region for invalid coordinate', () => {
      const beforeRegion = mapService.getRegion();
      const region = mapService.centerOnCoordinate({latitude: NaN, longitude: NaN});
      
      expect(region).toEqual(beforeRegion);
    });
  });

  describe('updateUserLocation', () => {
    it('should update user marker', () => {
      const coord = {latitude: -43.3, longitude: -65.1};
      mapService.updateUserLocation(coord);
      
      const marker = mapService.getUserMarker();
      
      expect(marker).not.toBeNull();
      expect(marker!.coordinate.latitude).toBe(coord.latitude);
    });
  });

  describe('follow mode', () => {
    it('should toggle follow mode', () => {
      const initialState = mapService.isFollowingUserLocation();
      const newState = mapService.toggleFollowMode();
      
      expect(newState).toBe(!initialState);
    });

    it('should stop following', () => {
      mapService.stopFollowing();
      
      expect(mapService.isFollowingUserLocation()).toBe(false);
    });

    it('should start following', () => {
      mapService.stopFollowing();
      mapService.startFollowing();
      
      expect(mapService.isFollowingUserLocation()).toBe(true);
    });
  });

  describe('zoom operations', () => {
    it('should zoom in', () => {
      const beforeRegion = mapService.getRegion();
      mapService.zoomIn();
      const afterRegion = mapService.getRegion();
      
      expect(afterRegion.latitudeDelta).toBeLessThan(beforeRegion.latitudeDelta);
    });

    it('should zoom out', () => {
      const beforeRegion = mapService.getRegion();
      mapService.zoomOut();
      const afterRegion = mapService.getRegion();
      
      expect(afterRegion.latitudeDelta).toBeGreaterThan(beforeRegion.latitudeDelta);
    });
  });

  describe('resetToDefault', () => {
    it('should reset to default region', () => {
      mapService.setRegion({
        latitude: -99,
        longitude: -99,
        latitudeDelta: 1,
        longitudeDelta: 1,
      });
      mapService.resetToDefault();
      
      expect(mapService.getRegion().latitude).toBe(DEFAULT_REGION.latitude);
    });
  });
});

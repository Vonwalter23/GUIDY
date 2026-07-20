/**
 * GUIDY - Map Utilities
 * Helper functions for map operations
 */

import type {MapCoordinate, MapRegion} from './MapTypes';
import {
  REGION_DELTAS,
  ZOOM_LEVELS,
  DEFAULT_REGION,
  ARGENTINA_BOUNDS,
} from './MapConstants';

/**
 * Create a region from a coordinate with given delta
 */
export function createRegionFromCoordinate(
  coordinate: MapCoordinate,
  delta: number = REGION_DELTAS.MEDIUM,
): MapRegion {
  return {
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

/**
 * Calculate delta from zoom level
 */
export function deltaFromZoom(zoom: number): number {
  const maxDelta = 360;
  const minZoom = ZOOM_LEVELS.MIN;
  const maxZoom = ZOOM_LEVELS.MAX;
  
  const normalizedZoom = (zoom - minZoom) / (maxZoom - minZoom);
  return maxDelta * Math.pow(2, -normalizedZoom * 6);
}

/**
 * Calculate zoom from delta
 */
export function zoomFromDelta(delta: number): number {
  const maxDelta = 360;
  const minZoom = ZOOM_LEVELS.MIN;
  const maxZoom = ZOOM_LEVELS.MAX;
  
  const logDelta = Math.log2(delta / maxDelta);
  const zoom = minZoom - (logDelta * (maxZoom - minZoom)) / 6;
  
  return Math.max(minZoom, Math.min(maxZoom, zoom));
}

/**
 * Check if coordinate is within bounds
 */
export function isCoordinateInBounds(
  coordinate: MapCoordinate,
  bounds: {north: number; south: number; east: number; west: number},
): boolean {
  return (
    coordinate.latitude <= bounds.north &&
    coordinate.latitude >= bounds.south &&
    coordinate.longitude <= bounds.east &&
    coordinate.longitude >= bounds.west
  );
}

/**
 * Check if coordinate is valid
 */
export function isValidCoordinate(coordinate: MapCoordinate): boolean {
  return (
    typeof coordinate.latitude === 'number' &&
    typeof coordinate.longitude === 'number' &&
    !isNaN(coordinate.latitude) &&
    !isNaN(coordinate.longitude) &&
    coordinate.latitude >= -90 &&
    coordinate.latitude <= 90 &&
    coordinate.longitude >= -180 &&
    coordinate.longitude <= 180
  );
}

/**
 * Calculate center point between two coordinates
 */
export function calculateCenter(
  coord1: MapCoordinate,
  coord2: MapCoordinate,
): MapCoordinate {
  return {
    latitude: (coord1.latitude + coord2.latitude) / 2,
    longitude: (coord1.longitude + coord2.longitude) / 2,
  };
}

/**
 * Calculate region that contains all coordinates
 */
export function calculateBoundingRegion(
  coordinates: MapCoordinate[],
): MapRegion | null {
  if (coordinates.length === 0) {
    return null;
  }

  let minLat = coordinates[0].latitude;
  let maxLat = coordinates[0].latitude;
  let minLng = coordinates[0].longitude;
  let maxLng = coordinates[0].longitude;

  coordinates.forEach(coord => {
    minLat = Math.min(minLat, coord.latitude);
    maxLat = Math.max(maxLat, coord.latitude);
    minLng = Math.min(minLng, coord.longitude);
    maxLng = Math.max(maxLng, coord.longitude);
  });

  const latDelta = Math.max(maxLat - minLat, REGION_DELTAS.VERY_CLOSE);
  const lngDelta = Math.max(maxLng - minLng, REGION_DELTAS.VERY_CLOSE);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latDelta * 1.2, // Add padding
    longitudeDelta: lngDelta * 1.2,
  };
}

/**
 * Check if region is within Argentina bounds
 */
export function isInArgentina(region: MapRegion): boolean {
  return isCoordinateInBounds(
    {latitude: region.latitude, longitude: region.longitude},
    ARGENTINA_BOUNDS,
  );
}

/**
 * Normalize region to valid bounds
 */
export function normalizeRegion(region: MapRegion): MapRegion {
  let latitude = region.latitude;
  let longitude = region.longitude;
  
  // Normalize latitude
  latitude = Math.max(-90, Math.min(90, latitude));
  
  // Normalize longitude
  while (longitude > 180) longitude -= 360;
  while (longitude < -180) longitude += 360;
  
  return {
    ...region,
    latitude,
    longitude,
    latitudeDelta: Math.max(0.01, region.latitudeDelta),
    longitudeDelta: Math.max(0.01, region.longitudeDelta),
  };
}

/**
 * Check if two regions are approximately equal
 */
export function areRegionsEqual(
  region1: MapRegion,
  region2: MapRegion,
  tolerance: number = 0.0001,
): boolean {
  return (
    Math.abs(region1.latitude - region2.latitude) < tolerance &&
    Math.abs(region1.longitude - region2.longitude) < tolerance &&
    Math.abs(region1.latitudeDelta - region2.latitudeDelta) < tolerance &&
    Math.abs(region1.longitudeDelta - region2.longitudeDelta) < tolerance
  );
}

/**
 * Get distance in pixels at given zoom level (approximate)
 */
export function pixelsAtZoom(zoom: number, screenWidth: number): number {
  return screenWidth * Math.pow(2, zoom - ZOOM_LEVELS.DEFAULT);
}

/**
 * Format zoom level description
 */
export function getZoomDescription(zoom: number): string {
  if (zoom >= ZOOM_LEVELS.BUILDING) return 'Building level';
  if (zoom >= ZOOM_LEVELS.STREET) return 'Street level';
  if (zoom >= ZOOM_LEVELS.CITY) return 'City level';
  if (zoom >= ZOOM_LEVELS.COUNTRY) return 'Country level';
  return 'World view';
}

/**
 * Generate OpenStreetMap tile URL
 */
export function getOsmTileUrl(
  x: number,
  y: number,
  z: number,
  serverIndex: number = 0,
): string {
  const servers = [
    'https://tile.openstreetmap.org',
    'https://a.tile.openstreetmap.org',
    'https://b.tile.openstreetmap.org',
    'https://c.tile.openstreetmap.org',
  ];
  const server = servers[serverIndex % servers.length];
  return `${server}/${z}/${x}/${y}.png`;
}

/**
 * Convert coordinates to tile coordinates
 */
export function latLngToTile(
  lat: number,
  lng: number,
  zoom: number,
): {x: number; y: number} {
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  );
  return {x, y};
}

/**
 * Convert tile coordinates to lat/lng
 */
export function tileToLatLng(
  x: number,
  y: number,
  zoom: number,
): {lat: number; lng: number} {
  const n = Math.pow(2, zoom);
  const lng = (x / n) * 360 - 180;
  const latRad = Math.atan(
    Math.sinh(Math.PI * (1 - (2 * y) / n)),
  );
  const lat = (latRad * 180) / Math.PI;
  return {lat, lng};
}

/**
 * Default export with all utilities
 */
export const mapUtils = {
  createRegionFromCoordinate,
  deltaFromZoom,
  zoomFromDelta,
  isCoordinateInBounds,
  isValidCoordinate,
  calculateCenter,
  calculateBoundingRegion,
  isInArgentina,
  normalizeRegion,
  areRegionsEqual,
  pixelsAtZoom,
  getZoomDescription,
  getOsmTileUrl,
  latLngToTile,
  tileToLatLng,
};

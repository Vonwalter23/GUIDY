/**
 * GUIDY - Distance Calculator
 * Calculate distances and related metrics between geographic coordinates
 */

import type {Coordinates} from './LocationTypes';
import {isValidCoordinate} from './LocationUtils';

/**
 * Earth's radius in meters
 */
const EARTH_RADIUS_METERS = 6371000;

/**
 * Earth's radius in kilometers
 */
const EARTH_RADIUS_KILOMETERS = 6371;

/**
 * Earth's radius in miles
 */
const EARTH_RADIUS_MILES = 3959;

/**
 * Convert degrees to radians
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 * @param radians - Angle in radians
 * @returns Angle in degrees
 */
export function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param from - Starting coordinates
 * @param to - Ending coordinates
 * @param unit - Unit of measurement
 * @returns Distance in the specified unit
 */
export function calculateDistance(
  from: Coordinates,
  to: Coordinates,
  unit: 'meters' | 'kilometers' | 'miles' = 'meters',
): number {
  if (!isValidCoordinate(from.latitude, from.longitude) || !isValidCoordinate(to.latitude, to.longitude)) {
    console.warn('Invalid coordinates provided to calculateDistance');
    return 0;
  }

  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  // Haversine formula
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  let radius = EARTH_RADIUS_METERS;
  switch (unit) {
    case 'kilometers':
      radius = EARTH_RADIUS_KILOMETERS;
      break;
    case 'miles':
      radius = EARTH_RADIUS_MILES;
      break;
    case 'meters':
    default:
      radius = EARTH_RADIUS_METERS;
      break;
  }

  return radius * c;
}

/**
 * Calculate distance in meters
 * @param from - Starting coordinates
 * @param to - Ending coordinates
 * @returns Distance in meters
 */
export function calculateDistanceMeters(from: Coordinates, to: Coordinates): number {
  return calculateDistance(from, to, 'meters');
}

/**
 * Calculate distance in kilometers
 * @param from - Starting coordinates
 * @param to - Ending coordinates
 * @returns Distance in kilometers
 */
export function calculateDistanceKilometers(from: Coordinates, to: Coordinates): number {
  return calculateDistance(from, to, 'kilometers');
}

/**
 * Calculate distance in miles
 * @param from - Starting coordinates
 * @param to - Ending coordinates
 * @returns Distance in miles
 */
export function calculateDistanceMiles(from: Coordinates, to: Coordinates): number {
  return calculateDistance(from, to, 'miles');
}

/**
 * Calculate bearing between two coordinates
 * @param from - Starting coordinates
 * @param to - Ending coordinates
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(from: Coordinates, to: Coordinates): number {
  if (!isValidCoordinate(from.latitude, from.longitude) || !isValidCoordinate(to.latitude, to.longitude)) {
    console.warn('Invalid coordinates provided to calculateBearing');
    return 0;
  }

  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  let bearing = toDegrees(Math.atan2(y, x));
  bearing = (bearing + 360) % 360;

  return bearing;
}

/**
 * Get cardinal direction from bearing
 * @param bearing - Bearing in degrees
 * @returns Cardinal direction (N, NE, E, SE, S, SW, W, NW)
 */
export function getCardinalDirection(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

/**
 * Calculate the midpoint between two coordinates
 * @param from - Starting coordinates
 * @param to - Ending coordinates
 * @returns Midpoint coordinates
 */
export function calculateMidpoint(from: Coordinates, to: Coordinates): Coordinates {
  if (!isValidCoordinate(from.latitude, from.longitude) || !isValidCoordinate(to.latitude, to.longitude)) {
    console.warn('Invalid coordinates provided to calculateMidpoint');
    return from;
  }

  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const lon1 = toRadians(from.longitude);
  const deltaLon = toRadians(to.longitude - from.longitude);

  const bx = Math.cos(lat2) * Math.cos(deltaLon);
  const by = Math.cos(lat2) * Math.sin(deltaLon);

  const lat3 = Math.atan2(
    Math.sin(lat1) + Math.sin(lat2),
    Math.sqrt((Math.cos(lat1) + bx) * (Math.cos(lat1) + bx) + by * by),
  );
  const lon3 = lon1 + Math.atan2(by, Math.cos(lat1) + bx);

  return {
    latitude: toDegrees(lat3),
    longitude: toDegrees(lon3),
  };
}

/**
 * Format distance for display
 * @param meters - Distance in meters
 * @returns Human-readable distance string
 */
export function formatDistance(meters: number): string {
  if (meters < 1) {
    return `${(meters * 100).toFixed(0)} cm`;
  }
  if (meters < 1000) {
    return `${meters.toFixed(0)} m`;
  }
  if (meters < 10000) {
    return `${(meters / 1000).toFixed(1)} km`;
  }
  return `${(meters / 1000).toFixed(0)} km`;
}

/**
 * Check if a point is within a radius of another point
 * @param center - Center coordinates
 * @param point - Point to check
 * @param radiusMeters - Radius in meters
 * @returns True if point is within radius
 */
export function isWithinRadius(
  center: Coordinates,
  point: Coordinates,
  radiusMeters: number,
): boolean {
  const distance = calculateDistanceMeters(center, point);
  return distance <= radiusMeters;
}

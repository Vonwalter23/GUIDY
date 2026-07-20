/**
 * GUIDY - Location Utilities
 * Helper functions for location operations
 */

import type {LocationData, GpsStatus} from './LocationTypes';

/**
 * Format latitude to human-readable string
 * @param latitude - Latitude value
 * @returns Formatted string (e.g., "-34.6037° S")
 */
export function formatLatitude(latitude: number): string {
  const direction = latitude >= 0 ? 'N' : 'S';
  return `${Math.abs(latitude).toFixed(6)}° ${direction}`;
}

/**
 * Format longitude to human-readable string
 * @param longitude - Longitude value
 * @returns Formatted string (e.g., "-58.3816° W")
 */
export function formatLongitude(longitude: number): string {
  const direction = longitude >= 0 ? 'E' : 'W';
  return `${Math.abs(longitude).toFixed(6)}° ${direction}`;
}

/**
 * Format coordinates as a single string
 * @param latitude - Latitude value
 * @param longitude - Longitude value
 * @returns Formatted string (e.g., "34.6037° S, 58.3816° W")
 */
export function formatCoordinates(latitude: number, longitude: number): string {
  return `${formatLatitude(latitude)}, ${formatLongitude(longitude)}`;
}

/**
 * Format accuracy to human-readable string
 * @param accuracy - Accuracy in meters
 * @returns Formatted string (e.g., "± 5.0 m")
 */
export function formatAccuracy(accuracy: number): string {
  if (accuracy < 1) {
    return `± ${(accuracy * 100).toFixed(0)} cm`;
  }
  if (accuracy < 1000) {
    return `± ${accuracy.toFixed(1)} m`;
  }
  return `± ${(accuracy / 1000).toFixed(2)} km`;
}

/**
 * Format speed to human-readable string
 * @param speed - Speed in m/s
 * @returns Formatted string (e.g., "5.4 km/h")
 */
export function formatSpeed(speed: number | null): string {
  if (speed === null || speed < 0) {
    return 'N/A';
  }
  const kmh = speed * 3.6;
  if (kmh < 1) {
    return '0 km/h';
  }
  return `${kmh.toFixed(1)} km/h`;
}

/**
 * Format timestamp to relative time
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Human-readable relative time (e.g., "Hace 5 segundos")
 */
export function formatLastUpdate(timestamp: number): string {
  if (!timestamp) {
    return 'Nunca';
  }

  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 1000) {
    return 'Ahora mismo';
  }
  if (diff < 60000) {
    const seconds = Math.floor(diff / 1000);
    return `Hace ${seconds} segundo${seconds !== 1 ? 's' : ''}`;
  }
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `Hace ${minutes} minuto${minutes !== 1 ? 's' : ''}`;
  }
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `Hace ${hours} hora${hours !== 1 ? 's' : ''}`;
  }
  const days = Math.floor(diff / 86400000);
  return `Hace ${days} día${days !== 1 ? 's' : ''}`;
}

/**
 * Determine GPS status based on location data
 * @param location - Current location or null
 * @returns GPS status
 */
export function getGpsStatus(location: LocationData | null): GpsStatus {
  if (!location) {
    return 'unavailable';
  }

  // If location is too old (more than 30 seconds), consider GPS inactive
  const now = Date.now();
  if (now - location.timestamp > 30000) {
    return 'inactive';
  }

  // If accuracy is very poor, GPS might be inactive
  if (location.accuracy > 100) {
    return 'inactive';
  }

  return 'active';
}

/**
 * Check if location data is valid
 * @param location - Location to validate
 * @returns True if location is valid
 */
export function isValidLocation(location: LocationData | null): boolean {
  if (!location) {
    return false;
  }

  // Check if coordinates are within valid ranges
  if (
    location.latitude < -90 ||
    location.latitude > 90 ||
    location.longitude < -180 ||
    location.longitude > 180
  ) {
    return false;
  }

  // Check if accuracy is reasonable
  if (location.accuracy < 0 || location.accuracy > 10000) {
    return false;
  }

  // Check if timestamp is valid
  if (location.timestamp <= 0 || location.timestamp > Date.now() + 60000) {
    return false;
  }

  return true;
}

/**
 * Get accuracy level description
 * @param accuracy - Accuracy in meters
 * @returns Human-readable accuracy level
 */
export function getAccuracyLevel(
  accuracy: number,
): 'excelente' | 'buena' | 'media' | 'baja' | 'muy baja' {
  if (accuracy <= 5) {
    return 'excelente';
  }
  if (accuracy <= 15) {
    return 'buena';
  }
  if (accuracy <= 50) {
    return 'media';
  }
  if (accuracy <= 100) {
    return 'baja';
  }
  return 'muy baja';
}

/**
 * Validate coordinate values
 * @param latitude - Latitude value
 * @param longitude - Longitude value
 * @returns True if coordinates are valid
 */
export function isValidCoordinate(latitude: number, longitude: number): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

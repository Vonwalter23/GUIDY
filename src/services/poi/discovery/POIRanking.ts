/**
 * GUIDY - POI Ranking
 * Ranks and sorts POIs based on multiple criteria
 * 
 * STAGE 4.2: POI Discovery Engine
 */

import { POI } from '../POITypes';
import { MovementMode } from './DiscoveryTypes';

/**
 * Ranking criteria weights
 */
export interface RankingWeights {
  distance: number; // 0-1
  relevance: number; // 0-1
  quality: number; // 0-1
  category: number; // 0-1
  custom: number; // 0-1
}

/**
 * Default ranking weights
 */
export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  distance: 0.4, // Most important
  relevance: 0.3,
  quality: 0.15,
  category: 0.1,
  custom: 0.05,
};

/**
 * POI Ranking
 * Sorts POIs based on distance, relevance, quality, and category
 */
export class POIRanking {
  private weights: RankingWeights;
  private preferredCategories: string[] = [];
  private preferredSubcategories: string[] = [];
  private movementMode: MovementMode = MovementMode.WALKING;
  private userLatitude: number = 0;
  private userLongitude: number = 0;

  constructor(weights: Partial<RankingWeights> = {}) {
    this.weights = { ...DEFAULT_RANKING_WEIGHTS, ...weights };
  }

  /**
   * Set user location for distance calculations
   */
  setUserLocation(latitude: number, longitude: number): void {
    this.userLatitude = latitude;
    this.userLongitude = longitude;
  }

  /**
   * Set movement mode
   */
  setMovementMode(mode: MovementMode): void {
    this.movementMode = mode;
  }

  /**
   * Set preferred categories (higher priority)
   */
  setPreferredCategories(categories: string[]): void {
    this.preferredCategories = categories;
  }

  /**
   * Set preferred subcategories (higher priority)
   */
  setPreferredSubcategories(subcategories: string[]): void {
    this.preferredSubcategories = subcategories;
  }

  /**
   * Update weights
   */
  setWeights(weights: Partial<RankingWeights>): void {
    this.weights = { ...this.weights, ...weights };
  }

  /**
   * Get current weights
   */
  getWeights(): RankingWeights {
    return { ...this.weights };
  }

  /**
   * Rank and sort POIs
   */
  rank(pois: POI[]): POI[] {
    if (pois.length === 0) {
      return [];
    }

    const scored = pois.map(poi => ({
      poi,
      score: this.calculateScore(poi),
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored.map(item => item.poi);
  }

  /**
   * Calculate composite score for a POI
   */
  private calculateScore(poi: POI): number {
    const distanceScore = this.calculateDistanceScore(poi);
    const relevanceScore = this.calculateRelevanceScore(poi);
    const qualityScore = this.calculateQualityScore(poi);
    const categoryScore = this.calculateCategoryScore(poi);

    // Normalize weights
    const totalWeight =
      this.weights.distance +
      this.weights.relevance +
      this.weights.quality +
      this.weights.category;

    return (
      (distanceScore * this.weights.distance +
        relevanceScore * this.weights.relevance +
        qualityScore * this.weights.quality +
        categoryScore * this.weights.category) /
      totalWeight
    );
  }

  /**
   * Calculate distance score (closer = higher score)
   */
  private calculateDistanceScore(poi: POI): number {
    const distance = poi.distance ?? this.calculateDistance(poi);
    
    // Different max distances based on mode
    const maxDistance = this.getMaxDistanceForMode();
    
    if (distance <= 50) return 1.0;
    if (distance >= maxDistance) return 0.0;
    
    return 1 - distance / maxDistance;
  }

  /**
   * Calculate relevance score
   */
  private calculateRelevanceScore(poi: POI): number {
    let score = 0.5; // Base score

    // Importance from OSM
    if (poi.importance !== undefined) {
      score = Math.max(score, poi.importance);
    }

    // Has description
    if (poi.description) {
      score += 0.1;
    }

    // Has image
    if (poi.imageUrl) {
      score += 0.1;
    }

    // Has Wikipedia reference
    if (poi.metadata?.wikipedia) {
      score += 0.15;
    }

    // Has contact info
    if (poi.phone || poi.website) {
      score += 0.05;
    }

    return Math.min(1, score);
  }

  /**
   * Calculate quality score
   */
  private calculateQualityScore(poi: POI): number {
    let score = 0.5; // Base score

    // Rating
    if (poi.rating !== undefined) {
      score = Math.max(score, poi.rating / 5);
    }

    // Number of ratings (more = more reliable)
    if (poi.ratingCount !== undefined && poi.ratingCount > 10) {
      score += 0.1;
    }

    // Has opening hours
    if (poi.openingHoursText || poi.openingHours) {
      score += 0.1;
    }

    // Accessibility
    if (poi.wheelchairAccessible) {
      score += 0.1;
    }

    // WiFi available
    if (poi.wifi) {
      score += 0.05;
    }

    return Math.min(1, score);
  }

  /**
   * Calculate category score
   */
  private calculateCategoryScore(poi: POI): number {
    let score = 0.5; // Base score

    // Preferred category
    if (
      this.preferredCategories.length > 0 &&
      this.preferredCategories.includes(poi.category)
    ) {
      score += 0.3;
    }

    // Preferred subcategory
    if (
      this.preferredSubcategories.length > 0 &&
      this.preferredSubcategories.includes(poi.subcategory)
    ) {
      score += 0.2;
    }

    return Math.min(1, score);
  }

  /**
   * Get max distance based on movement mode
   */
  private getMaxDistanceForMode(): number {
    switch (this.movementMode) {
      case MovementMode.WALKING:
        return 200; // 200m for walking
      case MovementMode.CYCLING:
        return 500; // 500m for cycling
      case MovementMode.VEHICLE:
        return 1000; // 1000m for vehicle
      default:
        return 300;
    }
  }

  /**
   * Calculate distance from user to POI
   */
  private calculateDistance(poi: POI): number {
    if (poi.distance !== undefined) {
      return poi.distance;
    }

    return this.haversineDistance(
      this.userLatitude,
      this.userLongitude,
      poi.latitude,
      poi.longitude
    );
  }

  /**
   * Haversine distance formula
   */
  private haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371000; // Earth radius in meters
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Sort by distance only
   */
  sortByDistance(pois: POI[], ascending: boolean = true): POI[] {
    return [...pois].sort((a, b) => {
      const distA = a.distance ?? this.calculateDistance(a);
      const distB = b.distance ?? this.calculateDistance(b);
      return ascending ? distA - distB : distB - distA;
    });
  }

  /**
   * Sort by rating only
   */
  sortByRating(pois: POI[], ascending: boolean = false): POI[] {
    return [...pois].sort((a, b) => {
      const ratingA = a.rating ?? 0;
      const ratingB = b.rating ?? 0;
      return ascending ? ratingA - ratingB : ratingB - ratingA;
    });
  }

  /**
   * Sort by category
   */
  sortByCategory(pois: POI[], ascending: boolean = true): POI[] {
    return [...pois].sort((a, b) => {
      const catA = a.category.toLowerCase();
      const catB = b.category.toLowerCase();
      return ascending
        ? catA.localeCompare(catB)
        : catB.localeCompare(catA);
    });
  }

  /**
   * Get top N POIs
   */
  getTopN(pois: POI[], n: number): POI[] {
    return this.rank(pois).slice(0, n);
  }

  /**
   * Get POIs within radius
   */
  getWithinRadius(pois: POI[], radiusMeters: number): POI[] {
    return pois.filter(poi => {
      const distance = poi.distance ?? this.calculateDistance(poi);
      return distance <= radiusMeters;
    });
  }

  /**
   * Get POIs by category
   */
  getByCategory(pois: POI[], category: string): POI[] {
    return pois.filter(poi => poi.category === category);
  }
}

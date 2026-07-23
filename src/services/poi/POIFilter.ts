/**
 * GUIDY - POI Filter
 * Filter POIs by various criteria
 * 
 * STAGE 4.0: POI Engine Architecture
 * 
 * Supports filtering by:
 * - Categories
 * - Subcategories
 * - Distance
 * - Rating
 * - Price level
 * - Wheelchair accessibility
 * - Language
 * - Visited status
 * - Narration availability
 * - Text search
 */

import { POI, POIFilterCriteria, POISortOption } from './POITypes';

/**
 * Debug logging
 */
const DEBUG_FILTER = true;

const log = (message: string, ...data: unknown[]): void => {
  if (DEBUG_FILTER) {
    console.log(`[POI FILTER] ${message}`, ...data);
  }
};

/**
 * POI Filter
 * Applies filter criteria to POI arrays
 */
class POIFilter {
  /**
   * Apply filter criteria to POI array
   */
  apply(pois: POI[], criteria: POIFilterCriteria): POI[] {
    if (!criteria) {
      return pois;
    }
    
    log('Applying filter, initial count:', pois.length);
    
    let filtered = [...pois];
    
    // Category filter
    if (criteria.categories && criteria.categories.length > 0) {
      filtered = filtered.filter(poi => 
        criteria.categories!.includes(poi.category)
      );
      log('After category filter:', filtered.length);
    }
    
    // Subcategory filter
    if (criteria.subcategories && criteria.subcategories.length > 0) {
      filtered = filtered.filter(poi => 
        criteria.subcategories!.includes(poi.subcategory)
      );
      log('After subcategory filter:', filtered.length);
    }
    
    // Distance filter
    if (criteria.maxDistance !== undefined) {
      filtered = filtered.filter(poi => 
        (poi.distance ?? Infinity) <= criteria.maxDistance!
      );
      log('After distance filter:', filtered.length);
    }
    
    // Rating filter
    if (criteria.minRating !== undefined) {
      filtered = filtered.filter(poi => 
        (poi.rating ?? 0) >= criteria.minRating!
      );
      log('After rating filter:', filtered.length);
    }
    
    // Price level filter
    if (criteria.priceLevel !== undefined) {
      filtered = filtered.filter(poi => 
        (poi.priceLevel ?? 0) <= criteria.priceLevel!
      );
      log('After price filter:', filtered.length);
    }
    
    // Wheelchair accessibility filter
    if (criteria.wheelchairAccessible !== undefined) {
      filtered = filtered.filter(poi => 
        poi.wheelchairAccessible === criteria.wheelchairAccessible
      );
      log('After wheelchair filter:', filtered.length);
    }
    
    // Language filter
    if (criteria.language) {
      filtered = filtered.filter(poi => 
        poi.language === criteria.language
      );
      log('After language filter:', filtered.length);
    }
    
    // Visited filter
    if (criteria.hasVisited !== undefined) {
      filtered = filtered.filter(poi => poi.visited === criteria.hasVisited);
      log('After visited filter:', filtered.length);
    }
    
    // Narration filter
    if (criteria.hasNarration !== undefined) {
      filtered = filtered.filter(poi => poi.narrated === criteria.hasNarration);
      log('After narration filter:', filtered.length);
    }
    
    // Text search
    if (criteria.searchText) {
      const searchLower = criteria.searchText.toLowerCase();
      filtered = filtered.filter(poi => 
        poi.name.toLowerCase().includes(searchLower) ||
        poi.displayName.toLowerCase().includes(searchLower) ||
        (poi.description?.toLowerCase().includes(searchLower) ?? false)
      );
      log('After text search:', filtered.length);
    }
    
    log('Final count:', filtered.length);
    return filtered;
  }
  
  /**
   * Sort POIs
   */
  sort(
    pois: POI[],
    sortBy: POISortOption,
    order: 'asc' | 'desc' = 'asc'
  ): POI[] {
    const sorted = [...pois].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case POISortOption.DISTANCE:
          comparison = (a.distance ?? Infinity) - (b.distance ?? Infinity);
          break;
          
        case POISortOption.IMPORTANCE:
          comparison = (a.importance ?? 0) - (b.importance ?? 0);
          break;
          
        case POISortOption.POPULARITY:
          comparison = (a.popularity ?? 0) - (b.popularity ?? 0);
          break;
          
        case POISortOption.NAME:
          comparison = a.name.localeCompare(b.name);
          break;
          
        case POISortOption.RATING:
          comparison = (a.rating ?? 0) - (b.rating ?? 0);
          break;
          
        case POISortOption.RECENCY:
          comparison = (a.lastUpdated ?? 0) - (b.lastUpdated ?? 0);
          break;
          
        default:
          comparison = 0;
      }
      
      return order === 'asc' ? comparison : -comparison;
    });
    
    log(`Sorted by ${sortBy}, order: ${order}`);
    return sorted;
  }
  
  /**
   * Get filter summary
   */
  getFilterSummary(criteria: POIFilterCriteria): string {
    const parts: string[] = [];
    
    if (criteria.categories && criteria.categories.length > 0) {
      parts.push(`Categories: ${criteria.categories.join(', ')}`);
    }
    
    if (criteria.maxDistance) {
      parts.push(`Distance: ≤${this.formatDistance(criteria.maxDistance)}`);
    }
    
    if (criteria.minRating) {
      parts.push(`Rating: ≥${criteria.minRating}`);
    }
    
    if (criteria.searchText) {
      parts.push(`Search: "${criteria.searchText}"`);
    }
    
    if (criteria.hasVisited !== undefined) {
      parts.push(`Visited: ${criteria.hasVisited}`);
    }
    
    return parts.join(' | ') || 'No filters';
  }
  
  /**
   * Format distance for display
   */
  formatDistance(meters: number): string {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  }
  
  /**
   * Group POIs by category
   */
  groupByCategory(pois: POI[]): Map<string, POI[]> {
    const grouped = new Map<string, POI[]>();
    
    for (const poi of pois) {
      const category = poi.category;
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(poi);
    }
    
    return grouped;
  }
  
  /**
   * Get unique categories in POI list
   */
  getCategories(pois: POI[]): string[] {
    return [...new Set(pois.map(p => p.category))];
  }
  
  /**
   * Get distance ranges
   */
  getDistanceRanges(pois: POI[]): {
    label: string;
    maxDistance: number;
    count: number;
  }[] {
    const ranges = [
      { label: 'Very close', maxDistance: 100 },
      { label: 'Close', maxDistance: 500 },
      { label: 'Medium', maxDistance: 1000 },
      { label: 'Far', maxDistance: 5000 },
      { label: 'Very far', maxDistance: Infinity },
    ];
    
    return ranges.map(range => ({
      ...range,
      count: pois.filter(p => (p.distance ?? Infinity) <= range.maxDistance).length,
    }));
  }
}

// Export singleton instance
export const poiFilter = new POIFilter();

// Export class for testing
export { POIFilter };

export default poiFilter;

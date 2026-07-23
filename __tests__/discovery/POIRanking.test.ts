/**
 * POI Ranking Tests
 */

import { POIRanking } from '../../src/services/poi/discovery/POIRanking';
import { MovementMode } from '../../src/services/poi/discovery/DiscoveryTypes';
import { POI } from '../../src/services/poi/POITypes';

describe('POIRanking', () => {
  let ranking: POIRanking;
  
  const createPOI = (overrides: Partial<POI> = {}): POI => ({
    id: `poi-${Math.random().toString(36).substr(2, 9)}`,
    name: 'Test POI',
    category: 'food',
    subcategory: 'restaurant',
    latitude: 40.7128,
    longitude: -74.0060,
    source: 'overpass',
    distance: 100,
    metadata: {},
    ...overrides,
  });

  beforeEach(() => {
    ranking = new POIRanking();
    ranking.setUserLocation(40.7128, -74.0060);
  });

  describe('Constructor', () => {
    it('should initialize with default weights', () => {
      const weights = ranking.getWeights();
      expect(weights.distance).toBeCloseTo(0.4, 1);
      expect(weights.relevance).toBeCloseTo(0.3, 1);
      expect(weights.quality).toBeCloseTo(0.15, 1);
      expect(weights.category).toBeCloseTo(0.1, 1);
    });
  });

  describe('setWeights', () => {
    it('should update weights', () => {
      ranking.setWeights({ distance: 0.5, relevance: 0.4 });
      const weights = ranking.getWeights();
      expect(weights.distance).toBeCloseTo(0.5, 1);
      expect(weights.relevance).toBeCloseTo(0.4, 1);
    });
  });

  describe('setUserLocation', () => {
    it('should update user location', () => {
      ranking.setUserLocation(40.75, -74.01);
      // Verify by ranking POIs
      const poi = createPOI({ latitude: 40.75, longitude: -74.01, distance: 0 });
      const result = ranking.rank([poi]);
      expect(result.length).toBe(1);
    });
  });

  describe('setMovementMode', () => {
    it('should update movement mode', () => {
      ranking.setMovementMode(MovementMode.CYCLING);
      const poi = createPOI({ distance: 100 });
      const result = ranking.rank([poi]);
      expect(result.length).toBe(1);
    });

    it('should support all modes', () => {
      ranking.setMovementMode(MovementMode.WALKING);
      ranking.setMovementMode(MovementMode.CYCLING);
      ranking.setMovementMode(MovementMode.VEHICLE);
    });
  });

  describe('setPreferredCategories', () => {
    it('should set preferred categories', () => {
      ranking.setPreferredCategories(['food', 'attraction']);
      
      const poi1 = createPOI({ id: '1', category: 'food', distance: 200 });
      const poi2 = createPOI({ id: '2', category: 'transport', distance: 50 });
      
      const result = ranking.rank([poi1, poi2]);
      
      // POI2 is closer but POI1 matches preferred category
      // With distance weight 0.4, category 0.1, the closer one should win
      expect(result[0].id).toBe('2');
    });
  });

  describe('rank', () => {
    it('should return empty array for empty input', () => {
      const result = ranking.rank([]);
      expect(result.length).toBe(0);
    });

    it('should rank by distance', () => {
      const poi1 = createPOI({ id: '1', distance: 200 });
      const poi2 = createPOI({ id: '2', distance: 50 });
      const poi3 = createPOI({ id: '3', distance: 100 });
      
      const result = ranking.rank([poi1, poi2, poi3]);
      
      expect(result[0].id).toBe('2'); // Closest
      expect(result[1].id).toBe('3'); // Middle
      expect(result[2].id).toBe('1'); // Farthest
    });

    it('should rank by rating when distance is equal', () => {
      const poi1 = createPOI({ id: '1', distance: 100, rating: 3.0 });
      const poi2 = createPOI({ id: '2', distance: 100, rating: 4.5 });
      
      const result = ranking.rank([poi1, poi2]);
      
      expect(result[0].id).toBe('2'); // Higher rating
    });
  });

  describe('sortByDistance', () => {
    it('should sort ascending by default', () => {
      const poi1 = createPOI({ id: '1', distance: 200 });
      const poi2 = createPOI({ id: '2', distance: 50 });
      
      const result = ranking.sortByDistance([poi1, poi2]);
      
      expect(result[0].id).toBe('2');
      expect(result[1].id).toBe('1');
    });

    it('should sort descending when specified', () => {
      const poi1 = createPOI({ id: '1', distance: 200 });
      const poi2 = createPOI({ id: '2', distance: 50 });
      
      const result = ranking.sortByDistance([poi1, poi2], false);
      
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });
  });

  describe('sortByRating', () => {
    it('should sort descending by default', () => {
      const poi1 = createPOI({ id: '1', rating: 3.0 });
      const poi2 = createPOI({ id: '2', rating: 4.5 });
      
      const result = ranking.sortByRating([poi1, poi2]);
      
      expect(result[0].id).toBe('2');
    });

    it('should sort ascending when specified', () => {
      const poi1 = createPOI({ id: '1', rating: 3.0 });
      const poi2 = createPOI({ id: '2', rating: 4.5 });
      
      const result = ranking.sortByRating([poi1, poi2], true);
      
      expect(result[0].id).toBe('1');
    });
  });

  describe('sortByCategory', () => {
    it('should sort alphabetically', () => {
      const poi1 = createPOI({ id: '1', category: 'food' });
      const poi2 = createPOI({ id: '2', category: 'attraction' });
      
      const result = ranking.sortByCategory([poi1, poi2]);
      
      expect(result[0].category).toBe('attraction');
      expect(result[1].category).toBe('food');
    });
  });

  describe('getTopN', () => {
    it('should return top N POIs', () => {
      const pois = [
        createPOI({ id: '1', distance: 300 }),
        createPOI({ id: '2', distance: 100 }),
        createPOI({ id: '3', distance: 200 }),
        createPOI({ id: '4', distance: 50 }),
      ];
      
      const result = ranking.getTopN(pois, 2);
      
      expect(result.length).toBe(2);
      expect(result[0].distance).toBeLessThan(result[1].distance);
    });

    it('should return all if N >= length', () => {
      const pois = [
        createPOI({ id: '1', distance: 100 }),
        createPOI({ id: '2', distance: 200 }),
      ];
      
      const result = ranking.getTopN(pois, 5);
      
      expect(result.length).toBe(2);
    });
  });

  describe('getWithinRadius', () => {
    it('should filter POIs within radius', () => {
      const pois = [
        createPOI({ id: '1', distance: 50 }),
        createPOI({ id: '2', distance: 150 }),
        createPOI({ id: '3', distance: 300 }),
      ];
      
      const result = ranking.getWithinRadius(pois, 200);
      
      expect(result.length).toBe(2);
      expect(result.find(p => p.id === '1')).toBeDefined();
      expect(result.find(p => p.id === '2')).toBeDefined();
      expect(result.find(p => p.id === '3')).toBeUndefined();
    });
  });

  describe('getByCategory', () => {
    it('should filter by category', () => {
      const pois = [
        createPOI({ id: '1', category: 'food' }),
        createPOI({ id: '2', category: 'attraction' }),
        createPOI({ id: '3', category: 'food' }),
      ];
      
      const result = ranking.getByCategory(pois, 'food');
      
      expect(result.length).toBe(2);
      expect(result.every(p => p.category === 'food')).toBe(true);
    });
  });
});

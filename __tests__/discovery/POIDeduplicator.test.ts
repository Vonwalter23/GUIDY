/**
 * POI Deduplicator Tests
 */

import { POIDeduplicator } from '../../src/services/poi/discovery/POIDeduplicator';
import { POI } from '../../src/services/poi/POITypes';

describe('POIDeduplicator', () => {
  let deduplicator: POIDeduplicator;

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
    deduplicator = new POIDeduplicator();
  });

  describe('Constructor', () => {
    it('should initialize with default options', () => {
      const d = new POIDeduplicator();
      expect(d).toBeDefined();
    });

    it('should accept custom options', () => {
      const d = new POIDeduplicator({
        coordinateThreshold: 20,
        nameSimilarityThreshold: 0.9,
      });
      expect(d).toBeDefined();
    });
  });

  describe('validate', () => {
    it('should validate valid POI', () => {
      const poi = createPOI();
      const result = deduplicator.validate(poi);
      expect(result.valid).toBe(true);
    });

    it('should reject POI without ID', () => {
      const poi = createPOI({ id: '' });
      const result = deduplicator.validate(poi);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Missing ID');
    });

    it('should reject POI without coordinates', () => {
      const poi = createPOI({ latitude: undefined, longitude: undefined } as unknown as POI);
      const result = deduplicator.validate(poi);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Missing coordinates');
    });

    it('should reject POI with invalid latitude', () => {
      const poi = createPOI({ latitude: 100 });
      const result = deduplicator.validate(poi);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Latitude out of range');
    });

    it('should reject POI with invalid longitude', () => {
      const poi = createPOI({ longitude: 200 });
      const result = deduplicator.validate(poi);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Longitude out of range');
    });

    it('should reject POI without category', () => {
      const poi = createPOI({ category: '' });
      const result = deduplicator.validate(poi);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Missing category');
    });
  });

  describe('validateAll', () => {
    it('should return only valid POIs', () => {
      const valid = createPOI();
      const invalid = createPOI({ id: '' });
      
      const result = deduplicator.validateAll([valid, invalid]);
      expect(result.length).toBe(1);
      expect(result[0]).toBe(valid);
    });

    it('should return empty array for all invalid', () => {
      const invalid1 = createPOI({ id: '' });
      const invalid2 = createPOI({ category: '' });
      
      const result = deduplicator.validateAll([invalid1, invalid2]);
      expect(result.length).toBe(0);
    });
  });

  describe('deduplicate', () => {
    it('should return same array for single POI', () => {
      const poi = createPOI();
      const result = deduplicator.deduplicate([poi]);
      expect(result.length).toBe(1);
    });

    it('should return empty array for empty input', () => {
      const result = deduplicator.deduplicate([]);
      expect(result.length).toBe(0);
    });

    it('should remove exact duplicates', () => {
      const poi1 = createPOI({ id: 'same-id' });
      const poi2 = createPOI({ id: 'same-id' });
      
      const result = deduplicator.deduplicate([poi1, poi2]);
      expect(result.length).toBe(1);
    });

    it('should remove nearby duplicates', () => {
      const poi1 = createPOI({
        id: 'poi-1',
        latitude: 40.7128,
        longitude: -74.0060,
        name: 'Restaurant A',
      });
      const poi2 = createPOI({
        id: 'poi-2',
        latitude: 40.712801, // ~0.1 meter away
        longitude: -74.006001,
        name: 'Restaurant A',
      });
      
      const result = deduplicator.deduplicate([poi1, poi2]);
      expect(result.length).toBe(1);
    });

    it('should keep non-duplicate POIs', () => {
      const poi1 = createPOI({
        id: 'poi-1',
        latitude: 40.7128,
        longitude: -74.0060,
        name: 'Restaurant A',
      });
      const poi2 = createPOI({
        id: 'poi-2',
        latitude: 40.7228, // ~1km away
        longitude: -74.0060,
        name: 'Restaurant B',
      });
      
      const result = deduplicator.deduplicate([poi1, poi2]);
      expect(result.length).toBe(2);
    });
  });

  describe('merge', () => {
    it('should merge duplicate POIs', () => {
      const poi1 = createPOI({
        id: 'poi-1',
        name: 'Restaurant',
        rating: 4.0,
        phone: '123-456',
      });
      const poi2 = createPOI({
        id: 'poi-2',
        name: 'Restaurant',
        rating: 4.5,
        website: 'http://example.com',
      });
      
      const result = deduplicator.merge([poi1, poi2]);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Restaurant');
    });

    it('should keep non-merged POIs unchanged', () => {
      const poi1 = createPOI({ id: 'poi-1', name: 'Restaurant A', latitude: 40.7128, longitude: -74.0060 });
      const poi2 = createPOI({ id: 'poi-2', name: 'Food Place', latitude: 40.8128, longitude: -74.0060 });
      
      const result = deduplicator.merge([poi1, poi2]);
      expect(result.length).toBe(2);
    });
  });
});

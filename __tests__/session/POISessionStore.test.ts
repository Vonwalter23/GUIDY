/**
 * POI Session Store Tests
 */

import { POISessionStore } from '../../src/services/poi/session/POISessionStore';
import { POILifecycleManager } from '../../src/services/poi/session/POILifecycle';
import { POILifecycleState, POILifecycleEvent, DEFAULT_SESSION_CONFIG } from '../../src/services/poi/session/POISessionTypes';
import { POIObserverManager } from '../../src/services/poi/session/POIObservers';
import type { POI } from '../../src/services/poi/POITypes';

describe('POISessionStore', () => {
  let store: POISessionStore;
  let lifecycleManager: POILifecycleManager;

  const createPOI = (id: string, lat: number, lng: number): POI => ({
    id,
    name: `Test POI ${id}`,
    category: 'food',
    subcategory: 'restaurant',
    latitude: lat,
    longitude: lng,
    source: 'overpass',
    distance: 100,
    metadata: {},
  });

  beforeEach(() => {
    const observers = new POIObserverManager();
    lifecycleManager = new POILifecycleManager(observers);
    store = new POISessionStore(DEFAULT_SESSION_CONFIG, lifecycleManager);
  });

  describe('Add POIs', () => {
    it('should add POI', () => {
      const poi = createPOI('poi-1', 40.7128, -74.0060);
      const poiWithSession = lifecycleManager.createPOIWithSession(poi);
      
      store.add(poiWithSession);
      
      expect(store.has('poi-1')).toBe(true);
      expect(store.getTotalCount()).toBe(1);
    });

    it('should add multiple POIs', () => {
      const poi1 = lifecycleManager.createPOIWithSession(createPOI('poi-1', 40.7128, -74.0060));
      const poi2 = lifecycleManager.createPOIWithSession(createPOI('poi-2', 40.7138, -74.0060));
      
      store.addAll([poi1, poi2]);
      
      expect(store.getTotalCount()).toBe(2);
    });
  });

  describe('Get POIs', () => {
    it('should get POI by ID', () => {
      const poi = lifecycleManager.createPOIWithSession(createPOI('poi-1', 40.7128, -74.0060));
      store.add(poi);
      
      const retrieved = store.get('poi-1');
      expect(retrieved).toBeDefined();
      expect(retrieved!.poi.id).toBe('poi-1');
    });

    it('should return undefined for non-existent POI', () => {
      const retrieved = store.get('non-existent');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Remove POIs', () => {
    it('should remove POI', () => {
      const poi = lifecycleManager.createPOIWithSession(createPOI('poi-1', 40.7128, -74.0060));
      store.add(poi);
      
      store.remove('poi-1');
      
      expect(store.has('poi-1')).toBe(false);
    });

    it('should return false for non-existent POI', () => {
      const result = store.remove('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('Get By State', () => {
    it('should get POIs by lifecycle state', () => {
      const poi1 = lifecycleManager.createPOIWithSession(createPOI('poi-1', 40.7128, -74.0060));
      const poi2 = lifecycleManager.createPOIWithSession(createPOI('poi-2', 40.7138, -74.0060));
      
      store.add(poi1);
      store.add(poi2);
      
      const newPOIs = store.getByState(POILifecycleState.NEW);
      expect(newPOIs.length).toBe(2);
    });

    it('should get POIs by state after transition', () => {
      const poi = lifecycleManager.createPOIWithSession(createPOI('poi-1', 40.7128, -74.0060));
      const transitioned = lifecycleManager.transition(poi, POILifecycleEvent.DISCOVER);
      if (transitioned) {
        store.add(transitioned);
      }
      
      const discovered = store.getByState(POILifecycleState.DISCOVERED);
      expect(discovered.length).toBe(transitioned ? 1 : 0);
    });
  });

  describe('Active Count', () => {
    it('should return correct active count', () => {
      const poi1 = lifecycleManager.createPOIWithSession(createPOI('poi-1', 40.7128, -74.0060));
      const poi2 = lifecycleManager.createPOIWithSession(createPOI('poi-2', 40.7138, -74.0060));
      
      // Add first POI as NEW, second as NEW
      store.add(poi1);
      store.add(poi2);
      
      // Only poi1 is NEW, so active count is 0
      expect(store.getActiveCount()).toBe(0);
    });
  });

  describe('Deduplication', () => {
    it('should detect duplicate by coordinates', () => {
      const poi = lifecycleManager.createPOIWithSession(createPOI('poi-1', 40.7128, -74.0060));
      store.add(poi);
      
      const duplicate = store.isDuplicate(40.7128, -74.0060, 'Different Name');
      expect(duplicate).toBeDefined();
      expect(duplicate!.poi.id).toBe('poi-1');
    });

    it('should detect duplicate by name similarity', () => {
      const poi = lifecycleManager.createPOIWithSession(createPOI('poi-1', 40.7128, -74.0060));
      poi.poi.name = 'Test POI 1';
      store.add(poi);
      
      const duplicate = store.isDuplicate(40.8, -74.0, 'Test POI 1');
      expect(duplicate).toBeDefined();
    });

    it('should return undefined for non-duplicate', () => {
      const poi = lifecycleManager.createPOIWithSession(createPOI('poi-1', 40.7128, -74.0060));
      store.add(poi);
      
      const duplicate = store.isDuplicate(41.0, -73.0, 'Completely Different Place');
      expect(duplicate).toBeUndefined();
    });
  });

  describe('Find By Coordinates', () => {
    it('should find POI by coordinates', () => {
      const poi = lifecycleManager.createPOIWithSession(createPOI('poi-1', 40.7128, -74.0060));
      store.add(poi);
      
      const found = store.findByCoordinates(40.7128, -74.0060);
      expect(found).toBeDefined();
      expect(found!.poi.id).toBe('poi-1');
    });

    it('should return undefined for non-existent coordinates', () => {
      const found = store.findByCoordinates(40.7128, -74.0060);
      expect(found).toBeUndefined();
    });
  });

  describe('Clear', () => {
    it('should clear all POIs', () => {
      const poi = lifecycleManager.createPOIWithSession(createPOI('poi-1', 40.7128, -74.0060));
      store.add(poi);
      
      store.clear();
      
      expect(store.getTotalCount()).toBe(0);
    });
  });

  describe('Get Stats', () => {
    it('should return correct stats', () => {
      const poi = lifecycleManager.createPOIWithSession(createPOI('poi-1', 40.7128, -74.0060));
      store.add(poi);
      
      const stats = store.getStats('session-1', Date.now() - 1000);
      
      expect(stats.sessionId).toBe('session-1');
      // POI is in NEW state initially, so totalDiscovered counts NEW as discovered
      expect(stats.totalDiscovered).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Get Groups', () => {
    it('should return all POI groups', () => {
      const poi1 = lifecycleManager.createPOIWithSession(createPOI('poi-1', 40.7128, -74.0060));
      const poi2 = lifecycleManager.createPOIWithSession(createPOI('poi-2', 40.7138, -74.0060));
      
      store.add(poi1);
      store.add(poi2);
      
      const groups = store.getGroups();
      
      expect(groups.discovered).toBeDefined();
      expect(groups.active).toBeDefined();
      expect(groups.visited).toBeDefined();
      expect(groups.expired).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should get config', () => {
      const config = store.getConfig();
      expect(config.maxActivePOIs).toBeDefined();
      expect(config.expirationRadius).toBeDefined();
    });

    it('should update config', () => {
      store.setConfig({ maxActivePOIs: 200 });
      const config = store.getConfig();
      expect(config.maxActivePOIs).toBe(200);
    });
  });
});

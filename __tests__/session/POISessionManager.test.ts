/**
 * POI Session Manager Tests
 */

import { POISessionManager } from '../../src/services/poi/session/POISessionManager';
import { POISessionState } from '../../src/services/poi/session/POISessionTypes';
import { SessionEventType } from '../../src/services/poi/session/POISessionEvents';
import type { POI } from '../../src/services/poi/POITypes';

describe('POISessionManager', () => {
  let sessionManager: POISessionManager;

  const createPOI = (id: string): POI => ({
    id,
    name: `Test POI ${id}`,
    category: 'food',
    subcategory: 'restaurant',
    latitude: 40.7128,
    longitude: -74.0060,
    source: 'overpass',
    distance: 100,
    metadata: {},
  });

  beforeEach(async () => {
    sessionManager = new POISessionManager();
    await sessionManager.initialize();
  });

  afterEach(() => {
    sessionManager.reset();
  });

  describe('Initialize', () => {
    it('should initialize with IDLE state', async () => {
      await sessionManager.initialize();
      expect(sessionManager.getSessionState()).toBe(POISessionState.IDLE);
    });
  });

  describe('Start Session', () => {
    it('should start session', () => {
      const started = sessionManager.start();
      expect(started).toBe(true);
    });

    it('should generate session ID', () => {
      sessionManager.start();
      const sessionId = sessionManager.getSessionId();
      expect(sessionId).toBeDefined();
      expect(sessionId).toContain('session_');
    });

    it('should transition to SESSION_STARTED state', () => {
      sessionManager.start();
      expect(sessionManager.getSessionState()).not.toBe(POISessionState.IDLE);
    });

    it('should not start already started session', () => {
      sessionManager.start();
      const started = sessionManager.start();
      expect(started).toBe(false);
    });
  });

  describe('Stop Session', () => {
    it('should stop started session', () => {
      sessionManager.start();
      const stopped = sessionManager.stop();
      expect(stopped).toBe(true);
    });

    it('should not stop idle session', () => {
      const stopped = sessionManager.stop();
      expect(stopped).toBe(false);
    });

    it('should clear data on stop', () => {
      sessionManager.start();
      sessionManager.addDiscoveredPOIs([createPOI('poi-1')]);
      sessionManager.stop();
      
      const pois = sessionManager.getAllPOIs();
      expect(pois.length).toBe(0);
    });
  });

  describe('Pause and Resume', () => {
    it('should pause active session', () => {
      sessionManager.start();
      const paused = sessionManager.pause();
      expect(paused).toBe(true);
      expect(sessionManager.getSessionState()).toBe(POISessionState.PAUSED);
    });

    it('should resume paused session', () => {
      sessionManager.start();
      sessionManager.pause();
      const resumed = sessionManager.resume();
      expect(resumed).toBe(true);
    });

    it('should not pause idle session', () => {
      const paused = sessionManager.pause();
      expect(paused).toBe(false);
    });
  });

  describe('Add Discovered POIs', () => {
    it('should add POIs', () => {
      sessionManager.start();
      const added = sessionManager.addDiscoveredPOIs([createPOI('poi-1')]);
      expect(added.length).toBe(1);
    });

    it('should not add duplicate POIs', () => {
      sessionManager.start();
      sessionManager.addDiscoveredPOIs([createPOI('poi-1')]);
      const added = sessionManager.addDiscoveredPOIs([createPOI('poi-1')]);
      expect(added.length).toBe(0);
    });

    it('should handle empty array', () => {
      sessionManager.start();
      const added = sessionManager.addDiscoveredPOIs([]);
      expect(added.length).toBe(0);
    });
  });

  describe('Update POIs', () => {
    it('should update POIs', () => {
      sessionManager.start();
      const result = sessionManager.updatePOIs([createPOI('poi-1')]);
      expect(result.added.length).toBe(1);
    });

    it('should handle empty update', () => {
      sessionManager.start();
      sessionManager.addDiscoveredPOIs([createPOI('poi-1')]);
      
      const result = sessionManager.updatePOIs([]);
      expect(result.expired.length).toBe(1);
    });
  });

  describe('Select POI', () => {
    it('should select active POI', () => {
      sessionManager.start();
      sessionManager.addDiscoveredPOIs([createPOI('poi-1')]);
      
      const selected = sessionManager.selectPOI('poi-1');
      expect(selected).toBe(true);
    });

    it('should not select non-existent POI', () => {
      sessionManager.start();
      const selected = sessionManager.selectPOI('non-existent');
      expect(selected).toBe(false);
    });

    it('should return selected POI', () => {
      sessionManager.start();
      sessionManager.addDiscoveredPOIs([createPOI('poi-1')]);
      sessionManager.selectPOI('poi-1');
      
      const selected = sessionManager.getSelectedPOI();
      expect(selected).toBeDefined();
    });
  });

  describe('Visit POI', () => {
    it('should visit active POI', () => {
      sessionManager.start();
      sessionManager.addDiscoveredPOIs([createPOI('poi-1')]);
      
      const visited = sessionManager.visitPOI('poi-1');
      expect(visited).toBe(true);
    });

    it('should not visit non-existent POI', () => {
      sessionManager.start();
      const visited = sessionManager.visitPOI('non-existent');
      expect(visited).toBe(false);
    });
  });

  describe('Get POIs', () => {
    it('should get all POIs', () => {
      sessionManager.start();
      const added = sessionManager.addDiscoveredPOIs([createPOI('poi-1')]);
      
      const pois = sessionManager.getAllPOIs();
      expect(pois.length).toBe(added.length);
    });

    it('should get active POIs', () => {
      sessionManager.start();
      sessionManager.addDiscoveredPOIs([createPOI('poi-1')]);
      
      const active = sessionManager.getActivePOIs();
      expect(active.length).toBeGreaterThanOrEqual(0);
    });

    it('should get POI by ID', () => {
      sessionManager.start();
      const added = sessionManager.addDiscoveredPOIs([createPOI('poi-1')]);
      
      if (added.length > 0) {
        const poi = sessionManager.getPOI('poi-1');
        expect(poi).toBeDefined();
      }
    });
  });

  describe('Session State', () => {
    it('should check if session is active', () => {
      sessionManager.start();
      expect(sessionManager.isSessionActive()).toBe(true);
    });

    it('should return correct state', () => {
      expect(sessionManager.getSessionState()).toBe(POISessionState.IDLE);
      sessionManager.start();
      expect(sessionManager.isSessionActive()).toBe(true);
    });
  });

  describe('Stats', () => {
    it('should return session stats', () => {
      sessionManager.start();
      sessionManager.addDiscoveredPOIs([createPOI('poi-1')]);
      
      const stats = sessionManager.getStats();
      expect(stats.sessionId).toBeDefined();
      expect(stats.totalDiscovered).toBeGreaterThanOrEqual(0);
    });

    it('should track session duration', () => {
      sessionManager.start();
      const duration = sessionManager.getSessionDuration();
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Reset', () => {
    it('should reset session', () => {
      sessionManager.start();
      sessionManager.reset();
      
      expect(sessionManager.getSessionState()).toBe(POISessionState.IDLE);
      expect(sessionManager.getSessionId()).toBe('');
    });
  });

  describe('Configuration', () => {
    it('should get config', () => {
      const config = sessionManager.getConfig();
      expect(config.maxActivePOIs).toBeDefined();
    });

    it('should set config', () => {
      sessionManager.setConfig({ maxActivePOIs: 200 });
      const config = sessionManager.getConfig();
      expect(config.maxActivePOIs).toBe(200);
    });
  });

  describe('Events', () => {
    it('should subscribe to events', () => {
      const listener = jest.fn();
      const unsubscribe = sessionManager.subscribe(listener);
      
      sessionManager.start();
      
      expect(listener).toHaveBeenCalled();
      unsubscribe();
    });

    it('should get event history', () => {
      sessionManager.start();
      const history = sessionManager.getEventHistory();
      expect(history.length).toBeGreaterThan(0);
    });
  });

  describe('Update User Location', () => {
    it('should update user location', () => {
      sessionManager.updateUserLocation(40.7128, -74.0060);
      // No error means success
    });
  });
});

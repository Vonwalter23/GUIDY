/**
 * POI Lifecycle Tests
 */

import { POILifecycleManager } from '../../src/services/poi/session/POILifecycle';
import { POILifecycleState, POILifecycleEvent } from '../../src/services/poi/session/POISessionTypes';
import { POIObserverManager } from '../../src/services/poi/session/POIObservers';
import type { POI } from '../../src/services/poi/POITypes';

describe('POILifecycleManager', () => {
  let lifecycleManager: POILifecycleManager;
  let observers: POIObserverManager;

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

  beforeEach(() => {
    observers = new POIObserverManager();
    lifecycleManager = new POILifecycleManager(observers, 'test-session');
  });

  describe('Create POI With Session', () => {
    it('should create POI with NEW state', () => {
      const poi = createPOI('poi-1');
      const poiWithSession = lifecycleManager.createPOIWithSession(poi);
      
      expect(poiWithSession.lifecycleState).toBe(POILifecycleState.NEW);
      expect(poiWithSession.poi.id).toBe('poi-1');
      expect(poiWithSession.discoveredAt).toBeDefined();
      expect(poiWithSession.visitCount).toBe(0);
    });

    it('should set session ID', () => {
      lifecycleManager.setSessionId('new-session-id');
      const poi = createPOI('poi-1');
      const poiWithSession = lifecycleManager.createPOIWithSession(poi);
      expect(poiWithSession.discoveredAt).toBeDefined();
    });
  });

  describe('Lifecycle Transitions', () => {
    it('should transition from NEW to DISCOVERED', () => {
      const poi = createPOI('poi-1');
      let poiWithSession = lifecycleManager.createPOIWithSession(poi);
      
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.DISCOVER);
      
      expect(poiWithSession).not.toBeNull();
      expect(poiWithSession!.lifecycleState).toBe(POILifecycleState.DISCOVERED);
    });

    it('should transition from DISCOVERED to ACTIVE', () => {
      const poi = createPOI('poi-1');
      let poiWithSession = lifecycleManager.createPOIWithSession(poi);
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.DISCOVER);
      
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.ACTIVATE);
      
      expect(poiWithSession).not.toBeNull();
      expect(poiWithSession!.lifecycleState).toBe(POILifecycleState.ACTIVE);
    });

    it('should transition from ACTIVE to SELECTED', () => {
      const poi = createPOI('poi-1');
      let poiWithSession = lifecycleManager.createPOIWithSession(poi);
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.DISCOVER);
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.ACTIVATE);
      
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.SELECT);
      
      expect(poiWithSession).not.toBeNull();
      expect(poiWithSession!.lifecycleState).toBe(POILifecycleState.SELECTED);
    });

    it('should transition from SELECTED to VISITED', () => {
      const poi = createPOI('poi-1');
      let poiWithSession = lifecycleManager.createPOIWithSession(poi);
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.DISCOVER);
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.ACTIVATE);
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.SELECT);
      
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.VISIT);
      
      expect(poiWithSession).not.toBeNull();
      expect(poiWithSession!.lifecycleState).toBe(POILifecycleState.VISITED);
      expect(poiWithSession!.visitCount).toBe(1);
    });

    it('should transition from VISITED to ARCHIVED', () => {
      const poi = createPOI('poi-1');
      let poiWithSession = lifecycleManager.createPOIWithSession(poi);
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.DISCOVER);
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.ACTIVATE);
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.VISIT);
      
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.ARCHIVE);
      
      expect(poiWithSession).not.toBeNull();
      expect(poiWithSession!.lifecycleState).toBe(POILifecycleState.ARCHIVED);
    });
  });

  describe('Invalid Transitions', () => {
    it('should not transition from NEW directly to ACTIVE', () => {
      const poi = createPOI('poi-1');
      let poiWithSession = lifecycleManager.createPOIWithSession(poi);
      
      const result = lifecycleManager.transition(poiWithSession, POILifecycleEvent.ACTIVATE);
      
      expect(result).toBeNull();
    });

    it('should not transition from NEW to VISITED', () => {
      const poi = createPOI('poi-1');
      let poiWithSession = lifecycleManager.createPOIWithSession(poi);
      
      const result = lifecycleManager.transition(poiWithSession, POILifecycleEvent.VISIT);
      
      expect(result).toBeNull();
    });

    it('should not transition from EXPIRED to ACTIVE', () => {
      const poi = createPOI('poi-1');
      let poiWithSession = lifecycleManager.createPOIWithSession(poi);
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.DISCOVER);
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.EXPIRE);
      
      const result = lifecycleManager.transition(poiWithSession, POILifecycleEvent.ACTIVATE);
      
      expect(result).toBeNull();
    });
  });

  describe('Timestamps', () => {
    it('should set activatedAt on ACTIVATE', () => {
      const poi = createPOI('poi-1');
      let poiWithSession = lifecycleManager.createPOIWithSession(poi);
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.DISCOVER);
      
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.ACTIVATE);
      
      expect(poiWithSession!.activatedAt).toBeDefined();
    });

    it('should set selectedAt on SELECT', () => {
      const poi = createPOI('poi-1');
      let poiWithSession = lifecycleManager.createPOIWithSession(poi);
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.DISCOVER);
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.ACTIVATE);
      
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.SELECT);
      
      expect(poiWithSession!.selectedAt).toBeDefined();
    });

    it('should clear selectedAt on DESELECT', () => {
      const poi = createPOI('poi-1');
      let poiWithSession = lifecycleManager.createPOIWithSession(poi);
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.DISCOVER);
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.ACTIVATE);
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.SELECT);
      
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.DESELECT);
      
      expect(poiWithSession!.selectedAt).toBeUndefined();
    });

    it('should set visitedAt on VISIT', () => {
      const poi = createPOI('poi-1');
      let poiWithSession = lifecycleManager.createPOIWithSession(poi);
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.DISCOVER);
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.ACTIVATE);
      
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.VISIT);
      
      expect(poiWithSession!.visitedAt).toBeDefined();
    });
  });

  describe('Can Transition', () => {
    it('should return true for valid transition', () => {
      expect(lifecycleManager.canTransition(POILifecycleState.NEW, POILifecycleEvent.DISCOVER)).toBe(true);
    });

    it('should return false for invalid transition', () => {
      expect(lifecycleManager.canTransition(POILifecycleState.NEW, POILifecycleEvent.ACTIVATE)).toBe(false);
    });
  });

  describe('State Checks', () => {
    it('should check isTerminalState for EXPIRED', () => {
      expect(lifecycleManager.isTerminalState(POILifecycleState.EXPIRED)).toBe(true);
    });

    it('should check isTerminalState for ARCHIVED', () => {
      expect(lifecycleManager.isTerminalState(POILifecycleState.ARCHIVED)).toBe(true);
    });

    it('should check isActive correctly', () => {
      const poi = createPOI('poi-1');
      let poiWithSession = lifecycleManager.createPOIWithSession(poi);
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.DISCOVER);
      
      expect(lifecycleManager.isActive(poiWithSession)).toBe(false);
      
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.ACTIVATE);
      
      expect(lifecycleManager.isActive(poiWithSession)).toBe(true);
    });

    it('should check isVisited correctly', () => {
      const poi = createPOI('poi-1');
      let poiWithSession = lifecycleManager.createPOIWithSession(poi);
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.DISCOVER);
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.ACTIVATE);
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.VISIT);
      
      expect(lifecycleManager.isVisited(poiWithSession)).toBe(true);
    });
  });

  describe('Visit Count', () => {
    it('should increment visit count', () => {
      const poi = createPOI('poi-1');
      let poiWithSession = lifecycleManager.createPOIWithSession(poi);
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.DISCOVER);
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.ACTIVATE);
      
      poiWithSession = lifecycleManager.transition(poiWithSession, POILifecycleEvent.VISIT);
      
      expect(poiWithSession!.visitCount).toBe(1);
    });
  });
});

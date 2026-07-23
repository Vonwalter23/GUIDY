/**
 * POI Observers Tests
 */

import { POIObserverManager } from '../../src/services/poi/session/POIObservers';
import { SessionEventType } from '../../src/services/poi/session/POISessionEvents';
import { POILifecycleState } from '../../src/services/poi/session/POISessionTypes';

describe('POIObserverManager', () => {
  let observers: POIObserverManager;

  beforeEach(() => {
    observers = new POIObserverManager();
  });

  describe('Subscribe', () => {
    it('should add listener', () => {
      const listener = jest.fn();
      const unsubscribe = observers.subscribe(listener);
      
      expect(observers.getObserverCount()).toBe(1);
      unsubscribe();
    });

    it('should remove listener on unsubscribe', () => {
      const listener = jest.fn();
      const unsubscribe = observers.subscribe(listener);
      unsubscribe();
      
      expect(observers.getObserverCount()).toBe(0);
    });

    it('should receive events', () => {
      const listener = jest.fn();
      observers.subscribe(listener);
      
      observers.emit({
        type: SessionEventType.SESSION_STARTED,
        sessionId: 'test',
        timestamp: Date.now(),
      });
      
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Subscribe Once', () => {
    it('should auto-unsubscribe after event', () => {
      const listener = jest.fn();
      observers.subscribeOnce(listener);
      
      observers.emit({
        type: SessionEventType.SESSION_STARTED,
        sessionId: 'test',
        timestamp: Date.now(),
      });
      
      observers.emit({
        type: SessionEventType.SESSION_STOPPED,
        sessionId: 'test',
        duration: 1000,
        timestamp: Date.now(),
      });
      
      expect(listener).toHaveBeenCalledTimes(1);
      expect(observers.getObserverCount()).toBe(0);
    });
  });

  describe('Event Filtering', () => {
    it('should filter by event type', () => {
      const listener = jest.fn();
      observers.subscribe(listener, { eventTypes: [SessionEventType.SESSION_STARTED] });
      
      observers.emit({
        type: SessionEventType.SESSION_STARTED,
        sessionId: 'test',
        timestamp: Date.now(),
      });
      
      observers.emit({
        type: SessionEventType.SESSION_STOPPED,
        sessionId: 'test',
        duration: 1000,
        timestamp: Date.now(),
      });
      
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('should filter by POI ID', () => {
      const listener = jest.fn();
      observers.subscribe(listener, { poiIds: ['poi-1'] });
      
      observers.emit({
        type: SessionEventType.POI_DISCOVERED,
        poi: {
          poi: { id: 'poi-1' },
          lifecycleState: POILifecycleState.DISCOVERED,
          discoveredAt: Date.now(),
          visitCount: 0,
        } as any,
        timestamp: Date.now(),
      });
      
      observers.emit({
        type: SessionEventType.POI_DISCOVERED,
        poi: {
          poi: { id: 'poi-2' },
          lifecycleState: POILifecycleState.DISCOVERED,
          discoveredAt: Date.now(),
          visitCount: 0,
        } as any,
        timestamp: Date.now(),
      });
      
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event History', () => {
    it('should record events', () => {
      observers.emit({
        type: SessionEventType.SESSION_STARTED,
        sessionId: 'test',
        timestamp: Date.now(),
      });
      
      const history = observers.getHistory();
      expect(history.length).toBe(1);
    });

    it('should limit history size', () => {
      for (let i = 0; i < 150; i++) {
        observers.emit({
          type: SessionEventType.SESSION_STATE_CHANGED,
          sessionId: 'test',
          previousState: 'IDLE' as any,
          currentState: 'ACTIVE' as any,
          timestamp: Date.now(),
        });
      }
      
      const history = observers.getHistory();
      expect(history.length).toBeLessThanOrEqual(100);
    });

    it('should get events by type', () => {
      observers.emit({
        type: SessionEventType.SESSION_STARTED,
        sessionId: 'test',
        timestamp: Date.now(),
      });
      
      observers.emit({
        type: SessionEventType.SESSION_STOPPED,
        sessionId: 'test',
        duration: 1000,
        timestamp: Date.now(),
      });
      
      const startedEvents = observers.getEventsByType(SessionEventType.SESSION_STARTED);
      expect(startedEvents.length).toBe(1);
    });

    it('should clear history', () => {
      observers.emit({
        type: SessionEventType.SESSION_STARTED,
        sessionId: 'test',
        timestamp: Date.now(),
      });
      
      observers.clearHistory();
      
      const history = observers.getHistory();
      expect(history.length).toBe(0);
    });
  });

  describe('Get Recent Events', () => {
    it('should return recent events', () => {
      for (let i = 0; i < 15; i++) {
        observers.emit({
          type: SessionEventType.SESSION_STATE_CHANGED,
          sessionId: 'test',
          previousState: 'IDLE' as any,
          currentState: 'ACTIVE' as any,
          timestamp: Date.now(),
        });
      }
      
      const recent = observers.getRecentEvents(5);
      expect(recent.length).toBe(5);
    });
  });

  describe('Unsubscribe All', () => {
    it('should remove all listeners', () => {
      observers.subscribe(jest.fn());
      observers.subscribe(jest.fn());
      observers.subscribe(jest.fn());
      
      expect(observers.getObserverCount()).toBe(3);
      
      observers.unsubscribeAll();
      
      expect(observers.getObserverCount()).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should not crash on listener error', () => {
      const badListener = () => {
        throw new Error('Test error');
      };
      
      const goodListener = jest.fn();
      
      observers.subscribe(badListener);
      observers.subscribe(goodListener);
      
      observers.emit({
        type: SessionEventType.SESSION_STARTED,
        sessionId: 'test',
        timestamp: Date.now(),
      });
      
      expect(goodListener).toHaveBeenCalledTimes(1);
    });
  });
});

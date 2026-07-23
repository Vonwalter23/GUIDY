/**
 * POI Session State Machine Tests
 */

import { POISessionStateMachine } from '../../src/services/poi/session/POISessionStateMachine';
import { POISessionState, POISessionEvent } from '../../src/services/poi/session/POISessionTypes';

describe('POISessionStateMachine', () => {
  let stateMachine: POISessionStateMachine;

  beforeEach(() => {
    stateMachine = new POISessionStateMachine();
  });

  describe('Initial State', () => {
    it('should start in IDLE state', () => {
      expect(stateMachine.getState()).toBe(POISessionState.IDLE);
    });

    it('should not be running initially', () => {
      expect(stateMachine.isRunning()).toBe(false);
    });

    it('should not be active initially', () => {
      expect(stateMachine.isActive()).toBe(false);
    });
  });

  describe('Session Start', () => {
    it('should transition from IDLE to SESSION_STARTED on START', () => {
      stateMachine.sendEvent(POISessionEvent.START);
      expect(stateMachine.getState()).toBe(POISessionState.SESSION_STARTED);
    });

    it('should set session ID on start', () => {
      stateMachine.setSessionId('test-session-123');
      expect(stateMachine.getSessionId()).toBe('test-session-123');
    });
  });

  describe('Session Flow', () => {
    it('should complete full session flow', () => {
      // Start
      stateMachine.sendEvent(POISessionEvent.START);
      expect(stateMachine.getState()).toBe(POISessionState.SESSION_STARTED);

      // Update to DISCOVERING
      stateMachine.sendEvent(POISessionEvent.UPDATE);
      expect(stateMachine.getState()).toBe(POISessionState.DISCOVERING);

      // Update to ACTIVE
      stateMachine.sendEvent(POISessionEvent.UPDATE);
      expect(stateMachine.getState()).toBe(POISessionState.ACTIVE);

      // Pause
      stateMachine.sendEvent(POISessionEvent.PAUSE);
      expect(stateMachine.getState()).toBe(POISessionState.PAUSED);

      // Resume
      stateMachine.sendEvent(POISessionEvent.RESUME);
      expect(stateMachine.getState()).toBe(POISessionState.ACTIVE);

      // Stop
      stateMachine.sendEvent(POISessionEvent.STOP);
      expect(stateMachine.getState()).toBe(POISessionState.FINISHED);
    });

    it('should transition to UPDATING from ACTIVE', () => {
      stateMachine.sendEvent(POISessionEvent.START);
      stateMachine.sendEvent(POISessionEvent.UPDATE);
      stateMachine.sendEvent(POISessionEvent.UPDATE);
      
      expect(stateMachine.getState()).toBe(POISessionState.ACTIVE);
      
      // Update should transition to UPDATING
      const result = stateMachine.sendEvent(POISessionEvent.UPDATE);
      expect(result).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should transition to ERROR state', () => {
      stateMachine.sendEvent(POISessionEvent.START);
      stateMachine.sendEvent(POISessionEvent.ERROR);
      expect(stateMachine.getState()).toBe(POISessionState.ERROR);
    });

    it('should have error state', () => {
      stateMachine.sendEvent(POISessionEvent.START);
      stateMachine.sendEvent(POISessionEvent.ERROR);
      expect(stateMachine.hasError()).toBe(true);
    });

    it('should reset from ERROR to IDLE', () => {
      stateMachine.sendEvent(POISessionEvent.START);
      stateMachine.sendEvent(POISessionEvent.ERROR);
      stateMachine.sendEvent(POISessionEvent.RESET);
      expect(stateMachine.getState()).toBe(POISessionState.IDLE);
    });
  });

  describe('Invalid Transitions', () => {
    it('should not transition from IDLE with PAUSE', () => {
      const result = stateMachine.sendEvent(POISessionEvent.PAUSE);
      expect(result).toBe(false);
      expect(stateMachine.getState()).toBe(POISessionState.IDLE);
    });

    it('should not transition from IDLE with RESUME', () => {
      const result = stateMachine.sendEvent(POISessionEvent.RESUME);
      expect(result).toBe(false);
    });

    it('should not transition from FINISHED with PAUSE', () => {
      stateMachine.sendEvent(POISessionEvent.START);
      stateMachine.sendEvent(POISessionEvent.UPDATE);
      stateMachine.sendEvent(POISessionEvent.UPDATE);
      stateMachine.sendEvent(POISessionEvent.STOP);
      // FINISHED only allows RESET
      const result = stateMachine.sendEvent(POISessionEvent.PAUSE);
      expect(result).toBe(false);
    });
  });

  describe('State Checks', () => {
    it('should check isRunning correctly', () => {
      expect(stateMachine.isRunning()).toBe(false);
      stateMachine.sendEvent(POISessionEvent.START);
      expect(stateMachine.isRunning()).toBe(true);
    });

    it('should check isPaused correctly', () => {
      stateMachine.sendEvent(POISessionEvent.START);
      stateMachine.sendEvent(POISessionEvent.UPDATE);
      stateMachine.sendEvent(POISessionEvent.UPDATE);
      expect(stateMachine.isPaused()).toBe(false);
      stateMachine.sendEvent(POISessionEvent.PAUSE);
      expect(stateMachine.isPaused()).toBe(true);
    });

    it('should check isFinished correctly', () => {
      stateMachine.sendEvent(POISessionEvent.START);
      stateMachine.sendEvent(POISessionEvent.UPDATE);
      stateMachine.sendEvent(POISessionEvent.UPDATE);
      stateMachine.sendEvent(POISessionEvent.STOP);
      expect(stateMachine.isFinished()).toBe(true);
    });

    it('should check isActive correctly', () => {
      stateMachine.sendEvent(POISessionEvent.START);
      expect(stateMachine.isActive()).toBe(false);
      stateMachine.sendEvent(POISessionEvent.UPDATE);
      expect(stateMachine.isActive()).toBe(true);
    });
  });

  describe('Get Valid Events', () => {
    it('should return valid events for IDLE state', () => {
      const events = stateMachine.getValidEvents();
      expect(events).toContain(POISessionEvent.START);
      expect(events).not.toContain(POISessionEvent.PAUSE);
    });

    it('should return valid events for ACTIVE state', () => {
      stateMachine.sendEvent(POISessionEvent.START);
      stateMachine.sendEvent(POISessionEvent.UPDATE);
      stateMachine.sendEvent(POISessionEvent.UPDATE);
      const events = stateMachine.getValidEvents();
      expect(events).toContain(POISessionEvent.PAUSE);
      expect(events).toContain(POISessionEvent.STOP);
      expect(events).toContain(POISessionEvent.UPDATE);
    });
  });

  describe('Can Transition', () => {
    it('should return true for valid transition', () => {
      expect(stateMachine.canTransition(POISessionEvent.START)).toBe(true);
    });

    it('should return false for invalid transition', () => {
      expect(stateMachine.canTransition(POISessionEvent.PAUSE)).toBe(false);
    });
  });

  describe('State History', () => {
    it('should record state changes', () => {
      stateMachine.sendEvent(POISessionEvent.START);
      const history = stateMachine.getHistory();
      expect(history.length).toBeGreaterThan(0);
    });

    it('should track timestamps', () => {
      const before = Date.now();
      stateMachine.sendEvent(POISessionEvent.START);
      const after = Date.now();
      const history = stateMachine.getHistory();
      expect(history[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(history[0].timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('Time In State', () => {
    it('should return time since state change', async () => {
      stateMachine.sendEvent(POISessionEvent.START);
      await new Promise(resolve => setTimeout(resolve, 50));
      const time = stateMachine.getTimeInState();
      expect(time).toBeGreaterThanOrEqual(40);
    });
  });

  describe('Reset', () => {
    it('should reset to IDLE state', () => {
      stateMachine.sendEvent(POISessionEvent.START);
      stateMachine.sendEvent(POISessionEvent.UPDATE);
      stateMachine.reset();
      expect(stateMachine.getState()).toBe(POISessionState.IDLE);
    });
  });

  describe('State Description', () => {
    it('should return description for IDLE', () => {
      expect(stateMachine.getStateDescription()).toContain('not started');
    });

    it('should return description for ACTIVE', () => {
      stateMachine.sendEvent(POISessionEvent.START);
      stateMachine.sendEvent(POISessionEvent.UPDATE);
      stateMachine.sendEvent(POISessionEvent.UPDATE);
      expect(stateMachine.getStateDescription()).toContain('active');
    });

    it('should return description for PAUSED', () => {
      stateMachine.sendEvent(POISessionEvent.START);
      stateMachine.sendEvent(POISessionEvent.UPDATE);
      stateMachine.sendEvent(POISessionEvent.UPDATE);
      stateMachine.sendEvent(POISessionEvent.PAUSE);
      expect(stateMachine.getStateDescription()).toContain('paused');
    });
  });
});

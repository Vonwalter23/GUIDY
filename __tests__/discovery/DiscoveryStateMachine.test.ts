/**
 * Discovery State Machine Tests
 */

import { DiscoveryStateMachine } from '../../src/services/poi/discovery/DiscoveryStateMachine';
import { DiscoveryState, DiscoveryEvent } from '../../src/services/poi/discovery/DiscoveryTypes';

describe('DiscoveryStateMachine', () => {
  let stateMachine: DiscoveryStateMachine;

  beforeEach(() => {
    stateMachine = new DiscoveryStateMachine();
  });

  describe('Initial State', () => {
    it('should start in IDLE state', () => {
      expect(stateMachine.getState()).toBe(DiscoveryState.IDLE);
    });

    it('should be idle initially', () => {
      expect(stateMachine.isIdle()).toBe(true);
    });
  });

  describe('State Transitions', () => {
    it('should transition from IDLE to WAITING_MOVEMENT on START', () => {
      stateMachine.sendEvent(DiscoveryEvent.START);
      expect(stateMachine.getState()).toBe(DiscoveryState.WAITING_MOVEMENT);
    });

    it('should transition from WAITING_MOVEMENT to WAITING_COOLDOWN on MOVEMENT_THRESHOLD_EXCEEDED', () => {
      stateMachine.sendEvent(DiscoveryEvent.START);
      stateMachine.sendEvent(DiscoveryEvent.MOVEMENT_THRESHOLD_EXCEEDED);
      expect(stateMachine.getState()).toBe(DiscoveryState.WAITING_COOLDOWN);
    });

    it('should transition from WAITING_COOLDOWN to SEARCHING on COOLDOWN_COMPLETE', () => {
      stateMachine.sendEvent(DiscoveryEvent.START);
      stateMachine.sendEvent(DiscoveryEvent.MOVEMENT_THRESHOLD_EXCEEDED);
      stateMachine.sendEvent(DiscoveryEvent.COOLDOWN_COMPLETE);
      expect(stateMachine.getState()).toBe(DiscoveryState.SEARCHING);
    });

    it('should transition from SEARCHING to RESULTS_READY on SEARCH_COMPLETE', () => {
      stateMachine.sendEvent(DiscoveryEvent.START);
      stateMachine.sendEvent(DiscoveryEvent.MOVEMENT_THRESHOLD_EXCEEDED);
      stateMachine.sendEvent(DiscoveryEvent.COOLDOWN_COMPLETE);
      stateMachine.sendEvent(DiscoveryEvent.SEARCH_COMPLETE);
      expect(stateMachine.getState()).toBe(DiscoveryState.RESULTS_READY);
    });

    it('should transition from SEARCHING to USING_CACHE on CACHE_HIT', () => {
      stateMachine.sendEvent(DiscoveryEvent.START);
      stateMachine.sendEvent(DiscoveryEvent.MOVEMENT_THRESHOLD_EXCEEDED);
      stateMachine.sendEvent(DiscoveryEvent.COOLDOWN_COMPLETE);
      stateMachine.sendEvent(DiscoveryEvent.CACHE_HIT);
      expect(stateMachine.getState()).toBe(DiscoveryState.USING_CACHE);
    });

    it('should transition to ERROR on ERROR event', () => {
      stateMachine.sendEvent(DiscoveryEvent.START);
      stateMachine.sendEvent(DiscoveryEvent.MOVEMENT_THRESHOLD_EXCEEDED);
      stateMachine.sendEvent(DiscoveryEvent.COOLDOWN_COMPLETE);
      stateMachine.sendEvent(DiscoveryEvent.ERROR);
      expect(stateMachine.getState()).toBe(DiscoveryState.ERROR);
    });

    it('should transition to OFFLINE on NETWORK_OFFLINE', () => {
      stateMachine.sendEvent(DiscoveryEvent.START);
      stateMachine.sendEvent(DiscoveryEvent.MOVEMENT_THRESHOLD_EXCEEDED);
      stateMachine.sendEvent(DiscoveryEvent.COOLDOWN_COMPLETE);
      stateMachine.sendEvent(DiscoveryEvent.NETWORK_OFFLINE);
      expect(stateMachine.getState()).toBe(DiscoveryState.OFFLINE);
    });
  });

  describe('STOP transitions', () => {
    it('should transition to IDLE from WAITING_MOVEMENT on STOP', () => {
      stateMachine.sendEvent(DiscoveryEvent.START);
      stateMachine.sendEvent(DiscoveryEvent.STOP);
      expect(stateMachine.getState()).toBe(DiscoveryState.IDLE);
    });

    it('should transition to IDLE from WAITING_COOLDOWN on STOP', () => {
      stateMachine.sendEvent(DiscoveryEvent.START);
      stateMachine.sendEvent(DiscoveryEvent.MOVEMENT_THRESHOLD_EXCEEDED);
      stateMachine.sendEvent(DiscoveryEvent.STOP);
      expect(stateMachine.getState()).toBe(DiscoveryState.IDLE);
    });

    it('should transition to IDLE from RESULTS_READY on STOP', () => {
      stateMachine.sendEvent(DiscoveryEvent.START);
      stateMachine.sendEvent(DiscoveryEvent.MOVEMENT_THRESHOLD_EXCEEDED);
      stateMachine.sendEvent(DiscoveryEvent.COOLDOWN_COMPLETE);
      stateMachine.sendEvent(DiscoveryEvent.SEARCH_COMPLETE);
      stateMachine.sendEvent(DiscoveryEvent.STOP);
      expect(stateMachine.getState()).toBe(DiscoveryState.IDLE);
    });

    it('should transition to IDLE from ERROR on STOP', () => {
      stateMachine.sendEvent(DiscoveryEvent.START);
      stateMachine.sendEvent(DiscoveryEvent.MOVEMENT_THRESHOLD_EXCEEDED);
      stateMachine.sendEvent(DiscoveryEvent.COOLDOWN_COMPLETE);
      stateMachine.sendEvent(DiscoveryEvent.ERROR);
      stateMachine.sendEvent(DiscoveryEvent.STOP);
      expect(stateMachine.getState()).toBe(DiscoveryState.IDLE);
    });
  });

  describe('Invalid Transitions', () => {
    it('should not transition from IDLE with MOVEMENT_THRESHOLD_EXCEEDED', () => {
      const result = stateMachine.sendEvent(DiscoveryEvent.MOVEMENT_THRESHOLD_EXCEEDED);
      expect(result).toBe(false);
      expect(stateMachine.getState()).toBe(DiscoveryState.IDLE);
    });

    it('should not transition from IDLE with SEARCH_COMPLETE', () => {
      const result = stateMachine.sendEvent(DiscoveryEvent.SEARCH_COMPLETE);
      expect(result).toBe(false);
    });
  });

  describe('canTransition', () => {
    it('should return true for valid transition', () => {
      expect(stateMachine.canTransition(DiscoveryEvent.START)).toBe(true);
    });

    it('should return false for invalid transition', () => {
      expect(stateMachine.canTransition(DiscoveryEvent.SEARCH_COMPLETE)).toBe(false);
    });
  });

  describe('getValidEvents', () => {
    it('should return valid events for IDLE state', () => {
      const events = stateMachine.getValidEvents();
      expect(events).toContain(DiscoveryEvent.START);
      expect(events).not.toContain(DiscoveryEvent.SEARCH_COMPLETE);
    });

    it('should return valid events for WAITING_MOVEMENT state', () => {
      stateMachine.sendEvent(DiscoveryEvent.START);
      const events = stateMachine.getValidEvents();
      expect(events).toContain(DiscoveryEvent.MOVEMENT_THRESHOLD_EXCEEDED);
      expect(events).toContain(DiscoveryEvent.STOP);
    });
  });

  describe('State Checks', () => {
    it('should check isIdle correctly', () => {
      expect(stateMachine.isIdle()).toBe(true);
      stateMachine.sendEvent(DiscoveryEvent.START);
      expect(stateMachine.isIdle()).toBe(false);
    });

    it('should check isSearching correctly', () => {
      stateMachine.sendEvent(DiscoveryEvent.START);
      stateMachine.sendEvent(DiscoveryEvent.MOVEMENT_THRESHOLD_EXCEEDED);
      stateMachine.sendEvent(DiscoveryEvent.COOLDOWN_COMPLETE);
      expect(stateMachine.isSearching()).toBe(true);
    });

    it('should check hasResults correctly', () => {
      stateMachine.sendEvent(DiscoveryEvent.START);
      stateMachine.sendEvent(DiscoveryEvent.MOVEMENT_THRESHOLD_EXCEEDED);
      stateMachine.sendEvent(DiscoveryEvent.COOLDOWN_COMPLETE);
      stateMachine.sendEvent(DiscoveryEvent.SEARCH_COMPLETE);
      expect(stateMachine.hasResults()).toBe(true);
    });

    it('should check hasError correctly', () => {
      stateMachine.sendEvent(DiscoveryEvent.START);
      stateMachine.sendEvent(DiscoveryEvent.MOVEMENT_THRESHOLD_EXCEEDED);
      stateMachine.sendEvent(DiscoveryEvent.COOLDOWN_COMPLETE);
      stateMachine.sendEvent(DiscoveryEvent.ERROR);
      expect(stateMachine.hasError()).toBe(true);
    });

    it('should check isOffline correctly', () => {
      stateMachine.sendEvent(DiscoveryEvent.START);
      stateMachine.sendEvent(DiscoveryEvent.MOVEMENT_THRESHOLD_EXCEEDED);
      stateMachine.sendEvent(DiscoveryEvent.COOLDOWN_COMPLETE);
      stateMachine.sendEvent(DiscoveryEvent.NETWORK_OFFLINE);
      expect(stateMachine.isOffline()).toBe(true);
    });

    it('should check isWaiting correctly', () => {
      stateMachine.sendEvent(DiscoveryEvent.START);
      expect(stateMachine.isWaiting()).toBe(true);
    });
  });

  describe('State History', () => {
    it('should record state changes', () => {
      stateMachine.sendEvent(DiscoveryEvent.START);
      stateMachine.sendEvent(DiscoveryEvent.MOVEMENT_THRESHOLD_EXCEEDED);
      
      const history = stateMachine.getHistory();
      expect(history.length).toBeGreaterThanOrEqual(3);
    });

    it('should limit history size', () => {
      // Send many events
      for (let i = 0; i < 150; i++) {
        stateMachine.reset();
        stateMachine.sendEvent(DiscoveryEvent.START);
      }
      
      const history = stateMachine.getHistory();
      expect(history.length).toBeLessThanOrEqual(200);
    });
  });

  describe('getTimeInState', () => {
    it('should return 0 initially', () => {
      expect(stateMachine.getTimeInState()).toBe(0);
    });

    it('should return time since state change', async () => {
      stateMachine.sendEvent(DiscoveryEvent.START);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const time = stateMachine.getTimeInState();
      expect(time).toBeGreaterThanOrEqual(40);
    });
  });

  describe('reset', () => {
    it('should reset to IDLE state', () => {
      stateMachine.sendEvent(DiscoveryEvent.START);
      stateMachine.sendEvent(DiscoveryEvent.MOVEMENT_THRESHOLD_EXCEEDED);
      
      stateMachine.reset();
      
      expect(stateMachine.getState()).toBe(DiscoveryState.IDLE);
      expect(stateMachine.isIdle()).toBe(true);
    });
  });

  describe('getStateDescription', () => {
    it('should return description for IDLE', () => {
      const desc = stateMachine.getStateDescription();
      expect(desc).toContain('Idle');
    });

    it('should return description for WAITING_MOVEMENT', () => {
      stateMachine.sendEvent(DiscoveryEvent.START);
      const desc = stateMachine.getStateDescription();
      expect(desc).toContain('Waiting');
    });

    it('should return description for SEARCHING', () => {
      stateMachine.sendEvent(DiscoveryEvent.START);
      stateMachine.sendEvent(DiscoveryEvent.MOVEMENT_THRESHOLD_EXCEEDED);
      stateMachine.sendEvent(DiscoveryEvent.COOLDOWN_COMPLETE);
      const desc = stateMachine.getStateDescription();
      expect(desc).toContain('Searching');
    });
  });

  describe('Events', () => {
    it('should notify listeners on state change', () => {
      const listener = jest.fn();
      stateMachine.addListener(listener);
      
      stateMachine.sendEvent(DiscoveryEvent.START);
      
      expect(listener).toHaveBeenCalledWith(DiscoveryState.WAITING_MOVEMENT, DiscoveryEvent.START);
    });

    it('should allow removing listener', () => {
      const listener = jest.fn();
      const remove = stateMachine.addListener(listener);
      
      stateMachine.sendEvent(DiscoveryEvent.START);
      remove();
      stateMachine.sendEvent(DiscoveryEvent.MOVEMENT_THRESHOLD_EXCEEDED);
      
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});

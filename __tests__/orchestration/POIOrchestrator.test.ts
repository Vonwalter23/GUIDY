/**
 * GUIDY - POI Orchestrator Tests
 * Integration tests for POI Orchestrator
 * 
 * STAGE 4.4: POI Engine Orchestration
 */

import { POIOrchestrator, OrchestratorState, DEFAULT_ORCHESTRATOR_CONFIG } from '../../src/services/poi/POIOrchestrator';
import { discoveryEngine } from '../../src/services/poi/discovery';
import { poiSessionManager } from '../../src/services/poi/session';

// Mock dependencies
jest.mock('../../src/services/poi/discovery', () => ({
  discoveryEngine: {
    initialize: jest.fn().mockResolvedValue(undefined),
    start: jest.fn(),
    stop: jest.fn(),
    updateLocation: jest.fn(),
    search: jest.fn().mockResolvedValue([]),
    forceSearch: jest.fn().mockResolvedValue([]),
    cleanup: jest.fn().mockResolvedValue(undefined),
    getState: jest.fn().mockReturnValue('IDLE'),
    getResults: jest.fn().mockReturnValue([]),
    getMovementData: jest.fn().mockReturnValue({
      lastLocation: null,
      totalDistance: 0,
      threshold: 50,
      thresholdExceeded: false,
      mode: 'WALKING',
    }),
    getSchedulerStatus: jest.fn().mockReturnValue({
      isInCooldown: false,
      remainingCooldown: 0,
      pendingTasks: 0,
      isOnline: true,
    }),
    updateConfig: jest.fn(),
    setMovementMode: jest.fn(),
  },
}));

jest.mock('../../src/services/poi/session', () => ({
  poiSessionManager: {
    start: jest.fn().mockReturnValue(true),
    stop: jest.fn().mockReturnValue(true),
    pause: jest.fn().mockReturnValue(true),
    resume: jest.fn().mockReturnValue(true),
    addDiscoveredPOIs: jest.fn().mockReturnValue([]),
    getAllPOIs: jest.fn().mockReturnValue([]),
    getActivePOIs: jest.fn().mockReturnValue([]),
    getVisitedPOIs: jest.fn().mockReturnValue([]),
    getSessionId: jest.fn().mockReturnValue('test-session'),
    getStats: jest.fn().mockReturnValue({
      sessionId: 'test-session',
      startTime: Date.now(),
      totalDiscovered: 0,
      totalActive: 0,
      totalVisited: 0,
    }),
    subscribe: jest.fn().mockReturnValue(jest.fn()),
  },
}));

describe('POIOrchestrator', () => {
  let orchestrator: POIOrchestrator;

  beforeEach(() => {
    jest.clearAllMocks();
    orchestrator = new POIOrchestrator();
  });

  afterEach(async () => {
    await orchestrator.cleanup();
  });

  describe('Initialization', () => {
    it('should have IDLE state initially', () => {
      expect(orchestrator.getState()).toBe(OrchestratorState.IDLE);
    });

    it('should initialize successfully', async () => {
      await orchestrator.initialize();
      // isReady() returns true only if initialized AND has location
      // After init, location is null, so isReady is false
      expect(orchestrator.getState()).toBe(OrchestratorState.INITIALIZED);
    });

    it('should not reinitialize if already initialized', async () => {
      await orchestrator.initialize();
      await orchestrator.initialize();
      expect(discoveryEngine.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('Lifecycle', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
    });

    it('should start successfully', () => {
      orchestrator.start();
      expect(orchestrator.isRunning()).toBe(true);
      expect(orchestrator.getState()).toBe(OrchestratorState.RUNNING);
      expect(discoveryEngine.start).toHaveBeenCalled();
      expect(poiSessionManager.start).toHaveBeenCalled();
    });

    it('should stop successfully', () => {
      orchestrator.start();
      orchestrator.stop();
      expect(orchestrator.isRunning()).toBe(false);
      expect(orchestrator.getState()).toBe(OrchestratorState.STOPPED);
      expect(discoveryEngine.stop).toHaveBeenCalled();
      expect(poiSessionManager.stop).toHaveBeenCalled();
    });

    it('should pause successfully', () => {
      orchestrator.start();
      orchestrator.pause();
      expect(orchestrator.getState()).toBe(OrchestratorState.PAUSED);
      expect(discoveryEngine.stop).toHaveBeenCalled();
      expect(poiSessionManager.pause).toHaveBeenCalled();
    });

    it('should resume successfully', () => {
      orchestrator.start();
      orchestrator.pause();
      orchestrator.resume();
      expect(orchestrator.getState()).toBe(OrchestratorState.RUNNING);
      expect(discoveryEngine.start).toHaveBeenCalled();
      expect(poiSessionManager.resume).toHaveBeenCalled();
    });

    it('should not start if not initialized', () => {
      const newOrchestrator = new POIOrchestrator();
      newOrchestrator.start();
      expect(newOrchestrator.isRunning()).toBe(false);
    });
  });

  describe('Location Updates', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
      orchestrator.start();
    });

    it('should update location', () => {
      orchestrator.updateLocation(40.7128, -74.0060);
      expect(discoveryEngine.updateLocation).toHaveBeenCalledWith(40.7128, -74.0060);
    });

    it('should calculate movement distance', () => {
      orchestrator.updateLocation(40.7128, -74.0060);
      orchestrator.updateLocation(40.7130, -74.0058);
      expect(orchestrator.isReady()).toBe(true);
    });

    it('should set movement mode', () => {
      orchestrator.setMovementMode('CYCLING' as any);
      expect(discoveryEngine.setMovementMode).toHaveBeenCalledWith('CYCLING');
    });
  });

  describe('Discovery', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
      orchestrator.start();
    });

    it('should discover POIs', async () => {
      const mockPOIs = [
        { id: 'poi-1', name: 'Test POI', latitude: 40.7128, longitude: -74.006 } as any,
      ];
      (discoveryEngine.search as jest.Mock).mockResolvedValueOnce(mockPOIs);

      orchestrator.updateLocation(40.7128, -74.0060);
      const pois = await orchestrator.discoverPOIs();
      
      expect(pois).toEqual(mockPOIs);
      expect(discoveryEngine.search).toHaveBeenCalled();
    });

    it('should force discover', async () => {
      const mockPOIs = [{ id: 'poi-1' }] as any;
      (discoveryEngine.forceSearch as jest.Mock).mockResolvedValueOnce(mockPOIs);

      await orchestrator.forceDiscover();
      expect(discoveryEngine.forceSearch).toHaveBeenCalled();
    });

    it('should not discover without location', async () => {
      const newOrchestrator = new POIOrchestrator();
      await newOrchestrator.initialize();
      const pois = await newOrchestrator.discoverPOIs();
      expect(pois).toEqual([]);
    });
  });

  describe('Session Integration', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
      orchestrator.start();
    });

    it('should add POIs to session', async () => {
      const mockPOIs = [
        { id: 'poi-1', name: 'Test POI', latitude: 40.7128, longitude: -74.006 } as any,
      ];
      (discoveryEngine.search as jest.Mock).mockResolvedValueOnce(mockPOIs);
      (poiSessionManager.addDiscoveredPOIs as jest.Mock).mockReturnValueOnce([
        { poi: mockPOIs[0], lifecycleState: 'DISCOVERED' },
      ]);

      orchestrator.updateLocation(40.7128, -74.0060);
      await orchestrator.discoverPOIs();

      expect(poiSessionManager.addDiscoveredPOIs).toHaveBeenCalledWith(mockPOIs);
    });

    it('should get POIs from session', async () => {
      const mockPOIs = [
        { poi: { id: 'poi-1', name: 'Test POI' }, lifecycleState: 'DISCOVERED' },
      ];
      (poiSessionManager.getAllPOIs as jest.Mock).mockReturnValueOnce(mockPOIs);

      const pois = orchestrator.getPOIs();
      expect(pois).toHaveLength(1);
    });

    it('should get session stats', () => {
      const stats = orchestrator.getSessionStats();
      expect(stats).not.toBeNull();
      expect(stats?.sessionId).toBe('test-session');
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      await orchestrator.initialize();
      orchestrator.start();
    });

    it('should return stats', () => {
      const stats = orchestrator.getStats();
      expect(stats).toHaveProperty('totalDiscoveries');
      expect(stats).toHaveProperty('orchestratorState');
      expect(stats).toHaveProperty('discoveryEngineState');
    });

    it('should track discoveries', async () => {
      const mockPOIs = [{ id: 'poi-1' }] as any;
      (discoveryEngine.search as jest.Mock).mockResolvedValueOnce(mockPOIs);

      orchestrator.updateLocation(40.7128, -74.0060);
      await orchestrator.discoverPOIs();

      const stats = orchestrator.getStats();
      expect(stats.totalDiscoveries).toBe(1);
      expect(stats.totalPOIsDiscovered).toBe(1);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources', async () => {
      await orchestrator.initialize();
      orchestrator.start();
      
      await orchestrator.cleanup();
      
      expect(orchestrator.getState()).toBe(OrchestratorState.IDLE);
      expect(orchestrator.isReady()).toBe(false);
      expect(discoveryEngine.cleanup).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('should use default config', () => {
      expect(orchestrator.getStats().orchestratorState).toBe(OrchestratorState.IDLE);
    });

    it('should accept custom config', async () => {
      const customOrchestrator = new POIOrchestrator({
        movementThreshold: 100,
        cooldownMs: 30000,
        sessionEnabled: false,
      });
      
      await customOrchestrator.initialize();
      
      // isReady requires currentLocation, which is null initially
      expect(customOrchestrator.isReady()).toBe(false);
      
      await customOrchestrator.cleanup();
    });
  });
});

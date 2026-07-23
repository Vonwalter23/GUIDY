/**
 * Discovery Scheduler Tests
 */

import { DiscoveryScheduler, SchedulerEvent } from '../../src/services/poi/discovery/DiscoveryScheduler';

describe('DiscoveryScheduler', () => {
  let scheduler: DiscoveryScheduler;

  beforeEach(() => {
    scheduler = new DiscoveryScheduler(2000, 100); // 2s cooldown, 100ms debounce
  });

  afterEach(() => {
    scheduler.cleanupAndStop();
  });

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      const s = new DiscoveryScheduler();
      expect(s.getCooldown()).toBe(20000);
      expect(s.getDebounce()).toBe(300);
    });

    it('should initialize with custom values', () => {
      expect(scheduler.getCooldown()).toBe(2000);
      expect(scheduler.getDebounce()).toBe(100);
    });
  });

  describe('setCooldown', () => {
    it('should update cooldown', () => {
      scheduler.setCooldown(5000);
      expect(scheduler.getCooldown()).toBe(5000);
    });
  });

  describe('setDebounce', () => {
    it('should update debounce', () => {
      scheduler.setDebounce(200);
      expect(scheduler.getDebounce()).toBe(200);
    });
  });

  describe('Cooldown', () => {
    it('should not be in cooldown initially', () => {
      expect(scheduler.isInCooldown()).toBe(false);
    });

    it('should be in cooldown after starting', () => {
      scheduler.startCooldown();
      expect(scheduler.isInCooldown()).toBe(true);
    });

    it('should track remaining cooldown time', async () => {
      scheduler.setCooldown(1000);
      scheduler.startCooldown();
      
      const remaining = scheduler.getRemainingCooldown();
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(1000);
    });

    it('should end cooldown early', () => {
      scheduler.startCooldown();
      scheduler.endCooldown();
      expect(scheduler.isInCooldown()).toBe(false);
    });
  });

  describe('Network Status', () => {
    it('should be online by default', () => {
      expect(scheduler.checkNetwork()).toBe(true);
    });

    it('should update network status', () => {
      scheduler.setOnline(false);
      expect(scheduler.checkNetwork()).toBe(false);
      
      scheduler.setOnline(true);
      expect(scheduler.checkNetwork()).toBe(true);
    });
  });

  describe('scheduleTask', () => {
    it('should schedule task', () => {
      const result = scheduler.scheduleTask('test-task', {
        type: 'search',
        scheduledAt: Date.now(),
        executeAt: Date.now() + 100,
        priority: 1,
      });
      
      expect(result).toBe(true);
      expect(scheduler.hasTask('test-task')).toBe(true);
    });

    it('should skip search task during cooldown', () => {
      scheduler.startCooldown();
      
      const result = scheduler.scheduleTask('test-task', {
        type: 'search',
        scheduledAt: Date.now(),
        executeAt: Date.now() + 100,
        priority: 1,
      });
      
      expect(result).toBe(false);
    });

    it('should skip search task when offline', () => {
      scheduler.setOnline(false);
      
      const result = scheduler.scheduleTask('test-task', {
        type: 'search',
        scheduledAt: Date.now(),
        executeAt: Date.now() + 100,
        priority: 1,
      });
      
      expect(result).toBe(false);
    });

    it('should cancel existing task with same ID', () => {
      scheduler.scheduleTask('test-task', {
        type: 'search',
        scheduledAt: Date.now(),
        executeAt: Date.now() + 1000,
        priority: 1,
      });
      
      scheduler.scheduleTask('test-task', {
        type: 'search',
        scheduledAt: Date.now(),
        executeAt: Date.now() + 100,
        priority: 1,
      });
      
      expect(scheduler.getTaskCount()).toBe(1);
    });
  });

  describe('cancelTask', () => {
    it('should cancel scheduled task', () => {
      scheduler.scheduleTask('test-task', {
        type: 'search',
        scheduledAt: Date.now(),
        executeAt: Date.now() + 1000,
        priority: 1,
      });
      
      const result = scheduler.cancelTask('test-task');
      
      expect(result).toBe(true);
      expect(scheduler.hasTask('test-task')).toBe(false);
    });

    it('should return false for non-existent task', () => {
      const result = scheduler.cancelTask('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('cancelAllTasks', () => {
    it('should cancel all tasks', () => {
      scheduler.scheduleTask('task-1', {
        type: 'search',
        scheduledAt: Date.now(),
        executeAt: Date.now() + 1000,
        priority: 1,
      });
      
      scheduler.scheduleTask('task-2', {
        type: 'refresh',
        scheduledAt: Date.now(),
        executeAt: Date.now() + 1000,
        priority: 1,
      });
      
      scheduler.cancelAllTasks();
      
      expect(scheduler.getTaskCount()).toBe(0);
    });
  });

  describe('getPendingTasks', () => {
    it('should return pending tasks', () => {
      scheduler.scheduleTask('task-1', {
        type: 'search',
        scheduledAt: Date.now(),
        executeAt: Date.now() + 1000,
        priority: 1,
      });
      
      const tasks = scheduler.getPendingTasks();
      
      expect(tasks.length).toBe(1);
      expect(tasks[0].id).toBe('task-1');
    });

    it('should return empty array when no tasks', () => {
      const tasks = scheduler.getPendingTasks();
      expect(tasks.length).toBe(0);
    });
  });

  describe('Events', () => {
    it('should emit events', () => {
      const listener = jest.fn();
      scheduler.addListener(listener);
      
      scheduler.startCooldown();
      
      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0]).toBe(SchedulerEvent.COOLDOWN_START);
    });

    it('should allow removing listener', () => {
      const listener = jest.fn();
      const remove = scheduler.addListener(listener);
      
      scheduler.startCooldown();
      remove();
      scheduler.endCooldown();
      
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('getStats', () => {
    it('should track statistics', () => {
      scheduler.scheduleTask('task-1', {
        type: 'search',
        scheduledAt: Date.now(),
        executeAt: Date.now() + 100,
        priority: 1,
      });
      
      const stats = scheduler.getStats();
      
      expect(stats.tasksScheduled).toBe(1);
      expect(stats.cooldownsStarted).toBe(0);
    });

    it('should track cooldowns', () => {
      scheduler.startCooldown();
      
      const stats = scheduler.getStats();
      expect(stats.cooldownsStarted).toBe(1);
    });
  });

  describe('scheduleSearch', () => {
    it('should schedule pending search', () => {
      const callback = jest.fn();
      
      scheduler.scheduleSearch(callback);
      
      // Debounce should delay execution
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('cancelPendingSearch', () => {
    it('should cancel pending search', () => {
      const callback = jest.fn();
      
      scheduler.scheduleSearch(callback);
      scheduler.cancelPendingSearch();
      
      // After debounce, callback should not be called
      return new Promise(resolve => setTimeout(resolve, 200)).then(() => {
        expect(callback).not.toHaveBeenCalled();
      });
    });
  });
});

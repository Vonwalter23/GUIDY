/**
 * GUIDY - Discovery Scheduler
 * Intelligent scheduler for POI discovery operations
 * 
 * STAGE 4.2: POI Discovery Engine
 */

import type { SchedulerTask } from './DiscoveryTypes';

/**
 * Scheduler events
 */
export enum SchedulerEvent {
  TASK_SCHEDULED = 'TASK_SCHEDULED',
  TASK_EXECUTED = 'TASK_EXECUTED',
  TASK_CANCELLED = 'TASK_CANCELLED',
  TASK_SKIPPED = 'TASK_SKIPPED',
  COOLDOWN_START = 'COOLDOWN_START',
  COOLDOWN_END = 'COOLDOWN_END',
}

/**
 * Scheduler listener
 */
type SchedulerListener = (event: SchedulerEvent, task?: SchedulerTask) => void;

/**
 * Scheduler statistics
 */
interface SchedulerStats {
  tasksScheduled: number;
  tasksExecuted: number;
  tasksCancelled: number;
  tasksSkipped: number;
  cooldownsStarted: number;
  cooldownsEnded: number;
}

/**
 * Discovery Scheduler
 * Manages timing of discovery operations
 */
export class DiscoveryScheduler {
  private tasks: Map<string, SchedulerTask> = new Map();
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private listeners: Set<SchedulerListener> = new Set();
  private cooldownUntil: number = 0;
  private cooldownMs: number;
  private debounceMs: number;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingSearch: (() => void) | null = null;
  private stats: SchedulerStats = {
    tasksScheduled: 0,
    tasksExecuted: 0,
    tasksCancelled: 0,
    tasksSkipped: 0,
    cooldownsStarted: 0,
    cooldownsEnded: 0,
  };
  private isOnline: boolean = true;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(cooldownMs: number = 20000, debounceMs: number = 300) {
    this.cooldownMs = cooldownMs;
    this.debounceMs = debounceMs;
    
    // Start cleanup interval
    this.startCleanup();
  }

  /**
   * Set cooldown duration
   */
  setCooldown(ms: number): void {
    this.cooldownMs = ms;
  }

  /**
   * Get cooldown duration
   */
  getCooldown(): number {
    return this.cooldownMs;
  }

  /**
   * Set debounce duration
   */
  setDebounce(ms: number): void {
    this.debounceMs = ms;
  }

  /**
   * Get debounce duration
   */
  getDebounce(): number {
    return this.debounceMs;
  }

  /**
   * Check if in cooldown
   */
  isInCooldown(): boolean {
    return Date.now() < this.cooldownUntil;
  }

  /**
   * Get remaining cooldown time
   */
  getRemainingCooldown(): number {
    const remaining = this.cooldownUntil - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Start cooldown period
   */
  startCooldown(): void {
    this.cooldownUntil = Date.now() + this.cooldownMs;
    this.stats.cooldownsStarted++;
    this.emit(SchedulerEvent.COOLDOWN_START);
  }

  /**
   * End cooldown early
   */
  endCooldown(): void {
    if (this.isInCooldown()) {
      this.cooldownUntil = 0;
      this.stats.cooldownsEnded++;
      this.emit(SchedulerEvent.COOLDOWN_END);
    }
  }

  /**
   * Check if network is available
   */
  setOnline(online: boolean): void {
    this.isOnline = online;
  }

  /**
   * Check if network is available
   */
  checkNetwork(): boolean {
    return this.isOnline;
  }

  /**
   * Schedule a task
   */
  scheduleTask(
    id: string,
    task: Omit<SchedulerTask, 'id' | 'cancelled'>,
    immediate: boolean = false
  ): boolean {
    // Check cooldown for search tasks
    if (task.type === 'search' && this.isInCooldown()) {
      this.stats.tasksSkipped++;
      this.emit(SchedulerEvent.TASK_SKIPPED);
      return false;
    }

    // Check network for search tasks
    if (task.type === 'search' && !this.isOnline) {
      this.stats.tasksSkipped++;
      this.emit(SchedulerEvent.TASK_SKIPPED);
      return false;
    }

    // Cancel existing task with same ID
    this.cancelTask(id);

    const fullTask: SchedulerTask = {
      ...task,
      id,
      cancelled: false,
    };

    this.tasks.set(id, fullTask);
    this.stats.tasksScheduled++;
    this.emit(SchedulerEvent.TASK_SCHEDULED, fullTask);

    const delay = immediate ? 0 : Math.max(0, task.executeAt - Date.now());

    const timer = setTimeout(() => {
      this.executeTask(id);
    }, delay);

    this.timers.set(id, timer);
    return true;
  }

  /**
   * Schedule search
   */
  scheduleSearch(callback: () => void): boolean {
    // Debounce
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.pendingSearch = callback;

    this.debounceTimer = setTimeout(() => {
      this.executePendingSearch();
    }, this.debounceMs);

    return true;
  }

  /**
   * Cancel pending search
   */
  cancelPendingSearch(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.pendingSearch = null;
  }

  /**
   * Execute pending search
   */
  private executePendingSearch(): void {
    if (this.pendingSearch && !this.isInCooldown() && this.isOnline) {
      this.pendingSearch();
      this.startCooldown();
    }
    this.debounceTimer = null;
    this.pendingSearch = null;
  }

  /**
   * Execute a task
   */
  private executeTask(id: string): void {
    const task = this.tasks.get(id);
    
    if (!task || task.cancelled) {
      this.tasks.delete(id);
      this.timers.delete(id);
      return;
    }

    // Execute the task
    try {
      this.stats.tasksExecuted++;
      this.emit(SchedulerEvent.TASK_EXECUTED, task);

      // Start cooldown after search
      if (task.type === 'search') {
        this.startCooldown();
      }
    } catch (error) {
      console.error(`[SCHEDULER] Error executing task ${id}:`, error);
    } finally {
      this.tasks.delete(id);
      this.timers.delete(id);
    }
  }

  /**
   * Cancel a task
   */
  cancelTask(id: string): boolean {
    const timer = this.timers.get(id);
    
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    const task = this.tasks.get(id);
    if (task) {
      task.cancelled = true;
      this.tasks.delete(id);
      this.stats.tasksCancelled++;
      this.emit(SchedulerEvent.TASK_CANCELLED, task);
      return true;
    }

    return false;
  }

  /**
   * Cancel all tasks
   */
  cancelAllTasks(): void {
    for (const [id, timer] of this.timers) {
      clearTimeout(timer);
      this.timers.delete(id);
    }

    for (const [_id, task] of this.tasks) {
      task.cancelled = true;
      this.stats.tasksCancelled++;
      this.emit(SchedulerEvent.TASK_CANCELLED, task);
    }

    this.tasks.clear();
    this.cancelPendingSearch();
  }

  /**
   * Get pending tasks
   */
  getPendingTasks(): SchedulerTask[] {
    return Array.from(this.tasks.values()).filter(t => !t.cancelled);
  }

  /**
   * Get task count
   */
  getTaskCount(): number {
    return this.tasks.size;
  }

  /**
   * Check if task exists
   */
  hasTask(id: string): boolean {
    return this.tasks.has(id);
  }

  /**
   * Add listener
   */
  addListener(listener: SchedulerListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Emit event
   */
  private emit(event: SchedulerEvent, task?: SchedulerTask): void {
    for (const listener of this.listeners) {
      try {
        listener(event, task);
      } catch (error) {
        console.error('[SCHEDULER] Listener error:', error);
      }
    }
  }

  /**
   * Get statistics
   */
  getStats(): SchedulerStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      tasksScheduled: 0,
      tasksExecuted: 0,
      tasksCancelled: 0,
      tasksSkipped: 0,
      cooldownsStarted: 0,
      cooldownsEnded: 0,
    };
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Every minute
  }

  /**
   * Cleanup expired tasks
   */
  private cleanup(): number {
    let count = 0;
    const now = Date.now();

    for (const [id, task] of this.tasks) {
      if (task.executeAt < now - 300000) { // 5 minutes past
        this.cancelTask(id);
        count++;
      }
    }

    return count;
  }

  /**
   * Force cleanup and stop
   */
  cleanupAndStop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cancelAllTasks();
  }
}

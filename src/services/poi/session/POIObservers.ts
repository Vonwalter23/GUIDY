/**
 * GUIDY - POI Observers
 * Observer pattern implementation for POI Session Manager
 * 
 * STAGE 4.3: POI Session Manager
 */

import { SessionEvent, SessionEventType, SessionEventListener } from './POISessionEvents';
import type { POISessionState } from './POISessionTypes';

/**
 * Observer callback with optional filter
 */
interface ObserverEntry {
  listener: SessionEventListener;
  eventTypes?: SessionEventType[];
  poiIds?: Set<string>;
  once: boolean;
}

/**
 * POI Observer Manager
 * Manages event listeners for POI session events
 */
export class POIObserverManager {
  private observers: Map<string, ObserverEntry> = new Map();
  private nextId: number = 0;
  private eventHistory: SessionEvent[] = [];
  private maxHistorySize: number = 100;
  private sessionState: POISessionState | null = null;

  /**
   * Subscribe to session events
   */
  subscribe(
    listener: SessionEventListener,
    options?: {
      eventTypes?: SessionEventType[];
      poiIds?: string[];
    }
  ): () => void {
    const id = `observer_${this.nextId++}`;
    
    this.observers.set(id, {
      listener,
      eventTypes: options?.eventTypes,
      poiIds: options?.poiIds ? new Set(options.poiIds) : undefined,
      once: false,
    });

    return () => this.unsubscribe(id);
  }

  /**
   * Subscribe to a single event (auto-unsubscribes after first event)
   */
  subscribeOnce(
    listener: SessionEventListener,
    options?: {
      eventTypes?: SessionEventType[];
      poiIds?: string[];
    }
  ): () => void {
    const id = `observer_once_${this.nextId++}`;
    
    this.observers.set(id, {
      listener,
      eventTypes: options?.eventTypes,
      poiIds: options?.poiIds ? new Set(options.poiIds) : undefined,
      once: true,
    });

    return () => this.unsubscribe(id);
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(id: string): boolean {
    return this.observers.delete(id);
  }

  /**
   * Unsubscribe all observers
   */
  unsubscribeAll(): void {
    this.observers.clear();
  }

  /**
   * Emit an event to all matching observers
   */
  emit(event: SessionEvent): void {
    // Add to history
    this.addToHistory(event);

    // Notify all matching observers
    for (const [id, entry] of this.observers) {
      if (this.shouldNotify(entry, event)) {
        try {
          entry.listener(event);
        } catch (error) {
          console.error(`[POIObserver] Error in observer ${id}:`, error);
        }

        // Remove once observers after emitting
        if (entry.once) {
          this.observers.delete(id);
        }
      }
    }
  }

  /**
   * Check if observer should be notified of this event
   */
  private shouldNotify(entry: ObserverEntry, event: SessionEvent): boolean {
    // Check event type filter
    if (entry.eventTypes && entry.eventTypes.length > 0) {
      if (!entry.eventTypes.includes(event.type)) {
        return false;
      }
    }

    // Check POI ID filter
    if (entry.poiIds) {
      const poiId = this.extractPoiId(event);
      if (!poiId || !entry.poiIds.has(poiId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Extract POI ID from event
   */
  private extractPoiId(event: SessionEvent): string | null {
    switch (event.type) {
      case SessionEventType.POI_DISCOVERED:
      case SessionEventType.POI_ACTIVATED:
      case SessionEventType.POI_SELECTED:
      case SessionEventType.POI_DESELECTED:
      case SessionEventType.POI_VISITED:
      case SessionEventType.POI_ARCHIVED:
      case SessionEventType.POI_EXPIRED:
      case SessionEventType.POI_STATE_CHANGED:
        return event.poi.poi.id;
      
      case SessionEventType.POI_REMOVED:
        return event.poiId;
      
      case SessionEventType.POIS_UPDATED:
        return event.added?.[0]?.poi.id ?? null;
      
      case SessionEventType.POIS_DISCOVERED_BATCH:
        return event.pois?.[0]?.poi.id ?? null;
      
      case SessionEventType.POIS_EXPIRED_BATCH:
        return event.pois?.[0]?.poi.id ?? null;
      
      default:
        return null;
    }
  }

  /**
   * Add event to history
   */
  private addToHistory(event: SessionEvent): void {
    this.eventHistory.push(event);
    
    // Limit history size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Get event history
   */
  getHistory(): SessionEvent[] {
    return [...this.eventHistory];
  }

  /**
   * Get events by type
   */
  getEventsByType(type: SessionEventType): SessionEvent[] {
    return this.eventHistory.filter(e => e.type === type);
  }

  /**
   * Get events for specific POI
   */
  getEventsForPOI(poiId: string): SessionEvent[] {
    return this.eventHistory.filter(e => {
      const extractedId = this.extractPoiId(e);
      return extractedId === poiId;
    });
  }

  /**
   * Update session state for filtering
   */
  setSessionState(state: POISessionState): void {
    this.sessionState = state;
  }

  /**
   * Get observer count
   */
  getObserverCount(): number {
    return this.observers.size;
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get recent events
   */
  getRecentEvents(count: number = 10): SessionEvent[] {
    return this.eventHistory.slice(-count);
  }
}

/**
 * Singleton instance
 */
export const poiObserverManager = new POIObserverManager();

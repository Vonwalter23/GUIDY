/**
 * GUIDY - POI Selection Manager
 * Manages POI selection within a session
 * 
 * STAGE 4.3: POI Session Manager
 */

import type { POIWithSession } from './POISessionTypes';
import { POIObserverManager } from './POIObservers';
import { SessionEventType } from './POISessionEvents';

/**
 * Selection reason
 */
export enum SelectionReason {
  USER_TAP = 'USER_TAP',
  AUTO_SELECT = 'AUTO_SELECT',
  PROXIMITY = 'PROXIMITY',
  RECOMMENDATION = 'RECOMMENDATION',
}

/**
 * POI Selection Manager
 * Ensures only one POI can be selected at a time
 */
export class POISelectionManager {
  private selectedPoiId: string | null = null;
  private previousSelectedPoiId: string | null = null;
  private observers: POIObserverManager;
  private selectionHistory: Array<{
    poiId: string;
    reason: SelectionReason;
    timestamp: number;
  }> = [];
  private maxHistorySize: number = 20;

  constructor(observers: POIObserverManager) {
    this.observers = observers;
  }

  /**
   * Get currently selected POI ID
   */
  getSelectedPoiId(): string | null {
    return this.selectedPoiId;
  }

  /**
   * Check if a POI is selected
   */
  isSelected(poiId: string): boolean {
    return this.selectedPoiId === poiId;
  }

  /**
   * Check if any POI is selected
   */
  hasSelection(): boolean {
    return this.selectedPoiId !== null;
  }

  /**
   * Select a POI (deselects previous)
   */
  select(
    poi: POIWithSession,
    reason: SelectionReason = SelectionReason.USER_TAP
  ): POIWithSession | null {
    // Store previous selection
    this.previousSelectedPoiId = this.selectedPoiId;

    // Emit deselect event for previous POI if any
    if (this.previousSelectedPoiId && this.previousSelectedPoiId !== poi.poi.id) {
      this.emitDeselectEvent(this.previousSelectedPoiId, poi.poi.id);
    }

    // Update selection
    const previousId = this.selectedPoiId;
    this.selectedPoiId = poi.poi.id;

    // Record in history
    this.addToHistory(poi.poi.id, reason);

    // Emit select event
    this.emitSelectEvent(poi, previousId ?? undefined);

    // Return updated POI (with SELECTED state to be applied by caller)
    return {
      ...poi,
      selectedAt: Date.now(),
    };
  }

  /**
   * Deselect current POI
   */
  deselect(): string | null {
    const previousId = this.selectedPoiId;
    
    if (previousId) {
      this.emitDeselectEvent(previousId, undefined);
      this.selectedPoiId = null;
    }

    return previousId;
  }

  /**
   * Clear selection
   */
  clear(): void {
    if (this.selectedPoiId) {
      this.emitDeselectEvent(this.selectedPoiId, undefined);
    }
    this.selectedPoiId = null;
    this.previousSelectedPoiId = null;
  }

  /**
   * Reset selection
   */
  reset(): void {
    this.clear();
    this.selectionHistory = [];
  }

  /**
   * Get selection history
   */
  getHistory(): Array<{ poiId: string; reason: SelectionReason; timestamp: number }> {
    return [...this.selectionHistory];
  }

  /**
   * Get last selection
   */
  getLastSelection(): { poiId: string; reason: SelectionReason; timestamp: number } | null {
    return this.selectionHistory[this.selectionHistory.length - 1] || null;
  }

  /**
   * Get previous selected POI ID
   */
  getPreviousSelectedPoiId(): string | null {
    return this.previousSelectedPoiId;
  }

  /**
   * Get selection count
   */
  getSelectionCount(): number {
    return this.selectionHistory.length;
  }

  /**
   * Add to selection history
   */
  private addToHistory(poiId: string, reason: SelectionReason): void {
    this.selectionHistory.push({
      poiId,
      reason,
      timestamp: Date.now(),
    });

    // Limit history size
    if (this.selectionHistory.length > this.maxHistorySize) {
      this.selectionHistory.shift();
    }
  }

  /**
   * Emit select event
   */
  private emitSelectEvent(poi: POIWithSession, _previousPoiId?: string): void {
    this.observers.emit({
      type: SessionEventType.POI_SELECTED,
      poi,
      timestamp: Date.now(),
    });
  }

  /**
   * Emit deselect event
   */
  private emitDeselectEvent(poiId: string, _newSelectedPoiId?: string): void {
    // We need to emit a deselected event with the POI
    // Since we don't have the full POI here, we emit a minimal event
    this.observers.emit({
      type: SessionEventType.POI_DESELECTED,
      poi: {
        poi: { id: poiId } as any,
        lifecycleState: 'SELECTED' as any,
        discoveredAt: Date.now(),
        visitCount: 0,
      } as POIWithSession,
      previousPoiId: _newSelectedPoiId,
      timestamp: Date.now(),
    });
  }
}

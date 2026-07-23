# STAGE 4 - POI Engine Implementation Plan

## Overview

STAGE 4 is a multi-phase project to implement the POI (Point of Interest) system for GUIDY. The system will allow users to discover and interact with points of interest during their tours.

## Phase Structure

### STAGE 4.0 - Architecture (Current)
- [x] POI Engine Architecture Design
- [x] Repository Pattern Implementation
- [x] Provider Pattern Implementation
- [x] State Machine Implementation
- [x] Cache System
- [x] Filter System
- [x] Type Definitions

### STAGE 4.1 - Data Source Integration
- [ ] Overpass API Integration
- [ ] POI Data Models for OSM
- [ ] Search Implementation
- [ ] Location-based Filtering

### STAGE 4.2 - UI Components
- [ ] POI List Component
- [ ] POI Detail Component
- [ ] Category Filter UI
- [ ] Distance-based Sorting

### STAGE 4.3 - Narration Integration
- [ ] Text-to-Speech Integration
- [ ] POI Narration Templates
- [ ] Auto-play Narration
- [ ] Manual Narration Controls

### STAGE 4.4 - Persistence
- [ ] Visited POI Tracking
- [ ] Local Storage
- [ ] Sync Preferences

## STAGE 4.1 - Data Source Integration

### Objectives
1. Integrate Overpass API for OSM POI data
2. Implement POI search near user location
3. Support multiple POI categories
4. Implement caching

### Tasks

#### 4.1.1 Overpass API Integration
- [ ] Create `OverpassDatasource` class
- [ ] Implement Overpass query builder
- [ ] Handle API rate limiting
- [ ] Parse OSM response to POI model

#### 4.1.2 POI Data Models
- [ ] Map OSM tags to POI categories
- [ ] Map OSM tags to POI subcategories
- [ ] Handle amenity types
- [ ] Handle tourism types

#### 4.1.3 Search Implementation
- [ ] Location-based search
- [ ] Radius configuration
- [ ] Category filtering
- [ ] Result pagination

#### 4.1.4 Testing
- [ ] Unit tests for Overpass queries
- [ ] Mock API responses
- [ ] Error handling tests

## STAGE 4.2 - UI Components

### Objectives
1. Display POIs on map
2. Show POI list
3. POI detail view
4. Category filtering UI

### Tasks

#### 4.2.1 POI List Component
- [ ] Scrollable list of POIs
- [ ] Distance indicator
- [ ] Category icon
- [ ] Name and description

#### 4.2.2 POI Detail Component
- [ ] Full POI information
- [ ] Image if available
- [ ] Opening hours
- [ ] Contact information

#### 4.2.3 Category Filter UI
- [ ] Category chips/badges
- [ ] Multi-select support
- [ ] Visual feedback

#### 4.2.4 Map Integration
- [ ] POI markers on map
- [ ] Cluster markers
- [ ] Tap to select

## STAGE 4.3 - Narration Integration

### Objectives
1. Text-to-speech for POIs
2. Narration templates
3. Audio controls

### Tasks

#### 4.3.1 TTS Integration
- [ ] Select TTS engine
- [ ] Language configuration
- [ ] Voice settings

#### 4.3.2 Narration Templates
- [ ] Arrival narration
- [ ] Nearby narration
- [ ] Visit narration
- [ ] Info narration

#### 4.3.3 Audio Controls
- [ ] Play/pause
- [ ] Skip
- [ ] Volume control

## STAGE 4.4 - Persistence

### Objectives
1. Track visited POIs
2. Save preferences
3. Offline support

### Tasks

#### 4.4.1 Visited POI Tracking
- [ ] Mark POI as visited
- [ ] Store visit timestamp
- [ ] Query visited POIs

#### 4.4.2 Local Storage
- [ ] AsyncStorage integration
- [ ] Cache persistence
- [ ] Preferences storage

#### 4.4.3 Sync
- [ ] Sync visited POIs
- [ ] Handle conflicts
- [ ] Offline queue

## Dependencies

### Required Packages
- `@react-native-async-storage/async-storage` - Local persistence
- `react-native-tts` or similar - Text-to-speech
- (potentially) Map clustering library

### External APIs
- Overpass API - OSM POI data
- (future) Google Places API
- (future) Mapbox API

## Risks & Mitigation

### Risk 1: Overpass API Rate Limiting
- **Mitigation**: Implement caching with TTL
- **Mitigation**: Queue requests with debounce

### Risk 2: Large POI Datasets
- **Mitigation**: Pagination
- **Mitigation**: Virtualized lists

### Risk 3: Offline Usage
- **Mitigation**: Cache POIs locally
- **Mitigation**: Queue visited markers

## Timeline

| STAGE | Duration | Focus |
|-------|----------|-------|
| 4.0   | 1 day    | Architecture |
| 4.1   | 2 days   | Data Integration |
| 4.2   | 2 days   | UI Components |
| 4.3   | 1 day    | Narration |
| 4.4   | 1 day    | Persistence |

**Total**: ~7 days

## Definition of Done

Each STAGE must have:
- [ ] TypeScript compilation (0 errors)
- [ ] ESLint (0 errors)
- [ ] Unit tests passing
- [ ] Debug APK build
- [ ] Release APK build
- [ ] GitHub Release with APKs
- [ ] SHA256 verification
- [ ] CHANGELOG updated
- [ ] Documentation updated

# GUIDY - Architecture Document

## Overview

GUIDY follows the **MVP (Model-View-Presenter)** architecture adapted for React Native, with clear separation between UI, business logic, and data layers.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         UI Layer                            │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   Screens   │  │  Components  │  │  Navigation     │   │
│  └─────────────┘  └──────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Business Logic Layer                    │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   Hooks     │  │    Store     │  │    Services     │   │
│  │             │  │   (Zustand)  │  │                 │   │
│  └─────────────┘  └──────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        Data Layer                           │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │  Location   │  │    Maps      │  │     POI         │   │
│  │   Service   │  │   Service    │  │    Service      │   │
│  └─────────────┘  └──────────────┘  └─────────────────┘   │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ Wikipedia   │  │     AI       │  │     Voice       │   │
│  │   Service   │  │   Service   │  │    Service      │   │
│  └─────────────┘  └──────────────┘  └─────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                  Database Service (SQLite)          │   │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Core Framework
- **React Native 0.86.x** - Cross-platform mobile framework
- **TypeScript** - Type-safe development
- **React Navigation** - Navigation management

### State Management
- **Zustand** - Lightweight, performant state management

### UI Components
- **React Native Paper** - Material Design components
- **React Native Vector Icons** - Icon library

### Data & APIs
- **OpenStreetMap** - Map tiles and POI data
- **Overpass API** - POI queries
- **GeoNames** - Geographic data
- **Wikipedia/Wikidata** - Content enrichment
- **Groq API** - AI description generation

### Local Storage
- **SQLite** - Offline data caching

### Platform Features
- **Fused Location Provider** - GPS positioning
- **Android TTS** - Text-to-Speech narration

## Directory Structure

```
guidy/
├── android/                    # Android native code
├── ios/                       # iOS native code
├── src/
│   ├── app/                   # App entry point & providers
│   ├── components/            # Reusable UI components
│   ├── screens/               # Screen components
│   ├── navigation/            # Navigation configuration
│   ├── services/              # Business logic services
│   │   ├── location/          # GPS & location services
│   │   ├── maps/              # Map rendering services
│   │   ├── poi/               # Point of interest services
│   │   ├── wikipedia/         # Wikipedia API integration
│   │   ├── ai/                # Groq AI integration
│   │   ├── voice/             # TTS services
│   │   └── database/          # SQLite operations
│   ├── hooks/                 # Custom React hooks
│   ├── store/                 # Zustand stores
│   ├── types/                 # TypeScript type definitions
│   ├── utils/                 # Utility functions
│   └── assets/                # Static assets
│       ├── images/
│       └── icons/
├── docs/                      # Project documentation
├── tests/                     # Test files
├── package.json
└── README.md
```

## Data Flow

### User Journey Flow

```
1. User starts tour
       │
       ▼
2. GPS detects location ─────────────────┐
       │                               │
       ▼                               │
3. Search nearby POIs                   │
       │                               │
       ▼                               │
4. Check cache? ──── Yes ──► Use cached data
       │ No
       ▼
5. Query open sources (OSM, Wikipedia)
       │
       ▼
6. Generate description with AI (Groq)
       │
       ▼
7. Save to cache (SQLite)
       │
       ▼
8. Play audio narration (TTS)
```

## Service Responsibilities

### Location Service
- Fused location provider integration
- Location tracking & updates
- Geofencing for POI proximity

### Map Service
- OpenStreetMap tile rendering
- POI markers display
- Route visualization

### POI Service
- POI data fetching (Overpass API)
- POI filtering & ranking
- Distance calculations

### Wikipedia Service
- Wikipedia content retrieval
- Wikidata enrichment
- Summary generation

### AI Service
- Groq API integration
- Description generation
- Response caching

### Voice Service
- Android TTS management
- Audio queue management
- Language configuration

### Database Service
- SQLite operations
- Cache management
- Offline data storage

## State Management (Zustand)

### App Store
```typescript
interface AppStore {
  // UI State
  isLoading: boolean;
  error: string | null;
  
  // Location State
  currentLocation: Location | null;
  isTracking: boolean;
  
  // POI State
  nearbyPOIs: POI[];
  selectedPOI: POI | null;
  
  // Audio State
  isPlaying: boolean;
  currentTrack: string | null;
  
  // Settings
  settings: AppSettings;
}
```

## Error Handling Strategy

1. **Network Errors**: Graceful degradation to cached data
2. **Location Errors**: User notification with retry option
3. **AI Errors**: Fallback to basic Wikipedia descriptions
4. **TTS Errors**: Visual fallback with transcript display
5. **Database Errors**: Log and attempt recovery

## Performance Considerations

1. **Lazy Loading**: Screens and heavy components
2. **Memoization**: Prevent unnecessary re-renders
3. **Batch Operations**: Database writes grouped
4. **Cache Strategy**: LRU cache with TTL
5. **Image Optimization**: Resize and compress assets

## Security Considerations

1. **API Keys**: Environment variables, never in code
2. **User Data**: Minimal collection, no PII storage
3. **Network**: HTTPS only for external APIs
4. **Permissions**: Request only necessary Android permissions

## Scalability

- City configuration via JSON/YAML files
- Modular service architecture
- Plugin system for new data sources
- Theme customization support

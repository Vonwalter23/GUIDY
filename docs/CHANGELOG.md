# GUIDY - Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

---

## [STAGE 3.2] - 2026-07-17

### Added
- State 'searching' to GpsStatus type:
  - searching: GPS is searching for location
  - active: GPS is receiving valid location updates
  - inactive: GPS is enabled but no movement detected
  - unavailable: GPS is disabled or unavailable
- Debug logging for GPS operations:
  - `[GPS]` prefix for LocationService logs
  - `[GPS Provider]` prefix for LocationProvider logs
- Immediate location request on tracking start:
  - getCurrentLocation() called alongside watchPosition()
  - Faster first fix for better UX

### Changed
- RecorridoScreen now shows clear status messages:
  - "Buscando ubicación..." when gpsStatus = 'searching'
  - "GPS Conectado" when gpsStatus = 'active'
  - Shows "..." instead of "N/A" while searching
- LocationProvider updated:
  - Sets gpsStatus to 'searching' when starting tracking
  - Calls both getCurrentLocation() and startLocationUpdates()
  - Better error handling for location failures
- LocationService updated:
  - Added timeout configuration for getCurrentPosition
  - Improved error messages with user-friendly text
  - Better debug logging

### Fixed
- GPS not delivering coordinates after permission grant:
  - Now requests immediate location on tracking start
  - watchPosition alone can take 30-60 seconds for first fix
  - Combined approach provides faster location acquisition
- Coordinates showing "N/A" instead of actual values:
  - Now shows "..." while searching
  - Status updates immediately to 'searching'

### Documentation
- `docs/STAGE_3_2_ANALYSIS.md` - Complete root cause analysis
- `docs/STAGE_3_2_REPORT.md` - Closure report

---

## [STAGE 3.1] - 2026-07-17

### Added
- Android location permissions to AndroidManifest.xml:
  - ACCESS_FINE_LOCATION
  - ACCESS_COARSE_LOCATION
- Permission flow handling:
  - Permission granted: GPS tracking starts automatically
  - Permission denied: User can retry
  - Permission blocked: Opens app Settings
- Comprehensive test suite for LocationPermissions:
  - Permission granted/denied/blocked tests
  - Error handling tests
  - Settings opening tests
- Documentation:
  - `docs/LOCATION_ENGINE.md` - Complete location engine documentation
  - Permission flow documentation

### Changed
- Updated RecorridoScreen with improved permission UX:
  - Clear permission denied message
  - Permission blocked screen with lock icon
  - Automatic GPS tracking on permission grant
  - Additional info: speed and last update time
- Updated ConfiguracionScreen categories:
  - Cultura
  - Gastronomía
  - Historia y Arquitectura
  - Naturaleza
  - Servicios Cercanos
- Updated LocationPermissions.ts:
  - Better Android version compatibility
  - NEVER_ASK_AGAIN detection
  - Improved error handling

### Fixed
- Permission request callback not working
- GPS tracking not starting after permission grant
- TypeScript errors in permission handling
- LocationService geolocation options

---

## [STAGE 3] - 2026-07-17

### Added
- Map Engine module (`src/services/maps/`):
  - `MapTypes.ts` - TypeScript interfaces for map types
  - `MapConstants.ts` - Map configuration constants (OSM tiles, zoom levels)
  - `MapUtils.ts` - Utility functions for coordinate transformations
  - `MapService.ts` - Core map service singleton
  - `MapProvider.tsx` - React Context provider
  - `useMapStore.ts` - Zustand global store
- OpenStreetMap component (`src/components/OpenStreetMap.tsx`):
  - WebView-based map using Leaflet.js
  - Real-time user location marker
  - Follow/unfollow user mode
  - Pan and zoom gestures
- Integration with Location Engine:
  - Automatic location updates on map
  - Centering on user location
  - GPS status display
- Comprehensive test suite for MapEngine:
  - MapUtils unit tests
  - MapService unit tests
- Documentation (`docs/MAP_ENGINE.md`):
  - Architecture explanation
  - Provider selection rationale
  - Communication with Location Engine
  - Scalability considerations
  - Usage examples

### Changed
- Updated RecorridoScreen to display OpenStreetMap:
  - Map takes 45% of screen height
  - GPS status indicator
  - Coordinate display card
  - Follow/Unfollow button
  - Center on user FAB
- Updated App.tsx to include MapProvider
- Replaced react-native-maps with react-native-webview for OSM

### Dependencies Added
- `react-native-webview` - WebView for map rendering

### Dependencies Removed
- `react-native-maps` - Replaced by WebView solution

### Fixed
- WebView mock for Jest testing
- MapUtils test coverage
- TypeScript type issues

---

## [STAGE 2] - 2026-07-17

### Added
- Complete Location Engine module (`src/services/location/`):
  - `LocationTypes.ts` - TypeScript types for GPS coordinates
  - `LocationPermissions.ts` - Android permission handling
  - `LocationUtils.ts` - Geolocation utility functions
  - `DistanceCalculator.ts` - Haversine formula implementation
  - `MovementDetector.ts` - Movement detection (walking/running/driving)
  - `LocationService.ts` - Main service with getCurrentLocation, startLocationUpdates
  - `LocationProvider.tsx` - React Context provider
  - `useLocationStore.ts` - Zustand global store
- RecorridoScreen with GPS status:
  - GPS status indicator
  - Coordinate display
  - Accuracy indicator
  - Speed display
  - Permission request flow
  - Tracking toggle buttons
- Comprehensive test suite:
  - Jest mocks for Geolocation
  - SafeAreaContext mock
  - Location service tests

### Dependencies Added
- `@react-native-community/geolocation` - GPS API
- `@react-native-community/hooks` - App state hooks

### Documentation
- STAGE_2_REPORT.md - Complete closure report
- GitHub Release v0.0.2-STAGE2

---

## [STAGE 1.5] - 2025-07-20

### Added
- Design System complete:
  - `src/theme/colors.ts` - Brand colors as Design Tokens
  - `src/theme/spacing.ts` - Spacing scale
  - `src/theme/typography.ts` - Typography scale
  - `src/theme/radius.ts` - Border radius scale
  - `src/theme/index.ts` - Unified theme with Design Tokens
- Official brand assets:
  - `src/assets/images/Icono.png` - Official app icon
  - `src/assets/images/Splash.png` - Official splash screen
- Android launcher icons (all densities)
- Android adaptive icons (foreground, background, monochrome)
- Release signing keystore (`guidy-release.jks`)
- `docs/BRANDING.md` - Brand guidelines documentation
- GitHub Actions workflow for automatic APK releases

### Changed
- Updated SplashScreen to use official splash image
- Updated theme to use Design Tokens exclusively
- Updated build.gradle with release signing configuration
- Updated README.md with Stage 1.5 status

### Fixed
- ESLint unused variable in store

---

## [STAGE 1] - 2025-07-20

### Added
- Splash Screen with animated logo
- Home Screen with welcome message and navigation buttons
- Configuracion Screen with interest categories list
- Recorrido Screen with map placeholder
- AppNavigator with React Navigation stack
- Theme system (light/dark) with React Native Paper MD3
- Logo component with Material Community Icons

### Changed
- Updated App.tsx with navigation integration
- Updated screens index with all exports

---

## [STAGE 0] - 2024-XX-XX

### Added
- React Native 0.86.0 project initialization
- TypeScript configuration
- Project folder structure:
  - `src/app/` - App entry point
  - `src/components/` - Reusable components
  - `src/screens/` - Screen components
  - `src/navigation/` - Navigation configuration
  - `src/services/` - Service modules (location, maps, poi, wikipedia, ai, voice, database)
  - `src/hooks/` - Custom React hooks
  - `src/store/` - Zustand state management
  - `src/types/` - TypeScript type definitions
  - `src/utils/` - Utility functions
  - `src/assets/` - Static assets (images, icons)
  - `docs/` - Project documentation
  - `tests/` - Test files

### Dependencies Installed
- `@react-navigation/native` - Navigation framework
- `@react-navigation/native-stack` - Native stack navigator
- `react-native-screens` - Native navigation primitives
- `zustand` - State management
- `react-native-paper` - Material Design components
- `react-native-vector-icons` - Icon library

### Documentation Created
- `docs/PROJECT_CONTEXT.md` - Project vision, mission, and goals
- `docs/ARCHITECTURE.md` - Technical architecture and design
- `docs/STAGE_PLAN.md` - Development roadmap (10 stages)
- `docs/CHANGELOG.md` - This file

### Configuration
- ESLint configured
- Prettier configured
- Jest configured

### Initial App Screen
- Logo placeholder (Guidy text)
- Title: "Guidy"
- Subtitle: "AI Audio Tourist Companion"

---

## [STAGE 4] - Planned

- POI search
- Overpass API
- Distance calculations

## [STAGE 5] - Planned

- Wikipedia integration
- Wikidata enrichment
- Content display

## [STAGE 6] - Planned

- Groq API integration
- AI descriptions
- Caching

## [STAGE 7] - Planned

- Text-to-Speech
- Voice controls
- Audio queue

## [STAGE 8] - Planned

- Complete user flow
- Background tracking
- Preferences

## [STAGE 9] - Planned

- Performance optimization
- Battery improvements
- Polish

## [STAGE 10] - Planned

- Beta release for Trelew
- Production-ready APK

# GUIDY - Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

---

## [STAGE 3.5] - 2026-07-23

### Added
- **Location Engine Certification**: Documento completo `docs/STAGE_3_5_CERTIFICATION.md`

### Certified
- LocationProvider: 0 memory leaks, proper cleanup
- FusedLocationProvider: Singleton, event subscriptions managed
- GuidyLocationModule.kt: LifecycleEventListener, cleanup en destroy
- Zustand Store: Bien estructurado
- LocationStateMachine: Single source of truth

### Verified Fixed
- GPS Loop Disponible/No Disponible (STAGE 3.4B)
- Navegación post-permisos (STAGE 3.4C)
- Memory leaks
- Listeners duplicados
- Crash callbacks reutilizados (STAGE 3.3K)

### Status
**LOCATION ENGINE CERTIFIED AS STABLE** ✅

Ready for STAGE 4 (POIs)

---

## [STAGE 3.4C] - 2026-07-23

### Fixed
- **Permission Flow**: RecorridoScreen ahora usa `requestPermission` del hook `useLocation()`
- El flujo de permisos ahora actualiza Zustand store correctamente

### Root Cause
`RecorridoScreen` importaba `requestLocationPermission` directamente de `LocationPermissions.ts`
que NO actualizaba el store de Zustand. El hook `useLocation()` tiene su propia función
`requestPermission()` que SÍ actualiza el store.

### Files Changed
- `src/screens/RecorridoScreen.tsx`

### Build
- TypeScript: 0 errors
- ESLint: 0 errors, 7 warnings
- Tests: 47 passed, 1 failed (pre-existente)

---

## [STAGE 3.4B] - 2026-07-22

### Added
- **LocationStateMachine**: Nueva máquina de estados como fuente única de verdad
- **Arquitectura simplificada**: Store ahora solo guarda permiso

### Fixed
- **GPS Loop**: `onLocationAvailability` ahora maneja correctamente TRUE y FALSE
- **Contrato**: Sincronizado entre todos los componentes

### Changed
- `LocationProvider.tsx`: Reescrito para usar state machine
- `useLocationStore.ts`: Simplificado
- `FusedLocationProvider.ts`: Actualizado para manejar nuevos eventos
- `GuidyLocationModule.kt`: Corregido loop GPS

### State Machine States
```
IDLE → REQUESTING_PERMISSION → PERMISSION_GRANTED → STARTING_LOCATION → WAITING_FIRST_FIX → TRACKING → STOPPED
```

### Files Changed
| Archivo | Cambio |
|---------|--------|
| `src/services/location/LocationStateMachine.ts` | NUEVO |
| `src/services/location/useLocationStore.ts` | REFACTORIZADO |
| `src/services/location/LocationProvider.tsx` | REFACTORIZADO |
| `src/services/location/FusedLocationProvider.ts` | ACTUALIZADO |
| `src/services/location/index.ts` | ACTUALIZADO |
| `android/.../GuidyLocationModule.kt` | CORREGIDO |

### Build
| Check | Resultado |
|-------|-----------|
| TypeScript | 0 errors |
| ESLint | 0 errors, 7 warnings |
| Tests | 47 passed, 1 failed (pre-existente) |
| Debug APK | Generado |
| Release APK | Generado |

### SHA256
- Debug: `a537a47084da72ebd55c81c0131977eaa6741f824f21d842c4a6ffc8aa8373ac`
- Release: `9880ad9ea86ec507ec6574efc2c4e71df9fe4f227fd7bddc2d36be596f09a4cb`

---

## [STAGE 3.4A] - 2026-07-22

### Added
- **DOCUMENTACIÓN**: Auditoría completa de máquina de estados de ubicación
- **DIAGRAMA**: Flujo completo de estados desde usuario hasta GPS nativo

### Root Cause Analysis

**Problema 1: Loop GPS Disponible ↔ No Disponible**

- **Archivo:** `GuidyLocationModule.kt`
- **Líneas:** 434-447
- **Causa:** `onLocationAvailability()` solo maneja cuando disponibilidad es FALSE
- **Falta:** No hay manejo cuando disponibilidad vuelve a TRUE

```
onLocationAvailability(false) → gpsStatus = 'unavailable'
onLocationAvailability(true)  → ❌ NO SE MANEJA
→ Loop infinito entre 'active' y 'unavailable'
```

**Problema 2: Navegación fallida post-permisos**

- **Análisis:** Flujo de código es correcto
- **Verificación:** Requiere logs en dispositivo físico
- **Pendiente:** Confirmar que startTracking() se ejecuta post-permisos

### Files Added
- `docs/STAGE_3_4A_STATE_MACHINE_AUDIT.md`

### Status
- **AUDITORÍA COMPLETADA**
- **ESPERANDO APROBACIÓN HUMANA**
- **NO se implementaron fixes (STAGE de auditoría únicamente)**

---

## [STAGE 3.4] - 2026-07-22

### Fixed
- **CONTRATO DESINCRONIZADO**: TurboModule esperaba 3 argumentos pero TypeScript pasaba 1
- **ROOT CAUSE**: GuidyLocationModule.kt todavía tenía firma con callbacks

### Root Cause Analysis

**El Problema:**
El módulo nativo `GuidyLocationModule.kt` declaraba:
```kotlin
fun startLocationUpdates(options: ReadableMap, watchCallback: Callback, errorCallback: Callback)
```

Pero la interfaz TypeScript solo llamaba con 1 argumento:
```typescript
GuidyLocation.startLocationUpdates(mergedOptions)
```

**Evidencia:**
```
TurboModule method: startLocationUpdates called with 1 arguments expected 3 arguments
```

### Solution Applied

1. **GuidyLocationModule.kt:**
   - Cambió firma a `startLocationUpdates(options: ReadableMap)` (1 parámetro)
   - Removió `pendingWatchCallbacks` y `pendingErrorCallback`
   - Removió `safeInvokeWatchCallback()` y `safeInvokeErrorCallback()`
   - Usa SOLO `sendEvent()` para errores

2. **Contrato Sincronizado:**
   - TypeScript: 1 parámetro
   - Kotlin: 1 parámetro
   - Eventos para actualizaciones continuas

### Files Changed
- `android/app/src/main/java/com/guidy/location/GuidyLocationModule.kt`

### Quality Checks
- TypeScript: 0 errors
- ESLint: 0 errors, 10 warnings (pre-existentes)

---

## [STAGE 3.3K] - 2026-07-22

### Fixed
- **ROOT CAUSE**: React Native callbacks have single-use semantics
- **PROBLEMA**: App crasheaba con "Callback arg cannot be called more than once"
- **PROBLEMA**: Navegación no funcionaba después de permisos

### Root Cause Analysis

**El Problema:**
React Native Native Modules usan callbacks que tienen semantics de "single-use". 
Cuando un callback nativo se invoca más de una vez, React Native crashea con SIGABRT.

**Evidencia del Crash Log:**
```
11:04:09.681 - Location update received
11:04:09.681 - ReactNativeJNI: Callback arg cannot be called more than once
11:04:10.345 - Fatal signal 6 (SIGABRT)
```

**Causa Raíz:**
El módulo nativo `GuidyLocationModule.kt` estaba usando `Callback.invoke()` 
para entregar actualizaciones de ubicación continuas. Esto viola las semantics 
de callbacks de React Native.

### Solution Applied

**STAGE 3.3K: Cambió el puente JS↔Native para usar SOLO eventos**

1. **GuidyLocationModule.kt:**
   - Removió callbacks del método `startLocationUpdates`
   - Ahora usa `sendEvent()` para todas las actualizaciones de ubicación
   - Implementó `LocationCallback` que envía eventos a JS

2. **FusedLocationProvider.ts:**
   - Actualizó interfaz para no pasar callbacks al nativo
   - Listener de eventos `GuidyLocationUpdate` recibe actualizaciones
   - Callbacks internos se invocan desde código JS, no nativo

3. **LocationService.ts:**
   - Sin cambios necesarios - usa la misma interfaz

### Arquitectura del Bridge (Post-Fix)

```
JS Layer                          Native Layer
┌──────────────────────┐          ┌──────────────────────────┐
│ FusedLocationProvider│          │ GuidyLocationModule.kt   │
│                      │          │                          │
│ startLocationUpdates │ ───────► │ startLocationUpdates()   │
│   (no callbacks)    │          │   (sin callbacks)       │
│                      │          │                          │
│ Event Listeners:     │          │ onLocationResult():      │
│ - GuidyLocationUpdate│ ◄─────── │   sendEvent()            │
│ - GuidyLocationError │          │   (NATIVE EVENTS ONLY)   │
│ - GuidyLocationStatus│          │                          │
└──────────────────────┘          └──────────────────────────┘
```

### Files Changed
- `android/app/src/main/java/com/guidy/location/GuidyLocationModule.kt`
- `src/services/location/FusedLocationProvider.ts`

### Evidence
- Build Debug: SUCCESS
- Build Release: SUCCESS
- TypeScript: 0 errors
- APK Debug SHA-256: `5f072b8524da82f1a4439ad39944222676aee3d2edfeb35dd2725d6d22bc7b53`
- APK Release SHA-256: `f5146d461f906e2daeb989d0605642b5b8bb3b47509b5a4622b320e9ac6bf6a3`

---

## [STAGE 3.3J] - 2026-07-22

### Fixed
- **PROBLEMA 1**: App no navegaba al mapa después de otorgar permisos
- **PROBLEMA 2**: Crash "Callback arg cannot be called more than once"

### Root Cause Analysis

**Problema 1 - Navegación:**
- El `useEffect` en `RecorridoScreen.tsx` tenía `startTracking` como dependencia
- Esto causaba re-ejecuciones cuando `startTracking` se recreaba
- El flujo de permisos no esperaba correctamente

**Problema 2 - Crash:**
- El callback de ubicación se procesaba múltiples veces
- El `useEffect` en `RecorridoScreen` se ejecutaba múltiples veces
- Causaba múltiples inicializaciones de tracking

### Changes Applied

1. **RecorridoScreen.tsx:**
   - Agregado `trackingStartedRef` para evitar múltiples llamadas a `startTracking()`
   - Removido `startTracking` de las dependencias del `useEffect`
   - El ref se resetea cuando `isTracking` cambia a `false`

2. **LocationProvider.tsx:**
   - Agregado `lastLocationTimestampRef` para prevenir procesamiento duplicado
   - Verificación de timestamp de ubicación antes de procesar
   - Si la misma ubicación llega dos veces (mismo timestamp), se ignora

### Evidence from Crash Log
```
PID: 16542
Time: 11:04:10
Signal: SIGABRT (6)
Abort message: 'Callback arg cannot be called more than once'
Backtrace: JCxxCallbackImpl::invoke
```

### Files Changed
- `src/screens/RecorridoScreen.tsx`
- `src/services/location/LocationProvider.tsx`

---

## [STAGE 3.3I] - 2026-07-22

### Fixed
- **Infinite loop of startTracking() calls** causing crash
- Added `isStartingTrackingRef` to prevent concurrent `startTracking()` calls
- Removed redundant `getCurrentLocation()` call after starting tracking

### Root Cause
- `startTracking()` was being called multiple times in quick succession
- Each call started a new tracking session, causing callback duplication
- The Zustand `getState()` returned stale values, not detecting the in-progress state

### Changes
- Added `isStartingTrackingRef` flag to prevent concurrent calls
- Removed redundant `locationService.getCurrentLocation()` in `startTracking()`
- Reset flag on `stopTracking()` and on error

### Files Changed
- `src/services/location/LocationProvider.tsx`

---

## [STAGE 3.3H] - 2026-07-22

### Fixed
- **Callback invoked multiple times** causing SIGABRT crash
- Removed duplicate event emission in onLocationResult
- Now using only callback OR event, not both

### Root Cause
- The callback was being invoked by BOTH:
  1. Direct callback from native module
  2. Event listener for GuidyLocationUpdate
- This caused "Callback arg cannot be called more than once" crash

### Files Changed
- `android/app/src/main/java/com/guidy/location/GuidyLocationModule.kt`

---

## [STAGE 3.3G] - 2026-07-22

### Fixed
- **ObjectAlreadyConsumedException: Map already consumed** in GuidyLocationModule.kt
- Created separate WritableMap instances for callback and event

### Root Cause
- WritableNativeMap can only be used once in React Native bridge

---

## [STAGE 3.3F] - 2026-07-22

### Fixed
- **ELIMINATED INFINITE RENDER LOOP** in LocationProvider
- Replaced full store subscription with individual Zustand selectors
- Used refs for store actions to avoid callback recreation
- Added `permissionCheckRef` to prevent multiple permission checks
- Memoized contextValue to prevent unnecessary re-renders
- Added comprehensive instrumentation logs

### Architecture Changes
- `store` removed from all useEffect dependency arrays
- Callbacks now use `[isMounted]` or `[]` as dependencies
- Individual Zustand selectors replace full store subscription
- Store actions accessed via refs (`setLocationRef.current()`)

### Instrumentation Added
- `[RENDER]` - Render counter for diagnostics
- `[LOCATION]` - Location update events
- `[ERROR]` - Error handling events
- `[TRACKING]` - Tracking start/stop events
- `[PERMISSION]` - Permission check events
- `[CLEANUP]` - Unmount cleanup events
- `[APP_STATE]` - App state change events

### QA
- TypeScript Check (`tsc --noEmit`): ✅ 0 errors
- ESLint: ✅ 0 errors, 9 warnings (pre-existing, unrelated)

---

## [STAGE 3.3E] - 2026-07-21

### Fixed
- Fixed duplicate `isTracking` identifier in FusedLocationProvider.ts (TS2300 error)
- Renamed property `isTracking` to `isCurrentlyTrackingState` to avoid conflict with method
- Fixed orphaned event subscriptions (`updateSubscription`, `errorSubscription`)
- Added instance properties for all event subscriptions
- Implemented proper cleanup in `destroy()` method

### Changes
- Renamed internal tracking state property to avoid naming conflict
- Stored all NativeEventEmitter subscriptions as instance properties
- Improved `destroy()` method to properly remove all subscriptions
- Removed duplicate `isTracking()` method that caused TypeScript error

### QA
- TypeScript Check (`tsc --noEmit`): ✅ 0 errors
- ESLint: ✅ 0 errors, 6 warnings (pre-existing, unrelated)

### Build
- Debug APK: BUILD SUCCESSFUL
- SHA-256: `23301766d1f51b908f9ab74685411b3e315368441aab032badbb99c3f1595624`

---

## [STAGE 3.3D] - 2026-07-21

### Added
- Forensic analysis report for persistent GPS crash issue
- Identified root cause: TypeScript duplicate identifier error
- Identified orphaned event subscriptions

---

## [STAGE 3.3C] - 2026-07-21

### Fixed
- Added Google Play Services availability check
- Added `isModuleReady` flag for crash protection
- Added try-catch in initialization and callbacks
- Added safe callback invocations

---

## [STAGE 3.3A] - 2026-07-21

### Fixed
- Fixed LocationRequest API compatibility issue in GuidyLocationModule.kt
- Updated LocationRequest creation to use default constructor with property setters
- Changed from deprecated constructor `LocationRequest(fastestInterval, interval)` to default constructor with properties
- Now uses:
  - `locationRequest.interval = interval`
  - `locationRequest.fastestInterval = fastestInterval`
  - `locationRequest.smallestDisplacement = distanceFilter.toFloat()`
  - `locationRequest.priority = priority`

### Build
- Debug APK: BUILD SUCCESSFUL
- Release APK: BUILD SUCCESSFUL

---

## [STAGE 3.3] - 2026-07-21

### Added
- Native Module Kotlin: `GuidyLocationModule.kt`
  - Uses Android FusedLocationProviderClient via Google Play Services
  - Implements getCurrentLocation() with timeout
  - Implements requestLocationUpdates() for continuous tracking
  - Proper error handling and permission flow
- Native Module Package: `GuidyLocationPackage.kt`
- TypeScript wrapper: `FusedLocationProvider.ts`
  - Provides unified API for React Native
  - Event emitter integration for location updates

### Changed
- Replaced `@react-native-community/geolocation` with custom FusedLocationProviderClient implementation
- LocationService completely rewritten to use new FusedLocationProvider
- LocationTypes now includes `provider` field in LocationData interface
- MainApplication.kt registers GuidyLocationPackage

### Dependencies Added
- `com.google.android.gms:play-services-location:21.3.0`

### Dependencies Removed
- `@react-native-community/geolocation: ^3.4.0`

### Fixed
- GPS never delivering coordinates issue
- Now uses FusedLocationProviderClient which is the optimal GPS provider for Android
- Faster first fix with getCurrentLocation()
- Proper tracking with requestLocationUpdates()

### Documentation
- `docs/STAGE_3_3_REPORT.md` - Complete STAGE 3.3 closure report

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

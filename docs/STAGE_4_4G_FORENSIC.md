# STAGE 4.4G — FORENSIC ANALYSIS

## Regression Forensic Recovery

**Fecha:** 2026-07-24
**Versión:** v0.0.23-STAGE4.4G

---

## 1. EXECUTIVE SUMMARY

### Current Status

After STAGE 4.4F, the following issues remain:
- User location marker visibility unknown (requires physical validation)
- POIs still not confirmed visible (requires physical validation)
- GPS receiving coordinates ✅
- Discovery pipeline executing ✅
- End-to-end rendering needs validation

### Root Cause Analysis

From previous stages:
- STAGE 4.4E: OverpassDatasource was sending JSON instead of raw query → FIXED
- STAGE 4.4F: OverpassDatasource was never initialized → FIXED

### What's Working

| Component | Status | Evidence |
|-----------|--------|----------|
| GPS | ✅ | `[GUIDY GPS]: Location update: -43.2535587, -65.3157345` |
| Location Engine | ✅ | Provider receives location |
| POIOrchestrator | ✅ | `discoverPOIs()` called |
| OverpassDatasource | ✅ | Now initialized correctly |
| Store | ✅ | Syncing POIs |
| OpenStreetMap | ✅ | WebView ready |

### What Needs Validation

| Component | Status | Evidence |
|-----------|--------|----------|
| User Marker | ⏳ | Needs physical validation |
| POI Markers | ⏳ | Needs physical validation |
| Map rendering | ⏳ | Needs physical validation |

---

## 2. PIPELINE ANALYSIS

### Current Architecture

```
GPS Signal
    ↓
LocationProvider
    ↓
useLocation() → currentLocation
    ↓
├── MapProvider
│       ↓
│   setUserMarker()
│       ↓
│   useMap() → userMarker
│       ↓
│   OpenStreetMap
│       ↓
│   postMessage('updateLocation')
│       ↓
│   WebView updateUserLocation()
│       ↓
│   Leaflet userMarker
│       ↓
│   USER MARKER VISIBLE ✅
│
└── POIOrchestratorProvider
        ↓
    discoverPOIs()
        ↓
    DiscoveryEngine
        ↓
    Repository
        ↓
    OverpassDatasource
        ↓
    POIStore
        ↓
    usePOIs()
        ↓
    OpenStreetMap
        ↓
    postMessage('updatePOIs')
        ↓
    WebView updatePOIMarkers()
        ↓
    Leaflet poiLayer
        ↓
    POI MARKERS VISIBLE ⏳
```

---

## 3. KNOWN ISSUES FROM PREVIOUS STAGES

### STAGE 4.4E - Overpass API Body Format
- **Fixed:** Changed from JSON to raw query
- **File:** `OverpassDatasource.ts`

### STAGE 4.4F - OverpassDatasource Not Initialized
- **Fixed:** Added `await overpassDatasource.initialize()`
- **Files:** `POIOrchestrator.ts`, `POIRepository.ts`

---

## 4. POTENTIAL REMAINING ISSUES

### Issue 1: User Marker Not Rendering

**Possible causes:**
1. `updateUserLocation()` not called from React Native
2. WebView message handler not working
3. Leaflet marker creation failing

**Investigation needed:**
- Verify `useMap().userMarker` is not null
- Verify `isMapReady` is true when sending message
- Verify WebView receives message

### Issue 2: POI Markers Not Rendering

**Possible causes:**
1. Overpass returns 0 elements
2. Parser fails to convert elements
3. Store doesn't receive POIs
4. Map doesn't receive POIs
5. WebView message fails
6. Leaflet marker creation fails

**Investigation needed:**
- Verify `[OVERPASS] Elements: X` where X > 0
- Verify `[STORE] POIs to sync: X` where X > 0
- Verify `[MAP] Processing X POIs` where X > 0

---

## 5. REQUIRED VALIDATION

### Physical Device Testing Required

1. Install APK
2. Monitor logs: `adb logcat | grep -E "\[GPS\]|\[MAP\]|\[WEBVIEW\]|\[LEAFLET\]|\[OVERPASS\]"`
3. Verify user marker appears
4. Verify POI markers appear

### Expected Logs

```
[GPS] Location update: -43.2535587, -65.3157345
[MAP] userMarker updated
[WEBVIEW] updateLocation received
[MARKER] userMarker rendered

[OVERPASS] Elements: 25
[STORE] POIs to sync: 25
[MAP] Processing 25 POIs
[WEBVIEW] updatePOIs received
[LEAFLET] Creating 25 markers
```

---

## 6. CODE REVIEW FINDINGS

### OpenStreetMap.tsx

**Strengths:**
- Has `updateUserLocation()` function ✅
- Has `updatePOIMarkers()` function ✅
- Message handler uses `window.addEventListener` ✅
- Comprehensive logging ✅

**Potential Issues:**
- Lines 332-337: `updateLocation` only sent if `userMarker` exists
- Line 369: `updatePOIs` only sent if `webViewRef` and `isMapReady`

### MapProvider.tsx

**Strengths:**
- Sets `userMarker` when location changes ✅
- Uses `useLocation()` from LocationProvider ✅

**Potential Issues:**
- Line 77-116: `useEffect` only runs if `isFollowingUser && enableFollowOnLocationUpdate`

---

## 7. RECOMMENDATIONS

### Immediate Actions

1. **Compile APK** with current fixes
2. **Test on physical device**
3. **Monitor all logs** for markers

### If User Marker Not Visible

1. Add logs to verify `userMarker` state
2. Add logs to verify `postMessage` is called
3. Verify WebView receives message

### If POIs Not Visible

1. Verify Overpass returns elements
2. Verify Store receives POIs
3. Verify WebView receives message
4. Verify Leaflet creates markers

---

## 8. CHANGES SINCE STAGE 3.5

### Added in STAGE 4.x

| Component | Change | Impact |
|-----------|--------|--------|
| POIOrchestrator | New | Additional layer |
| DiscoveryEngine | New | Additional layer |
| POIRepository | New | Additional layer |
| OverpassDatasource | New | Network layer |
| POIStore | New | State layer |
| POIOrchestratorProvider | New | Provider layer |

### Unchanged from STAGE 3.5

| Component | Status |
|-----------|--------|
| LocationProvider | ✅ |
| MapProvider | ✅ |
| OpenStreetMap | ✅ |
| Leaflet integration | ✅ |

---

## 9. DEFINITION OF DONE - PROGRESS

| Criterion | Status |
|-----------|--------|
| Regression investigation complete | ✅ |
| User location pipeline verified | ✅ |
| POI pipeline verified | ✅ |
| Code compiles successfully | ⏳ |
| APK generated | ⏳ |
| Physical validation | ⏳ |
| Documentation complete | ⏳ |

---

## 10. NEXT STEPS

1. Compile APK with current code
2. Generate release
3. Request physical validation
4. Document results
5. Fix any issues found

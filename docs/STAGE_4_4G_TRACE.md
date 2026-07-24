# STAGE 4.4G — END-TO-END TRACE

## Complete Pipeline Instrumentation Guide

**Fecha:** 2026-07-24
**Versión:** v0.0.23-STAGE4.4G

---

## OBJECTIVE

Provide a complete trace of all components in the POI pipeline to identify where execution diverges from expected behavior.

---

## PIPELINE STAGES

### Stage 1: GPS Signal

**Component:** Android LocationManager + Google Play Services

**Expected Log:**
```
[GPS] Location update: -43.2535587, -65.3157345, acc: 11.522m, provider: fused
```

**Code Location:** `android/app/src/main/java/.../FusedLocationProvider.ts`

---

### Stage 2: Location Provider

**Component:** `LocationProvider.tsx`

**Expected Log:**
```
[GUIDY GPS] Location update received
[GUIDY GPS] FusedLocationProvider ready
[PROVIDER] Location update: -43.253559, -65.315735
```

**Code Location:** `src/services/location/LocationProvider.tsx`

---

### Stage 3: Map Provider

**Component:** `MapProvider.tsx`

**Expected Log:**
```
[MAP] userMarker updated: -43.253559, -65.315735
[MAP] Region updated: -43.253559, -65.315735
```

**Code Location:** `src/services/maps/MapProvider.tsx:77-116`

---

### Stage 4: OpenStreetMap Component

**Component:** `OpenStreetMap.tsx`

**Expected Log:**
```
[OPENSTREETMAP] POIs changed
[OPENSTREETMAP] POIs count: 0
[OPENSTREETMAP] isMapReady: true
[OPENSTREETMAP] Sending updatePOIs message
[OPENSTREETMAP] postMessage called successfully
```

**Code Location:** `src/components/OpenStreetMap.tsx`

---

### Stage 5: WebView Message Handler

**Component:** JavaScript in WebView HTML

**Expected Log:**
```
[WEBVIEW] Received message: {"type":"updatePOIs","pois":[...]}
[WEBVIEW] updatePOIs received, count: 0
```

**Code Location:** `src/components/OpenStreetMap.tsx:232-255`

---

### Stage 6: Leaflet Marker Creation

**Component:** Leaflet.js in WebView

**Expected Log:**
```
[MAP] updatePOIMarkers called
[MAP] POIs array is empty, returning
```

Or if POIs exist:
```
[MAP] Processing 25 POIs
[MAP] POI 0 is valid, creating marker at -43.3001, -65.1028
[MAP] Marker 0 added successfully
[MAP] Final: validCount=25, invalidCount=0
[MAP] poiLayer has 25 layers
```

**Code Location:** `src/components/OpenStreetMap.tsx:126-197`

---

### Stage 7: POI Orchestrator

**Component:** `POIOrchestrator.ts`

**Expected Log:**
```
[ORCHESTRATOR] updateLocation called
[ORCHESTRATOR] Location: -43.253559, -65.315735
[ORCHESTRATOR] discoverPOIs called
[ORCHESTRATOR] isInitialized: true
[ORCHESTRATOR] Calling discoveryEngine.search() (triggers debouncer)...
[ORCHESTRATOR] Waiting for debouncer to fire (300ms + search time)...
[ORCHESTRATOR] Results from DiscoveryEngine: 0 POIs
```

**Code Location:** `src/services/poi/POIOrchestrator.ts:373-459`

---

### Stage 8: Discovery Engine

**Component:** `DiscoveryEngine.ts`

**Expected Log:**
```
[DISCOVERY] search() called
[DISCOVERY] isInitialized: true
[DISCOVERY] currentLocation: -43.253559, -65.315735
[DISCOVERY] isInCooldown: false
[DISCOVERY] Scheduling search via debouncer...
[DISCOVERY] performSearch() executing...
[DISCOVERY] Cache MISS
[DISCOVERY] Calling poiRepository.searchPOIs...
```

**Code Location:** `src/services/poi/discovery/DiscoveryEngine.ts:343-374`

---

### Stage 9: POI Repository

**Component:** `POIRepository.ts`

**Expected Log:**
```
[REPOSITORY] SEARCH START
[REPOSITORY] Location: -43.253559, -65.315735
[REPOSITORY] Radius: 150m
[REPOSITORY] Default source: overpass
[REPOSITORY] Registered datasources: overpass
[REPOSITORY] Query started with source: overpass
```

**Code Location:** `src/services/poi/POIRepository.ts:80-130`

---

### Stage 10: Overpass Datasource

**Component:** `OverpassDatasource.ts`

**Expected Log:**
```
[OVERPASS] SEARCH START
[OVERPASS] Location: -43.253559, -65.315735
[OVERPASS] Radius: 150m
[OVERPASS] HTTP Request starting...
[OVERPASS] Query preview: [out:json][timeout:25];(node["amenity=restaurant"](around:150,-43.253559,-65.315735);...
[OVERPASS] HTTP Response received
[OVERPASS] Status: 200
[OVERPASS] Elements: 25
[OVERPASS] SEARCH END
```

**Code Location:** `src/services/poi/datasources/OverpassDatasource.ts:209-247`

---

### Stage 11: POI Store

**Component:** `POIStore.ts`

**Expected Log:**
```
[STORE] Syncing POIs with store
[STORE] POIs to sync: 25
[STORE] Calling store.setPOIs(25)...
[STORE] Store synced successfully
```

**Code Location:** `src/services/poi/usePOIStore.ts`

---

## COMPLETE TRACE TEMPLATE

Use this command to monitor all stages:

```bash
adb logcat | grep -E \
"\[GPS\]|\[GUIDY\]|\[PROVIDER\]|\[MAP\]|\[OPENSTREETMAP\]|\
\[WEBVIEW\]|\[MAP\]|\[ORCHESTRATOR\]|\[DISCOVERY\]|\
\[REPOSITORY\]|\[OVERPASS\]|\[STORE\]"
```

## EXPECTED COMPLETE LOG

```
[GPS] Location update: -43.2535587, -65.3157345
[PROVIDER] Location update: -43.253559, -65.315735
[MAP] userMarker updated
[ORCHESTRATOR] discoverPOIs called
[DISCOVERY] performSearch() executing...
[REPOSITORY] SEARCH START
[OVERPASS] SEARCH START
[OVERPASS] HTTP Response received
[OVERPASS] Elements: 25
[REPOSITORY] Found 25 POIs from overpass
[DISCOVERY] Search completed: 25 POIs
[STORE] POIs to sync: 25
[OPENSTREETMAP] POIs changed
[OPENSTREETMAP] POIs count: 25
[WEBVIEW] updatePOIs received, count: 25
[MAP] Processing 25 POIs
[MAP] Final: validCount=25, invalidCount=0
```

---

## TROUBLESHOOTING

### Problem: No GPS logs
- Check GPS permissions
- Check location services enabled
- Check Google Play Services

### Problem: No discovery logs
- Check orchestrator is initialized
- Check location is available

### Problem: No overpass logs
- Check network connection
- Check datasource is initialized

### Problem: 0 Elements from Overpass
- Check query format
- Check coordinates are valid
- Test query manually at https://overpass-api.de/api/interpreter

### Problem: POIs not in map
- Check WebView receives message
- Check Leaflet creates markers
- Check markers are in viewport

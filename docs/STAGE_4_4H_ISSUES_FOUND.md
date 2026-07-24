# STAGE 4.4H — ISSUES FOUND FROM PHYSICAL VALIDATION

## Physical Validation Results

**Fecha:** 2026-07-24
**Versión:** v0.0.24-STAGE4.4H

---

## VALIDATION RESULTS

| Test | Result |
|------|--------|
| 1. Mapa visible | ✅ YES |
| 2. Marcador de usuario visible | ❌ NO |
| 3. POIs visibles | ❌ NO |

---

## PROBLEMA 1: Overpass API Error 400

### Log Evidence
```
[OVERPASS] HTTP Response received
[OVERPASS] Status: 400
[OVERPASS] HTTP Error: 400
[OVERPASS] Error body: <?xml version="1.0" encoding="UTF-8"?>
```

### Root Cause
La query Overpass estaba malformada. El código generaba:
```
node["amenity=restaurant","amenity=cafe"](around:150,-43.253572,-65.315725)
```

Pero Overpass espera:
```
node["amenity"~"restaurant|cafe"](around:150,-43.253572,-65.315725)
```

### Fix Applied
Modificado `buildSearchQuery()` para usar regex patterns:
```typescript
const amenityRegex = amenityTypes.join('|');
// Genera: "restaurant|cafe|bar|..."
node["amenity"~"${amenityRegex}"](around:${radius},${latitude},${longitude});
```

---

## PROBLEMA 2: Marcador de Usuario No Visible

### Root Cause
El flujo de ubicación no estaba generando logs para depuración. Se agregaron logs a:
- MapProvider
- OpenStreetMap

### Logs Agregados
```typescript
// MapProvider.tsx
console.log('[MAP PROVIDER] useLocation hook called, currentLocation:', ...);
console.log('[MAP PROVIDER] Updating user marker with location:', ...);

// OpenStreetMap.tsx
console.log('[OPENSTREETMAP] User marker effect triggered');
console.log('[OPENSTREETMAP] userMarker: exists|null');
console.log('[OPENSTREETMAP] Sending updateLocation to WebView');
```

### Next Step
Con estos logs podemos identificar exactamente dónde se rompe el flujo.

---

## CHANGES MADE

### 1. OverpassDatasource.ts - Fixed Query Format

**Before:**
```typescript
const amenityFilter = amenityTypes.map(t => `"amenity=${t}"`).join(',');
// Generaba: "amenity=restaurant","amenity=cafe"...
```

**After:**
```typescript
const amenityRegex = amenityTypes.join('|');
// Genera: restaurant|cafe|bar...
node["amenity"~"${amenityRegex}"](around:${radius},${latitude},${longitude});
```

### 2. MapProvider.tsx - Added Debug Logs

```typescript
console.log('[MAP PROVIDER] useLocation hook called, currentLocation:', currentLocation?.latitude, currentLocation?.longitude);
console.log('[MAP PROVIDER] Updating user marker with location:', ...);
```

### 3. OpenStreetMap.tsx - Added Debug Logs

```typescript
console.log('[OPENSTREETMAP] User marker effect triggered');
console.log('[OPENSTREETMAP] userMarker: exists|null');
console.log('[OPENSTREETMAP] Sending updateLocation to WebView');
```

---

## APK INFORMATION

| Type | SHA256 |
|------|--------|
| Debug | `d27b270cb660ca6ba868e12e6dc96634448c320a4c49a880fe953adb858291c6` |
| Release | `28f56998932f48103f953b4f3966ec287c30bad48f37b23b4ea60a0444dc296a` |

---

## NEXT STEPS

1. Install new APK
2. Check logs for `[MAP PROVIDER]`
3. Check logs for `[OPENSTREETMAP]`
4. Verify if Overpass returns elements now
5. Verify if user marker appears

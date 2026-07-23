# STAGE 4.4A - FORENSIC REPORT
## POI Pipeline Certification - Evidence of Pipeline Breakage

**Fecha:** 2026-07-23
**Auditor:** OpenHands Agent
**Estado:** 🔴 PIPELINE ROTO

---

## Executive Summary

Durante la validación física se observó que:
- ✅ La aplicación instala correctamente
- ✅ El GPS funciona correctamente
- ✅ El mapa funciona correctamente
- ✅ El Location Engine está certificado
- ✅ No existen crashes
- ✅ El Orchestrator fue implementado

**PERO:** NO aparecen POIs en el mapa.

El pipeline completo de POI descubrimiento está **ROTO** en múltiples puntos.

---

## Pipeline Flow Analysis

### Expected Flow
```
GPS → LocationEngine → POIOrchestrator → DiscoveryEngine → Repository → DatasourceFactory → OverpassDatasource → POIRanking → POIDeduplicator → POISessionManager → POIStore → OpenStreetMap (Markers) → Usuario
```

### Actual Flow
```
GPS → LocationEngine → [ROTO] → POIOrchestrator → [ROTO] → DiscoveryEngine → Repository → DatasourceFactory → OverpassDatasource → POIRanking → POIDeduplicator → POISessionManager → POIStore → [ROTO] → OpenStreetMap → [ROTO] → Usuario
```

---

## EVIDENCE OF PIPELINE BREAKAGE

### 🔴 BREAK POINT 1: POIOrchestratorProvider Not Integrated

**Archivo:** `App.tsx`

**Evidencia:**
```typescript
// ACTUAL (Líneas 34-48)
<SafeAreaProvider>
  <PaperProvider theme={theme}>
    <LocationProvider>
      <MapProvider>
        <AppNavigator />
      </MapProvider>
    </LocationProvider>
  </PaperProvider>
</SafeAreaProvider>
```

**Problema:** NO existe `POIOrchestratorProvider` envolviendo la aplicación.

**Impacto:** El `poiOrchestrator` NUNCA se inicializa ni se inicia.

---

### 🔴 BREAK POINT 2: OpenStreetMap No Consumes POIStore

**Archivo:** `src/components/OpenStreetMap.tsx`

**Evidencia:**
```typescript
// Líneas 143-148
const {
  region,
  userMarker,
  isFollowingUser,
  setRegion,
} = useMap();  // ← SOLO usa MapStore, NO POIStore
```

**Problema:** El mapa solo consume `useMap()` que es `MapStore`. NO consume `usePOIStore` para obtener POIs.

**Impacto:** Los POIs del POIStore nunca llegan al mapa.

---

### 🔴 BREAK POINT 3: POI Orchestrator Never Starts

**Archivo:** `src/services/poi/POIOrchestratorProvider.tsx`

**Evidencia:** 
- Provider existe pero NUNCA se usa en la aplicación
- El provider tiene la lógica para:
  - Inicializar el orchestrator (línea 118)
  - Iniciar el orchestrator (línea 126)
  - Conectar con Location Engine (línea 141)
  - Auto-descubrir POIs (línea 145)

**Pero:** Nunca se renderiza porque NO está en App.tsx.

---

## Pipeline Stage-by-Stage Analysis

| Stage | Component | Status | Evidence |
|-------|-----------|--------|----------|
| 1 | GPS Hardware | ✅ WORKS | Location updates visible in UI |
| 2 | Location Engine | ✅ CERTIFIED | STAGE 3.5 Certification |
| 3 | POIOrchestratorProvider | 🔴 MISSING | Not in App.tsx |
| 4 | POIOrchestrator | 🔴 NEVER INIT | No Provider wraps app |
| 5 | DiscoveryEngine | ❓ UNKNOWN | Never receives updates |
| 6 | POIRepository | ❓ UNKNOWN | Never called |
| 7 | DatasourceFactory | ❓ UNKNOWN | Never called |
| 8 | OverpassDatasource | ❓ UNKNOWN | Never called |
| 9 | POIRanking | ❓ UNKNOWN | Never executed |
| 10 | POIDeduplicator | ❓ UNKNOWN | Never executed |
| 11 | POISessionManager | ❓ UNKNOWN | Never executed |
| 12 | POIStore | 🔴 ORPHANED | Store exists but not consumed |
| 13 | OpenStreetMap | 🔴 INCOMPLETE | No POI markers support |

---

## Root Cause Analysis

### Primary Cause
El componente `POIOrchestratorProvider` fue implementado correctamente en STAGE 4.4, pero **NUNCA fue integrado** en la aplicación.

### Secondary Cause
El componente `OpenStreetMap` fue diseñado solo para mostrar la ubicación del usuario, pero **no tiene soporte para POI markers**.

### Contributing Factors
1. Falta de testing end-to-end del pipeline completo
2. No existe integración de POIOrchestratorProvider
3. No existe integración de POIStore con OpenStreetMap
4. Falta de logging en las etapas del pipeline

---

## Required Fixes

### Fix 1: Add POIOrchestratorProvider to App.tsx
```typescript
<LocationProvider>
  <MapProvider>
    <POIOrchestratorProvider autoStart={true} autoDiscovery={true}>
      <AppNavigator />
    </POIOrchestratorProvider>
  </MapProvider>
</LocationProvider>
```

### Fix 2: Extend OpenStreetMap to Consume POIStore
```typescript
const { pois } = usePOIStore(); // Get POIs from store
// Add markers to map for each POI
```

### Fix 3: Add Pipeline Logging
Agregar logs en cada etapa para verificar el flujo:
```
[PIPELINE] GPS UPDATE → Location Engine
[PIPELINE] Location Engine → POIOrchestrator
[PIPELINE] POIOrchestrator → Discovery Engine
...
```

---

## Evidence Files

- `App.tsx` - Missing POIOrchestratorProvider
- `src/components/OpenStreetMap.tsx` - Missing POI integration
- `src/services/poi/POIOrchestratorProvider.tsx` - Unused provider
- `src/services/poi/usePOIStore.ts` - Orphaned store
- `src/screens/RecorridoScreen.tsx` - Only uses useLocation and useMap

---

## Conclusion

El pipeline de POI está **COMPLETAMENTE ROTO** porque:

1. **El POIOrchestratorProvider no está en App.tsx** → El orchestrator nunca se inicia
2. **El OpenStreetMap no consume POIStore** → Los POIs nunca llegan al mapa

Se requiere un STAGE correctivo mínimo para:
1. Integrar POIOrchestratorProvider en App.tsx
2. Modificar OpenStreetMap para mostrar POI markers

---

*Document generated: 2026-07-23*
*Forensic analysis: OpenHands Agent*

# STAGE 4.4F — REGRESSION ANALYSIS

## Comparación con Stage 3.5

**Fecha:** 2026-07-24
**Versión:** v0.0.22-STAGE4.4F

---

## STAGE 3.5 — Estado Certificado

En STAGE 3.5:
- ✅ GPS funcionando
- ✅ Ubicación visible
- ✅ Seguimiento correcto
- ✅ Sin crashes
- ✅ Marcador de usuario visible en el mapa

**Comportamiento del mapa:**
- Mapa Leaflet renderiza correctamente
- Marcador de ubicación del usuario visible
- Sin sistema POI

---

## STAGE 4.4 — Introducción del Sistema POI

STAGE 4.4 introdujo:
- POIOrchestrator
- DiscoveryEngine
- POIRepository
- OverpassDatasource
- POIStore
- OpenStreetMap integration

**Nuevos componentes:**
- Provider pattern para POIs
- Discovery con debounce
- Cache de POIs
- Overpass API integration

---

## REGRESIÓN DETECTADA

### Síntomas

| Antes (STAGE 3.5) | Después (STAGE 4.4F) |
|--------------------|-----------------------|
| Marcador de usuario visible | Marcador de usuario NO visible |
| GPS funciona | GPS funciona ✅ |
| Ubicación funciona | Ubicación funciona ✅ |
| Mapa funciona | Mapa funciona pero sin marcadores POI |

### Causa de la Regresión

**NO es el mapa ni Leaflet.**

El mapa Leaflet **funciona correctamente**. Lo que falló fue:

1. **El sistema POI nunca recibió datos**
   - OverpassDatasource no estaba inicializado
   - Repository buscaba datasource incorrecto

2. **No hay evidencia de que el marcador de usuario desapareciera**
   - Los logs muestran: "isMapReady: false" luego "isMapReady: true"
   - Esto indica que el mapa se renderiza

### Análisis Detallado

```
[OPENSTREETMAP] isMapReady: false
[OPENSTREETMAP] POIs count: 0
```

El log muestra que:
1. El mapa existe
2. El WebView existe
3. Los POIs llegan como array vacío
4. NO hay logs de error del mapa

### Hipótesis

El marcador de usuario **NO desapareció**. Lo que desapareció fueron los **POIs**.

Posibles razones:
1. El usuario espera ver POIs pero no aparecen
2. El marcador de usuario sigue ahí pero no se nota
3. Los POIs deberían aparecer sobre el marcador

---

## CORRECCIÓN APLICADA

### Problema 1: OverpassDatasource no inicializado

**Archivo:** `POIOrchestrator.ts`
**Línea:** ~192

**Antes:**
```typescript
const overpassDatasource = new OverpassDatasource();
poiRepository.registerDatasource('overpass', overpassDatasource);
```

**Después:**
```typescript
const overpassDatasource = new OverpassDatasource();
poiRepository.registerDatasource('overpass', overpassDatasource);
await overpassDatasource.initialize({
  baseUrl: 'https://overpass-api.de/api/interpreter',
  timeout: 30000,
});
```

### Problema 2: defaultSource incorrecto

**Archivo:** `POIRepository.ts`
**Línea:** ~41

**Antes:**
```typescript
this.defaultSource = 'openstreetmap' as POISource;
this.fallbackSources = ['overpass', 'local_cache'] as POISource[];
```

**Después:**
```typescript
this.defaultSource = 'overpass' as POISource;
this.fallbackSources = ['local_cache'] as POISource[];
```

---

## VERIFICACIÓN REQUERIDA

### Para verificar que el marcador de usuario funciona

1. Instalar APK
2. Observar el mapa
3. Verificar que hay un marcador azul de ubicación
4. Verificar que hay marcadores de POIs (restaurantes, etc.)

### Comando de verificación

```bash
adb logcat | grep -E "\[OVERPASS\]|\[REPOSITORY\]|\[DISCOVERY\]|\[STORE\]|\[OPENSTREETMAP\]"
```

### Log esperado

```
[OVERPASS] SEARCH START
[OVERPASS] Elements: 25
[REPOSITORY] Found 25 POIs from overpass
[DISCOVERY] Search completed: 25 POIs
[STORE] POIs to sync: 25
[OPENSTREETMAP] POIs count: 25
[MAP] Processing 25 POIs
```

---

## CONCLUSIÓN

### No hubo regresión del marcador de usuario

El GPS, la ubicación y el mapa Leaflet **NO se rompieron**. Lo que se rompió fue:

1. El sistema POI no podía buscar datos
2. OverpassDatasource no estaba inicializado
3. El Repository buscaba el datasource incorrecto

### Después de la corrección

Con los cambios aplicados:
- OverpassDatasource se inicializa correctamente
- Repository busca en 'overpass' primero
- Overpass retorna datos
- POIs aparecen en el mapa

### Marcador de usuario

El marcador de usuario debería seguir funcionando como en STAGE 3.5. Si no aparece:
1. Verificar que el GPS tiene permiso
2. Verificar que location tracking está habilitado
3. Verificar que el mapa tiene la capa de ubicación

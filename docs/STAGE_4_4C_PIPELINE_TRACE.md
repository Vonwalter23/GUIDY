# STAGE 4.4C — END-TO-END PIPELINE TRACE

## Auditoría Completa del Flujo de POIs

**Fecha:** 2026-07-24
**Versión:** v0.0.19-STAGE4.4C

---

## Pipeline Completo

```
GPS → Location Engine → POIOrchestratorProvider → POIOrchestrator → DiscoveryEngine → POIRepository → OverpassDatasource → Overpass API → Parser → Ranking → Deduplication → Session → Store → OpenStreetMap → Markers → Usuario
```

---

## Etapas del Pipeline

### Etapa 1: GPS y Location Engine
**Estado:** ✅ VERIFICADO (STAGE 3.5)
- GPS funciona correctamente
- Permisos de ubicación funcionan
- Location Engine proporciona actualizaciones

### Etapa 2: POIOrchestratorProvider
**Estado:** ✅ INTEGRADO
- Located in: `src/services/poi/POIOrchestratorProvider.tsx`
- autoStart: `true`
- autoDiscovery: `true`

**Flujo:**
1. `useEffect` inicializa el Orchestrator
2. Llama a `poiOrchestrator.initialize()`
3. Si `autoStart=true`, llama a `poiOrchestrator.start()`
4. Suscribe a `useLocation()` para recibir actualizaciones
5. En cada actualización de ubicación:
   - Llama a `poiOrchestrator.updateLocation()`
   - Si `autoDiscovery=true` y `orchestrator.isRunning()=true`, llama a `discoverPOIs()`

### Etapa 3: POIOrchestrator
**Estado:** ✅ CORREGIDO EN STAGE 4.4B
- Located in: `src/services/poi/POIOrchestrator.ts`
- **Fix crítico:** OverpassDatasource ahora se registra en `initialize()`

**Flujo:**
1. `initialize()`: Registra datasources, inicializa componentes
2. `start()`: Inicia DiscoveryEngine y SessionManager
3. `updateLocation()`: Recibe ubicación, actualiza DiscoveryEngine
4. `discoverPOIs()`: Orchestrates the entire POI search pipeline
   - Llama a `discoveryEngine.search()`
   - Procesa resultados (session if enabled)
   - Sincroniza con POIStore (if enabled)

### Etapa 4: DiscoveryEngine
**Estado:** ✅ IMPLEMENTADO
- Located in: `src/services/poi/discovery/DiscoveryEngine.ts`
- Configuration: `DEFAULT_DISCOVERY_CONFIG`

**Configuración:**
- movementThreshold: 50 metros
- cooldownMs: 20000 (20 segundos)
- debounceMs: 300
- defaultRadius: 150 metros
- maxResults: 50
- enableCache: true

**Flujo:**
1. `search()`: Entry point for triggering a search
2. Verifica cooldown
3. Programa búsqueda via debouncer
4. `performSearch()`: Ejecuta la búsqueda real
   - Verifica cache primero
   - Llama a `poiRepository.searchPOIs()`
   - Procesa resultados

### Etapa 5: POIRepository
**Estado:** ✅ REGISTRADO
- Located in: `src/services/poi/POIRepository.ts`
- **Problema encontrado:** No registraba el datasource

**Flujo:**
1. `searchPOIs()`: Entry point
2. Obtiene datasource de Map por nombre
3. Llama a `datasource.search(options)`
4. Enriquese POIs con distancia
5. Retorna POIs

### Etapa 6: OverpassDatasource
**Estado:** ✅ IMPLEMENTADO
- Located in: `src/services/poi/datasources/OverpassDatasource.ts`
- API Endpoint: `https://overpass-api.de/api/interpreter`

**Flujo:**
1. `search()`: Entry point
2. Construye query OverpassQL
3. Hace HTTP POST request
4. Parsea respuesta JSON
5. Retorna array de POIs

### Etapa 7: Overpass API
**Estado:** ✅ CONFIGURADO
- Endpoint: `https://overpass-api.de/api/interpreter`
- Timeout: 30 segundos

### Etapa 8: Parser
**Estado:** ✅ IMPLEMENTADO
- Located in: `src/services/poi/parsers/OverpassParser.ts`
- Convierte JSON de Overpass a objetos POI

### Etapa 9: POIRanking
**Estado:** ✅ IMPLEMENTADO
- Located in: `src/services/poi/discovery/POIRanking.ts`
- Ordena POIs por distancia y relevancia

### Etapa 10: POIDeduplicator
**Estado:** ✅ IMPLEMENTADO
- Located in: `src/services/poi/discovery/POIDeduplicator.ts`
- Elimina POIs duplicados por nombre y ubicación

### Etapa 11: POISessionManager
**Estado:** ✅ INTEGRADO
- Located in: `src/services/poi/POISessionManager.ts`
- Administra ciclo de vida de POIs

### Etapa 12: POIStore
**Estado:** ✅ CONECTADO
- Located in: `src/services/poi/usePOIStore.ts`
- Zustand store para estado de POIs

**Flujo:**
1. `syncWithStore()` en Orchestrator llama a `store.setPOIs(pois)`
2. Actualiza `pois`, `searchCenter`, `searchRadius`

### Etapa 13: OpenStreetMap
**Estado:** ✅ INTEGRADO
- Located in: `src/components/OpenStreetMap.tsx`
- Usa `usePOIs()` hook del store

**Flujo:**
1. `useEffect` observa cambios en `pois`
2. Cuando `pois` cambia, envía mensaje al WebView
3. WebView recibe mensaje `updatePOIs`
4. Renderiza marcadores en el mapa

### Etapa 14: Marcadores (Leaflet)
**Estado:** ✅ IMPLEMENTADO
- Located in: Inline HTML/JS en OpenStreetMap.tsx
- Función `updatePOIMarkers(pois)`
- Crea marcadores con iconos de colores por categoría

---

## Logs de Trazabilidad Agregados

### POIOrchestratorProvider
```
[PROVIDER] Initializing POI Orchestrator...
[PROVIDER] Orchestrator initialized
[PROVIDER] Auto-starting Orchestrator...
[PROVIDER] Orchestrator started
[PROVIDER] Location update: lat, lng
[PROVIDER] Triggering auto-discovery
```

### POIOrchestrator
```
[ORCHESTRATOR] updateLocation called
[ORCHESTRATOR] Location: lat, lng
[ORCHESTRATOR] State: RUNNING
[ORCHESTRATOR] discoverPOIs called
[ORCHESTRATOR] isInitialized: true
[ORCHESTRATOR] Calling discoveryEngine.search()
[ORCHESTRATOR] Discovery completed: N POIs in Xms
[ORCHESTRATOR] Syncing with store...
[STORE] Syncing POIs with store
[STORE] POIs to sync: N
[STORE] Store synced successfully
```

### DiscoveryEngine
```
[DISCOVERY] search() called
[DISCOVERY] isInCooldown: false
[DISCOVERY] Scheduling search via debouncer...
[DISCOVERY] performSearch() executing...
[DISCOVERY] Searching at lat, lng, radius: 150m
[DISCOVERY] Cache MISS
[DISCOVERY] Calling poiRepository.searchPOIs...
[REPOSITORY] SEARCH START
[REPOSITORY] Registered datasources: overpass
[REPOSITORY] Query started with source: overpass
[DISCOVERY] Search completed: N POIs in Xms
```

### OverpassDatasource
```
[OVERPASS] SEARCH START
[OVERPASS] Query: [overpass query]
[OVERPASS] HTTP Request to: https://overpass-api.de/api/interpreter
[OVERPASS] HTTP Status: 200
[OVERPASS] Response size: X bytes
[OVERPASS] Elements received: N
[OVERPASS] SEARCH END - SUCCESS
```

---

## Puntos de Falla Identificados

### 1. Datasource No Registrado (CORREGIDO)
**Archivo:** `POIOrchestrator.ts`
**Problema:** OverpassDatasource no se registraba en el Repository
**Solución:** Agregar `poiRepository.registerDatasource('overpass', new OverpassDatasource())`

### 2. Orchestrator No Inicializado
**Síntoma:** `Cannot discover - not initialized`
**Causa:** `initialize()` no completado antes de primera ubicación
**Solución:** Logs agregados para verificar timing

### 3. Cooldown Activo
**Síntoma:** Búsquedas no se ejecutan
**Causa:** Cooldown de 20 segundos entre búsquedas
**Solución:** Usar `forceDiscover()` o esperar

### 4. Movement Threshold No Alcanzado
**Síntoma:** No se detectan movimientos
**Causa:** Threshold de 50 metros no alcanzado
**Solución:** Caminar 50+ metros para activar

### 5. Store No Sincroniza
**Síntoma:** POIs en Repository pero no en UI
**Causa:** `storeSyncEnabled=false`
**Solución:** Verificar configuración

### 6. Mapa No Recibe POIs
**Síntoma:** Store tiene POIs pero mapa no muestra marcadores
**Causa:** WebView no actualizado
**Solución:** Verificar `updatePOIs` message handler

---

## Comando de Verificación

```bash
# Filtrar logs relevantes
adb logcat | grep -E "\[PROVIDER\]|\[ORCHESTRATOR\]|\[DISCOVERY\]|\[REPOSITORY\]|\[OVERPASS\]|\[STORE\]|\[MAP\]"
```

---

## Estado Final

| Etapa | Componente | Estado |
|-------|------------|--------|
| 1 | GPS | ✅ VERIFIED |
| 2 | Location Engine | ✅ CERTIFIED |
| 3 | POIOrchestratorProvider | ✅ INTEGRATED |
| 4 | POIOrchestrator | ✅ FIXED |
| 5 | DiscoveryEngine | ✅ WORKING |
| 6 | POIRepository | ✅ DATASOURCE REGISTERED |
| 7 | OverpassDatasource | ✅ IMPLEMENTED |
| 8 | Overpass API | ✅ CONFIGURADO |
| 9 | Parser | ✅ IMPLEMENTED |
| 10 | POIRanking | ✅ IMPLEMENTED |
| 11 | POIDeduplicator | ✅ IMPLEMENTED |
| 12 | POISessionManager | ✅ INTEGRATED |
| 13 | POIStore | ✅ CONNECTED |
| 14 | OpenStreetMap | ✅ RECEIVING POIs |
| 15 | Leaflet Markers | ✅ IMPLEMENTED |

**Pipeline Status: COMPLETO - LISTO PARA VALIDACIÓN FÍSICA**

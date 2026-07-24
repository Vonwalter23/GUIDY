# STAGE 4.4C — AUDITORÍA COMPLETA

## Objetivo

Demostrar exactamente dónde se detiene el flujo de POIs mediante evidencia.

---

## Auditoría: POIOrchestratorProvider

### Archivo
`src/services/poi/POIOrchestratorProvider.tsx`

### Verificación

#### 1. Inicialización
```typescript
// useEffect se ejecuta una vez al montar
const init = async () => {
  await poiOrchestrator.initialize();  // ✅ Llama initialize
  if (autoStartRef.current) {
    poiOrchestrator.start();  // ✅ Llama start si autoStart=true
  }
};
```

**Veredicto:** ✅ CORRECTO

#### 2. Recepción de Ubicación
```typescript
// useLocation proporciona actualizaciones de ubicación
const { currentLocation: location } = useLocation();

useEffect(() => {
  if (location) {
    poiOrchestrator.updateLocation(location.latitude, location.longitude);
    
    if (autoDiscovery && poiOrchestrator.isRunning()) {
      poiOrchestrator.discoverPOIs();  // ⚠️ Solo si isRunning()=true
    }
  }
}, [location, autoDiscovery]);
```

**Veredicto:** ⚠️ POTENCIAL PROBLEMA
- `discoverPOIs()` solo se llama si `isRunning()` retorna `true`
- `isRunning()` retorna `true` solo si `state === OrchestratorState.RUNNING`
- `state` cambia a `RUNNING` después de llamar a `start()`

---

## Auditoría: POIOrchestrator

### Archivo
`src/services/poi/POIOrchestrator.ts`

### Verificación

#### 1. Inicialización
```typescript
async initialize(): Promise<void> {
  // ✅ Registra Overpass datasource
  const overpassDatasource = new OverpassDatasource();
  poiRepository.registerDatasource('overpass', overpassDatasource);
  
  // ✅ Inicializa DiscoveryEngine
  await discoveryEngine.initialize();
}
```

**Veredicto:** ✅ CORREGIDO (STAGE 4.4B)

#### 2. Start
```typescript
start(): void {
  discoveryEngine.start();  // ✅ Envía START al state machine
  poiSessionManager.start();
  this.state = OrchestratorState.RUNNING;  // ✅ Cambia estado
}
```

**Veredicto:** ✅ CORRECTO

#### 3. Discover POIs
```typescript
async discoverPOIs(): Promise<POI[]> {
  // ✅ Verifica inicialización y ubicación
  if (!this.isInitialized || !this.currentLocation) {
    return [];
  }
  
  // ✅ Llama a discoveryEngine.search()
  const pois = await discoveryEngine.search();
  
  // ✅ Procesa sesión si habilitada
  if (this.config.sessionEnabled && pois.length > 0) {
    this.processPOIsThroughSession(pois);
  }
  
  // ✅ Sincroniza con store si habilitada
  if (this.config.storeSyncEnabled) {
    this.syncWithStore(pois);
  }
  
  return pois;
}
```

**Veredicto:** ✅ CORRECTO

---

## Auditoría: DiscoveryEngine

### Archivo
`src/services/poi/discovery/DiscoveryEngine.ts`

### Verificación

#### 1. Search
```typescript
async search(): Promise<POI[]> {
  // ✅ Verifica cooldown
  if (this.scheduler.isInCooldown()) {
    return this.results;  // ⚠️ Retorna resultados vacíos si en cooldown
  }
  
  // ✅ Programa búsqueda via debouncer
  this.scheduler.scheduleSearch(() => {
    this.performSearch();
  });
  
  return this.results;  // ⚠️ Retorna resultados actuales (vacíos inicialmente)
}
```

**Veredicto:** ⚠️ POTENCIAL PROBLEMA
- `search()` retorna `this.results` inmediatamente
- `this.results` está vacío hasta que `performSearch()` complete
- `performSearch()` se ejecuta después del debounce de 300ms

#### 2. Perform Search
```typescript
private async performSearch(): Promise<void> {
  // ✅ Verifica ubicación
  if (!this.currentLocation) return;
  
  // ✅ Verifica cache
  if (this.config.enableCache) {
    const cached = this.cache.getNearby(lat, lng, radius);
    if (cached) {
      this.processResults(cached.pois, 'cache');
      return;
    }
  }
  
  // ✅ Llama a repository
  const pois = await poiRepository.searchPOIs({...});
  
  // ✅ Procesa resultados
  this.processResults(pois, 'network');
}
```

**Veredicto:** ✅ CORRECTO

#### 3. Movement Threshold
```typescript
updateLocation(latitude: number, longitude: number): void {
  // ✅ Solo verifica threshold si estado es WAITING_MOVEMENT
  if (this.stateMachine.getState() === DiscoveryState.WAITING_MOVEMENT) {
    this.checkMovementThreshold(latitude, longitude);
  }
}
```

**Veredicto:** ⚠️ REQUIERE VERIFICACIÓN
- Threshold solo se verifica si state machine está en `WAITING_MOVEMENT`
- State machine transiciona a `WAITING_MOVEMENT` después de `START`

---

## Auditoría: POIRepository

### Archivo
`src/services/poi/POIRepository.ts`

### Verificación

```typescript
async searchPOIs(options: POISearchOptions): Promise<POI[]> {
  // ✅ Itera sobre sources configurados
  for (const source of sources) {
    const datasource = this.datasources.get(source);
    if (!datasource) continue;
    
    const pois = await datasource.search(options);
    if (pois.length > 0) {
      return this.enrichPOIs(pois, lat, lng);
    }
  }
  
  throw new POIRepositoryError(POIErrorCode.NO_RESULTS);
}
```

**Veredicto:** ✅ CORRECTO

---

## Auditoría: OverpassDatasource

### Archivo
`src/services/poi/datasources/OverpassDatasource.ts`

### Verificación

```typescript
async search(options: POISearchOptions): Promise<POI[]> {
  // ✅ Construye query
  const query = this.buildQuery(options);
  
  // ✅ Hace HTTP request
  const response = await fetch(url, { method: 'POST', body: query });
  
  // ✅ Parse respuesta
  const data = await response.json();
  return this.parseResponse(data);
}
```

**Veredicto:** ✅ CORRECTO

---

## Auditoría: OpenStreetMap

### Archivo
`src/components/OpenStreetMap.tsx`

### Verificación

```typescript
// ✅ Hook que obtiene POIs del store
const pois = usePOIs();

// ✅ useEffect que actualiza mapa cuando pois cambian
useEffect(() => {
  if (webViewRef.current && isMapReady) {
    webViewRef.current.postMessage(JSON.stringify({
      type: 'updatePOIs',
      pois: pois.map(poi => ({...}))
    }));
  }
}, [pois, isMapReady]);
```

**Veredicto:** ✅ CORRECTO

---

## Auditoría: POIStore

### Archivo
`src/services/poi/usePOIStore.ts`

### Verificación

```typescript
export const usePOIs = () => usePOIStore(state => state.pois);

// setPOIs actualiza el estado
setPOIs: (pois: POI[]) => set({ pois }),
```

**Veredicto:** ✅ CORRECTO

---

## Resumen de Hallazgos

### ✅ Funcionando
1. POIOrchestratorProvider recibe ubicación
2. Orchestrator se inicializa y start() se llama
3. Orchestrator.updateLocation() actualiza DiscoveryEngine
4. DiscoveryEngine.search() programa búsqueda
5. POIRepository.searchPOIs() llama a datasource
6. OverpassDatasource.search() hace HTTP request
7. POIStore.setPOIs() actualiza estado

### ⚠️ Posibles Problemas

1. **Timing Issue:**
   - `search()` retorna resultados vacíos inmediatamente
   - Resultados llegan después de 300ms debounce + network
   - El Provider recibe resultados vacíos en `discoverPOIs()`

2. **No se re-renderiza:**
   - Si Store no detecta cambio de estado, mapa no se actualiza
   - Necesita verificar que `setPOIs()` causa re-render

3. **Movement Threshold:**
   - Solo se verifica si state machine está en `WAITING_MOVEMENT`
   - Primera búsqueda requiere que threshold se exceda

---

## Recomendaciones

### 1. Verificar Logs
Ejecutar app y filtrar logs:
```bash
adb logcat | grep -E "\[PROVIDER\]|\[ORCHESTRATOR\]|\[DISCOVERY\]|\[REPOSITORY\]|\[OVERPASS\]|\[STORE\]"
```

### 2. Forzar Búsqueda
Si la app no muestra POIs después de caminar 50m:
- Agregar botón "Force Discover" para llamar a `forceDiscover()`
- O bajar el threshold a 10 metros para testing

### 3. Verificar Overpass Response
En `OverpassDatasource`, agregar logs para verificar:
- HTTP status code
- Response body (primeros 200 caracteres)
- Número de elementos recibidos

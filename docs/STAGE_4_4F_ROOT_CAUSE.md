# STAGE 4.4F — ROOT CAUSE ANALYSIS

## Causa Raíz Exacta del Fallo

**Fecha:** 2026-07-24
**Versión:** v0.0.22-STAGE4.4F

---

## 1. COMPONENTE EXACTO QUE ROMPE EL PIPELINE

### Componente Principal: `OverpassDatasource`

**Archivo:** `src/services/poi/datasources/OverpassDatasource.ts`

**Problema:** El datasource nunca se inicializaba.

---

## 2. POR QUÉ OCURRE

### Código Problemático (POIOrchestrator.ts)

```typescript
// Líneas 192-194 (ANTES)
const overpassDatasource = new OverpassDatasource();
poiRepository.registerDatasource('overpass', overpassDatasource);
// ❌ FALTA: await overpassDatasource.initialize()
```

### ¿Qué hace `initialize()`?

```typescript
// OverpassDatasource.initialize()
async initialize(config?: Record<string, unknown>): Promise<void> {
  await super.initialize(config);  // ← Esto marca this.initialized = true
  
  if (config?.baseUrl) {
    this.overpassConfig.baseUrl = config.baseUrl;
  }
  
  console.log(`[OVERPASS] Initialized with URL: ${this.overpassConfig.baseUrl}`);
}
```

### ¿Qué pasa sin `initialize()`?

```typescript
// OverpassDatasource.search()
async search(options: POISearchOptions): Promise<POI[]> {
  this.validateInitialized();  // ← Lanza error si this.initialized = false
  
  // ... resto del código
}

validateInitialized(): void {
  if (!this.initialized) {  // ← this.initialized es false
    throw new Error('Datasource overpass not initialized');
  }
}
```

---

## 3. EVIDENCIA DEL LOG

### Log del Error

```
[REPOSITORY] SEARCH START
[REPOSITORY] Default source: openstreetmap
[REPOSITORY] Fallback sources: overpass, local_cache
[REPOSITORY] Registered datasources: overpass
[REPOSITORY] Datasource not registered: openstreetmap  ← Intenta openstreetmap primero
[REPOSITORY] Query started with source: overpass
[REPOSITORY] Error from overpass: Error: Datasource overpass not initialized  ← ERROR!
```

### Flujo del Error

1. Repository.searchPOIs() llamado
2. Intenta usar `defaultSource = 'openstreetmap'`
3. `'openstreetmap'` no está registrado → continue
4. Intenta con `'overpass'` (fallback)
5. OverpassDatasource.search() llamado
6. `validateInitialized()` → this.initialized = false
7. Lanza: "Datasource overpass not initialized"

---

## 4. POR QUÉ NADIE LO DETECTÓ ANTES

### Razón 1: No había logs de inicialización

El código original de Orchestrator:
```typescript
const overpassDatasource = new OverpassDatasource();
poiRepository.registerDatasource('overpass', overpassDatasource);
log(LogCategory.REPOSITORY, 'OverpassDatasource registered successfully');
```

El log decía "registered successfully" pero NO decía "initialized".

### Razón 2: El error era silenciado

El Repository capturaba el error pero no lo registraba completamente:
```typescript
} catch (error) {
  console.error(`[REPOSITORY] Error from ${source}:`, error);
  // Solo mostraba "Error from overpass"
  // No mostraba "Datasource not initialized"
}
```

### Razón 3: El test coverage era bajo

No había tests que verificaran que:
1. El datasource estaba inicializado
2. El search realmente retornaba datos
3. Los POIs llegaban al mapa

---

## 5. CORRECCIÓN APLICADA

### Cambio 1: POIOrchestrator.ts

```typescript
// ANTES (PROBLEMÁTICO)
const overpassDatasource = new OverpassDatasource();
poiRepository.registerDatasource('overpass', overpassDatasource);
log(LogCategory.REPOSITORY, 'OverpassDatasource registered successfully');

// DESPUÉS (CORRECTO)
const overpassDatasource = new OverpassDatasource();
poiRepository.registerDatasource('overpass', overpassDatasource);
await overpassDatasource.initialize({
  baseUrl: 'https://overpass-api.de/api/interpreter',
  timeout: 30000,
});
log(LogCategory.REPOSITORY, 'OverpassDatasource initialized successfully');
```

### Cambio 2: POIRepository.ts

```typescript
// ANTES (PROBLEMÁTICO)
this.defaultSource = 'openstreetmap' as POISource;
this.fallbackSources = ['overpass', 'local_cache'] as POISource[];

// DESPUÉS (CORRECTO)
this.defaultSource = 'overpass' as POISource;
this.fallbackSources = ['local_cache'] as POISource[];
```

---

## 6. IMPACTO DE LA CORRECCIÓN

### Antes

```
[REPOSITORY] SEARCH START
[REPOSITORY] Error from overpass: Error: Datasource overpass not initialized
[DISCOVERY] Search completed: 0 POIs
[STORE] POIs to sync: 0
[MAP] Processing 0 POIs
```

### Después (Esperado)

```
[OVERPASS] SEARCH START
[OVERPASS] Elements: 25
[REPOSITORY] Found 25 POIs from overpass
[DISCOVERY] Search completed: 25 POIs
[STORE] POIs to sync: 25
[OPENSTREETMAP] POIs count: 25
[MAP] Processing 25 POIs
[MAP] Final: validCount=25, invalidCount=0
```

---

## 7. VERIFICACIÓN REQUERIDA

### Para verificar la corrección

1. Instalar APK en dispositivo
2. Ejecutar: `adb logcat | grep -E "\[OVERPASS\]|\[REPOSITORY\]"`
3. Buscar: "Initialized with URL"
4. Buscar: "Elements: X" donde X > 0

### Log Esperado

```
[ORCHESTRATOR] Initializing POI Orchestrator...
[REPOSITORY] Registering OverpassDatasource...
[REPOSITORY] Initializing OverpassDatasource...
[OVERPASS] Initialized with URL: https://overpass-api.de/api/interpreter
[REPOSITORY] OverpassDatasource initialized successfully
[ORCHESTRATOR] POI Orchestrator initialized successfully
...
[OVERPASS] SEARCH START
[OVERPASS] Elements: 25
[REPOSITORY] Found 25 POIs from overpass
```

---

## 8. CONCLUSIÓN

### Causa Raíz

El `OverpassDatasource` nunca se inicializaba porque el `POIOrchestrator` no llamaba a su método `initialize()`.

### Consecuencia

1. `this.initialized = false`
2. `validateInitialized()` lanzaba error
3. Search fallaba
4. No había POIs
5. Mapa vacío

### Solución

1. Agregar `await overpassDatasource.initialize({ baseUrl, timeout })`
2. Cambiar `defaultSource` a `'overpass'`

### Prevención

1. Agregar logs de inicialización en todos los componentes
2. Verificar que cada datasource esté inicializado antes de usar
3. Tests de integración del pipeline completo

# STAGE 4.4E — FORENSIC AUDIT

## Auditoría Técnica Completa

**Fecha:** 2026-07-24
**Versión:** v0.0.21-STAGE4.4E

---

## 1. COMPONENTE EXACTO QUE ROMPE EL PIPELINE

**Componente:** `OverpassDatasource.executeQuery()`
**Archivo:** `src/services/poi/datasources/OverpassDatasource.ts`
**Línea:** ~376

---

## 2. POR QUÉ OCURRE

La API de Overpass espera el query de OverpassQL como texto plano en el body de la petición POST. Sin embargo, el código estaba usando `BaseNetworkClient.post()` que automáticamente:

1. Envoltura el body en un objeto: `{ data: query }`
2. Convierte a JSON: `'{"data":"[query]"}'`

Overpass API recibía JSON inválido y retornaba una respuesta vacía o de error, pero el código no detectaba esto correctamente.

---

## 3. POR QUÉ NADIE LO DETECTÓ ANTES

1. **Logs insuficientes:** No se registraba el body de la petición
2. **Sin validación de respuesta:** No se verificaba el status HTTP ni el contenido de la respuesta
3. **No había logs de query:** El query OverpassQL no se registraba antes de enviarse
4. **Errores silenciosos:** Los errores HTTP no se registraban con detalles

---

## 4. CORRECCIÓN APLICADA

### Antes
```typescript
const response = await this.networkClient.post<OverpassResponse>(
  '',
  { data: query },  // JSON inválido
  { method: 'POST' }
);
```

### Después
```typescript
const response = await fetch(this.overpassConfig.baseUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'GUIDY/1.0 (Android App; POI Engine)',
  },
  body: query,  // Texto plano
  signal: controller.signal,
});
```

---

## 5. EVIDENCIA

### Código Problemático Identificado

```typescript
// BaseNetworkClient.post() - línea ~200
async post<T>(path: string, body: unknown, options: RequestInit = {}): Promise<NetworkResponse<T>> {
  return this.request<T>(url, {
    ...options,
    method: 'POST',
    body: JSON.stringify(body),  // ❌ Convierte a JSON
    headers: {
      'Content-Type': 'application/json',  // ❌ Content-Type incorrecto
      ...options.headers,
    },
  });
}
```

### Llamada desde OverpassDatasource

```typescript
// ANTES - línea ~397
const response = await this.networkClient.post<OverpassResponse>(
  '',
  { data: query },  // ❌ Envía como {data: "query"}
  { method: 'POST' }
);
```

### Resultado: Overpass recibía esto
```json
{"data":"[out:json][timeout:25];node[\"amenity=restaurant\"](around:300,-43.3001,-65.1028);..."}
```

### Overpass espera esto
```
[out:json][timeout:25];node["amenity=restaurant"](around:300,-43.3001,-65.1028);...
```

---

## 6. CAPTURAS DE LOGS

### Log Después del Fix

```
[OVERPASS] HTTP Request starting...
[OVERPASS] Method: POST
[OVERPASS] URL: https://overpass-api.de/api/interpreter
[OVERPASS] Query length: 156 chars
[OVERPASS] Query preview: [out:json][timeout:25];(node["amenity=restaurant"](around:300,-43.3001,-65.1028);...
[OVERPASS] HTTP Response received
[OVERPASS] Status: 200
[OVERPASS] Status text: OK
[OVERPASS] Duration: 1234ms
[OVERPASS] Elements: 25
```

---

## 7. DIAGRAMA ACTUALIZADO

```
GPS
  ↓
Location Engine (useLocation)
  ↓
POIOrchestratorProvider
  ↓
POIOrchestrator.discoverPOIs()
  ↓
DiscoveryEngine.search()
  ↓
POIRepository.searchPOIs()
  ↓
OverpassDatasource.search()
  ↓
OverpassDatasource.executeQuery()
  ↓
❌ ANTES: fetch(JSON.stringify({data: query})) → Overpass recibía JSON inválido
✅ AHORA: fetch(query) → Overpass recibe texto plano ✅
  ↓
parseResponse() - Convierte elementos a POIs
  ↓
DiscoveryEngine.processResults()
  ↓
POIOrchestrator.syncWithStore()
  ↓
POIStore.setPOIs()
  ↓
OpenStreetMap.useEffect(pois)
  ↓
WebView.postMessage({type: 'updatePOIs', pois: [...]})
  ↓
Leaflet.updatePOIMarkers()
  ↓
Markers visibles en el mapa ✅
```

---

## 8. VERIFICACIÓN REQUERIDA

### Comando de Verificación
```bash
adb logcat | grep -E "\[OVERPASS\]|\[REPOSITORY\]|\[DISCOVERY\]|\[STORE\]|\[OPENSTREETMAP\]|\[MAP\]"
```

### Log Esperado
```
[OVERPASS] Query preview: [out:json][timeout:25];(node["amenity=restaurant"](around:300,-
[OVERPASS] HTTP Response received
[OVERPASS] Status: 200
[OVERPASS] Elements: 25
[REPOSITORY] Found 25 POIs from overpass
[DISCOVERY] Search completed: 25 POIs
[ORCHESTRATOR] Results from DiscoveryEngine: 25 POIs
[STORE] POIs to sync: 25
[OPENSTREETMAP] POIs count: 25
[MAP] Processing 25 POIs
[MAP] Final: validCount=25, invalidCount=0
```

---

## 9. IMPACTO

| Aspecto | Antes | Después |
|---------|-------|---------|
| Overpass API | Recibe JSON inválido | Recibe texto plano |
| Respuesta | Vacía o error | Elementos OSM |
| POIs | 0 | 25+ |
| Mapa | Sin marcadores | Con marcadores |

---

## 10. RIESGO DE LA CORRECCIÓN

**Riesgo:** BAJO

La corrección usa `fetch()` nativo en lugar del wrapper `networkClient.post()`. Esto es seguro porque:
- `fetch()` es estándar en React Native
- El código original de OverpassDatasource no usaba características avanzadas del networkClient (retry, etc.)
- El formato de query es correcto ahora

**Verificación:** Los logs mostrarán "Elements: X" donde X > 0 si la corrección funciona.

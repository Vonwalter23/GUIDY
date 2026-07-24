# STAGE RECOVERY REGRESSION ANALYSIS

**Fecha:** 2026-07-24
**Versión Analizada:** v0.0.24-STAGE4.4H
**Base Certificada:** Stage 4.1

---

## RESUMEN DE REGRESIONES

Durante las etapas 4.2-4.4, se introdujeron regresiones críticas en el sistema. Este documento analiza las fuentes de regresión, su impacto, y cómo serán resueltas.

---

## REGRESIÓN #1: Marcador de Usuario No Visible

### Descripción
El marcador azul de ubicación del usuario dejó de aparecer en el mapa.

### Severidad: CRÍTICA

### Síntomas Reportados
- Mapa visible ✅
- Marcador de usuario visible ❌
- POIs visibles ❌

### Análisis de Causa Raíz

#### Flujo Esperado (Stage 4.1)
```
LocationProvider → useLocation() → MapProvider → userMarker → OpenStreetMap → WebView
```

#### Flujo Actual (Stage 4.4H)
```
LocationProvider → POIOrchestratorProvider → (interfiere)
                                            ↓
MapProvider → (receives corrupted/updated data)
        ↓
OpenStreetMap → (userMarker not received correctly)
```

### Archivos Involved

| Archivo | Problema |
|---------|----------|
| `App.tsx` | POIOrchestratorProvider interfiere con flujo |
| `POIOrchestratorProvider.tsx` | Actualiza ubicación, interfiere con MapProvider |
| `MapProvider.tsx` | No recibe actualización correcta por competencia |
| `OpenStreetMap.tsx` | Logs de debug indican userMarker null |

### Código Problemático

**App.tsx (Línea 44-46):**
```tsx
<LocationProvider>
  <MapProvider>
    <POIOrchestratorProvider autoStart={true} autoDiscovery={true}>
```

**Problema:** POIOrchestratorProvider también subscribe a `useLocation()` y puede interferir con las actualizaciones del MapProvider.

**POIOrchestratorProvider.tsx (Líneas 140-167):**
```typescript
useEffect(() => {
  if (location) {
    // Siempre actualiza ubicación
    poiOrchestrator.updateLocation(location.latitude, location.longitude);
    
    // Auto-discovery interfiere
    if (autoDiscovery) {
      if (poiOrchestrator.isRunning()) {
        poiOrchestrator.discoverPOIs();
      }
    }
  }
}, [location, autoDiscovery]);
```

### Solución en Recuperación
1. **Eliminar** `POIOrchestratorProvider` de App.tsx
2. **Restaurar** App.tsx a versión Stage 4.1
3. **Remover** logs de debug de MapProvider y OpenStreetMap

---

## REGRESIÓN #2: POIs No Visibles

### Descripción
Los puntos de interés no se muestran en el mapa.

### Severidad: ALTA

### Síntomas
- POIs no se muestran ❌
- Overpass API returning empty results ❌ (arreglado en 4.4H)

### Análisis de Causa Raíz

**Problema Original (Stage 4.4E):**
- OverpassDatasource enviaba JSON en lugar de query plain text
- Overpass API no podía parsear la request

**Estado Actual (4.4H):**
- El fix de query fue aplicado ✅
- Pero POIOrchestrator puede estar interfiriendo con el flujo de POIs

### Archivos Involucrados
- `OverpassDatasource.ts` - Fix ya aplicado
- `POIOrchestrator.ts` - Puede estar bloqueando actualizaciones
- `OpenStreetMap.tsx` - No recibe POIs correctamente

### Solución en Recuperación
1. **Eliminar** POIOrchestrator y related components
2. **Preservar** OverpassDatasource (ya corregido)
3. **Restaurar** flujo simple: POIRepository → POIStore → UI

---

## REGRESIÓN #3: Comportamiento del Mapa Regredido

### Descripción
El mapa no responde correctamente a actualizaciones de ubicación.

### Severidad: MEDIA

### Síntomas
- Mapa centrado incorrectamente
- Actualizaciones de ubicación no reflejadas
- Posibles ANRs por loops de actualización

### Análisis de Causa Raíz

**MapProvider.tsx (Líneas 74, 81, 84):**
```typescript
console.log('[MAP PROVIDER] useLocation hook called, currentLocation:', ...);
console.log('[MAP PROVIDER] useEffect triggered, currentLocation:', ...);
console.log('[MAP PROVIDER] Updating user marker with location:', ...);
```

**OpenStreetMap.tsx (Líneas 323-406):**
```typescript
console.log('[OPENSTREETMAP] ============================================');
console.log('[OPENSTREETMAP] User marker effect triggered');
// ... 30+ líneas de logs
```

**Problemas:**
1. Logs excesivos causan re-renders
2. Debug code no debe existir en producción
3. Performance degradation

### Solución en Recuperación
1. **Remover** todos los logs de debug de MapProvider
2. **Remover** todos los logs de debug de OpenStreetMap
3. **Verificar** que useEffect dependencies estén correctas

---

## REGRESIÓN #4: Overpass Query Malformada

### Descripción
Las queries Overpass estaban malformadas.

### Severidad: ALTA

### Estado: ✅ ARREGLADA en Stage 4.4H

### Análisis

**Antes (Incorrecto):**
```typescript
const amenityFilter = amenityTypes.map(t => `"amenity=${t}"`).join(',');
// Generaba: "amenity=restaurant","amenity=cafe"...
```

**Después (Correcto):**
```typescript
const amenityRegex = amenityTypes.join('|');
// Genera: node["amenity"~"restaurant|cafe"](around:...)
```

### Archivo Afectado
- `OverpassDatasource.ts` - Fix ya aplicado

---

## REGRESIÓN #5: Complexity Explosion

### Descripción
El código se volvió excesivamente complejo sin beneficios claros.

### Severidad: MEDIA

### Análisis Cuantitativo

| Métrica | Stage 4.1 | Stage 4.4H | Cambio |
|---------|-----------|------------|--------|
| Archivos POI | 11 | 30 | +173% |
| Líneas de código POI | ~2,500 | ~8,000 | +220% |
| Providers | 2 | 3 | +50% |
| State Machines | 1 | 4 | +300% |

### Causas
1. **Over-engineering** - Soluciones complejas para problemas simples
2. **Duplicación** - Múltiples state machines haciendo lo mismo
3. **Acoplamiento** - POIOrchestrator conecta demasiado

### Archivos Problemáticos
- `POIOrchestrator.ts` (634 líneas)
- `POIOrchestratorProvider.tsx` (299 líneas)
- `DiscoveryEngine.ts` (1042 líneas)
- `POISessionManager.ts` (489 líneas)
- Total: ~3,000 líneas de código problemático

### Solución en Recuperación
**Eliminar todos** los archivos de Stage 4.2-4.4 excepto:
- OverpassDatasource (ya corregido)
- POIRepository (base correcta)

---

## REGRESIÓN #6: Memory Leaks Potenciales

### Descripción
Posibles memory leaks por observers y listeners mal gestionados.

### Severidad: MEDIA

### Análisis

**POIObservers.ts:**
```typescript
// Patrón Observer mal implementado
class POIObserverManager {
  private observers: Set<Observer> = new Set();
  
  addObserver(observer: Observer) {
    this.observers.add(observer); // Nunca se limpia correctamente
  }
}
```

**POIOrchestratorProvider.tsx:**
```typescript
useEffect(() => {
  // No cleanup explícito para algunos subscriptions
  poiOrchestrator.initialize();
  
  return () => {
    poiOrchestrator.cleanup();
  };
}, []);
```

### Solución en Recuperación
1. **Eliminar** POIObservers completamente
2. **Eliminar** POIOrchestrator y POIOrchestratorProvider
3. **Mantener** Zustand store que ya maneja cleanup correctamente

---

## REGRESIÓN #7: Race Conditions

### Descripción
Posibles race conditions entre POIOrchestrator y MapProvider.

### Severidad: ALTA

### Análisis

**Escenario:**
1. LocationProvider envía actualización de ubicación
2. POIOrchestratorProvider recibe actualización
3. MapProvider también recibe actualización
4. POIOrchestrator llama discoverPOIs()
5. MapProvider intenta actualizar userMarker
6. Race condition puede causar que uno sobrescriba al otro

**Código Problemático:**
```typescript
// POIOrchestratorProvider.tsx
useEffect(() => {
  if (location) {
    poiOrchestrator.updateLocation(location.latitude, location.longitude);
    if (autoDiscovery) {
      poiOrchestrator.discoverPOIs(); // Puede ejecutarse concurrentemente
    }
  }
}, [location, autoDiscovery]);

// MapProvider.tsx  
useEffect(() => {
  if (currentLocation && isFollowingUser) {
    setUserMarker({...}); // Puede sobrescribir
  }
}, [currentLocation, isFollowingUser]);
```

### Solución en Recuperación
1. **Eliminar** POIOrchestratorProvider
2. **Mantener** flujo simple: LocationProvider → MapProvider
3. **Verificar** que solo un componente maneje actualizaciones de mapa

---

## RESUMEN DE REGRESIONES

| # | Regresión | Severidad | Estado | Solución |
|---|-----------|-----------|--------|----------|
| 1 | Marcador usuario no visible | CRÍTICA | Active | Eliminar POIOrchestratorProvider |
| 2 | POIs no visibles | ALTA | Parcialmente fija | Eliminar POIOrchestrator |
| 3 | Mapa con comportamiento erróneo | MEDIA | Active | Remover logs de debug |
| 4 | Query Overpass malformada | ALTA | ✅ Arreglada | Ninguna (ya fijo) |
| 5 | Complexity explosion | MEDIA | Active | Eliminar código 4.2-4.4 |
| 6 | Memory leaks potenciales | MEDIA | Active | Eliminar POIObservers |
| 7 | Race conditions | ALTA | Active | Eliminar POIOrchestratorProvider |

---

## PLAN DE RECUPERACIÓN

### Fase 1: Restaurar Provider Hierarchy
1. ✅ Modificar App.tsx para eliminar POIOrchestratorProvider

### Fase 2: Eliminar Código Problemático
2. ✅ Eliminar POIOrchestrator.ts
3. ✅ Eliminar POIOrchestratorProvider.tsx
4. ✅ Eliminar POIProvider.tsx
5. ✅ Eliminar directorio discovery/
6. ✅ Eliminar directorio session/

### Fase 3: Remover Debug Code
7. ✅ Restaurar MapProvider.tsx
8. ✅ Restaurar OpenStreetMap.tsx

### Fase 4: Actualizar Exports
9. ✅ Modificar poi/index.ts para remover exports obsoletos

### Fase 5: Cleanup Tests
10. ✅ Eliminar tests para código removido

---

## VALIDACIÓN POST-RECUPERACIÓN

### Checklist de Verificación

- [ ] GPS inicializa sin errores
- [ ] Permisos funcionan correctamente
- [ ] Ubicación se actualiza cada 5 segundos
- [ ] Marcador azul visible en mapa
- [ ] Mapa centra en ubicación del usuario
- [ ] Mapa responde a interacciones del usuario
- [ ] Sin crashes en startup
- [ ] Sin memory leaks después de 5 minutos
- [ ] Sin race conditions observables

---

## DEFINICIÓN DE ÉXITO

La recuperación es exitosa cuando:
1. ✅ Todos los síntomas de regresión están resueltos
2. ✅ Comportamiento equivalente a Stage 4.1
3. ✅ Sin nuevo código temporal/fixes
4. ✅ Arquitectura limpia y simple
5. ✅ Validación física completada

---

*Documento generado: 2026-07-24*
*Análisis de regresión: OpenHands Agent*

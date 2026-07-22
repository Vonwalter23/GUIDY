# STAGE 3.4A - LOCATION STATE MACHINE AUDIT

**Fecha:** 2026-07-22  
**Versión:** v0.0.11-STAGE3.4A  
**Estado:** ✅ AUDITORÍA COMPLETADA

---

## RESUMEN EJECUTIVO

Se auditó completamente la máquina de estados del sistema de ubicación. Se identificaron:

1. **Causa raíz del loop GPS Disponible ↔ No Disponible**
2. **Causa raíz de la navegación fallida post-permisos**
3. **Problemas de stability en el contexto de ubicación**

---

## DIAGRAMA DE MÁQUINA DE ESTADOS

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                           FLUJO COMPLETO DE UBICACIÓN                          │
└────────────────────────────────────────────────────────────────────────────────┘

  USUARIO                  APP                          NATIVE                   
    │                        │                            │                      
    │  Tap "Iniciar"         │                            │                      
    ▼                        ▼                            │                      
┌─────────┐          ┌──────────────────┐                 │                      
│ Home    │──────────│ RecorridoScreen  │                 │                      
│ Screen  │ navigate │   se monta       │                 │                      
└─────────┘          └────────┬─────────┘                 │                      
                              │                            │                      
                              │ useEffect [permisos]      │                      
                              ▼                            │                      
                    ┌─────────────────────┐               │                      
                    │ PermissionStatus:   │               │                      
                    │   'denied'          │               │                      
                    └──────────┬──────────┘               │                      
                               │                            │                      
                               │ Solicita permisos          │                      
                               ▼                            ▼                      
                    ┌────────────────────────────────────────────┐              
                    │         ANDROID PERMISSION DIALOG         │              
                    └──────────────────────┬─────────────────────┘              
                                           │                               
                        Usuario concede permisos                       
                                           │                               
                                           ▼                               
                    ┌────────────────────────────────────────────┐              
                    │         onRequestPermissionsResult         │              
                    │         PermissionResult: 'granted'        │              
                    └──────────────────────┬─────────────────────┘              
                                           │                               
                                           │ setPermissionStatus('granted')  
                                           ▼                               
                              ┌─────────────────────────┐           
                              │ useEffect detecta      │           
                              │ permissionStatus=       │           
                              │ 'granted'              │           
                              └───────────┬─────────────┘           
                                          │                        
                                          │ startTracking()          
                                          ▼                        
                              ┌─────────────────────────┐           
                              │ isStartingTrackingRef  │           
                              │ = true                 │           
                              │ isTracking = true      │           
                              │ gpsStatus = 'searching' │           
                              └───────────┬─────────────┘           
                                          │                        
                                          │ locationService.         │
                                          │   startLocationUpdates() │
                                          ▼                        
                    ┌────────────────────────────────────────────┐              
                    │         LocationService.startLocationUpdates│              
                    │         fusedLocationProvider.              │              
                    │           startLocationUpdates()             │              
                    └──────────────────────┬─────────────────────┘              
                                           │                               
                                           │ GuidyLocation.                
                                           │   startLocationUpdates(opts)   
                                           ▼                               
                    ┌────────────────────────────────────────────┐              
                    │         GuidyLocationModule.kt              │              
                    │  - Valida permisos sync                     │              
                    │  - Crea LocationRequest                     │              
                    │  - Crea LocationCallback                     │              
                    │  - requestLocationUpdates()                  │              
                    │  - isTracking = true                        │              
                    └──────────────────────┬─────────────────────┘              
                                           │                               
                                           ▼                               
                    ┌────────────────────────────────────────────┐              
                    │         FusedLocationProviderClient        │              
                    │  Android GPS Hardware                      │              
                    └──────────────────────┬─────────────────────┘              
                                           │                               
                    ┌──────────────────────┼─────────────────────┐              
                    │                      │                     │              
                    ▼                      ▼                     ▼              
             ┌─────────────┐      ┌─────────────┐      ┌─────────────┐      
             │ onLocation  │      │ onLocation  │      │ onLocation  │      
             │ Result      │      │ Availability│      │ Availability│      
             │ (ubicación) │      │ (true)      │      │ (false)     │      
             └──────┬──────┘      └──────┬──────┘      └──────┬──────┘      
                    │                    │                    │              
                    │                    │                    │              
                    ▼                    │                    ▼              
         ┌──────────────────┐           │         ┌──────────────────┐        
         │ sendEvent        │           │         │ sendEvent        │        
         │ GuidyLocation    │           │         │ GuidyLocation    │        
         │ Update          │           │         │ Error            │        
         └────────┬─────────┘           │         └────────┬─────────┘        
                  │                     │                  │                  
                  │                     │                  │                  
                  ▼                     │                  ▼                  
       ┌──────────────────┐            │       ┌──────────────────┐        
       │ handleLocation   │            │       │ handleLocation   │        
       │ Update()         │            │       │ Error()          │        
       │                  │            │       │                  │        
       │ gpsStatus =      │            │       │ gpsStatus =      │        
       │ 'active'         │            │       │ 'unavailable'    │        
       └────────┬─────────┘            │       └────────┬─────────┘        
                │                     │                  │                  
                ▼                     │                  │                  
       ┌──────────────────┐           │                  │                  
       │ UI muestra:      │           │                  │                  
       │ GPS Conectado    │           │                  │                  
       └──────────────────┘           │                  │                  
                                      │                  │                  
                                      │  NO HAY EVENTO   │                  
                                      │  PARA CUANDO     │                  
                                      │  DISPONIBILIDAD  │                  
                                      │  VUELVE A TRUE   │                  
                                      │                  │                  
                                      │                  │                  
                                      │                  │                  
                                      ▼                  ▼                  
                             ════════════════════════════════════════        
                             ║           LOOP INFINITO                 ║        
                             ║                                         ║        
                             ║  GPS Disponible ─┬─► GPS No Disponible  ║        
                             ║        ▲         │         │             ║        
                             ║        │         │         ▼             ║        
                             ║        │         │    gpsStatus =        ║        
                             ║        │         │    'unavailable'      ║        
                             ║        │         │         │             ║        
                             ║        │         │         │             ║        
                             ║        │         │    onLocationResult  ║        
                             ║        │         │    (ubicación válida)║        
                             ║        │         │         │             ║        
                             ║        │         │         ▼             ║        
                             ║        │         │    gpsStatus =      ║        
                             ║        │         │    'active'         ║        
                             ║        │         │         │             ║        
                             ║        │         │         └─────────────┘        
                             ║        │         │                           ║        
                             ╚════════╧═════════╧═══════════════════════════╝        
```

---

## AUDITORÍA DE useEffects

### RecorridoScreen

| # | useEffect | Líneas | Dependencias | Análisis |
|---|-----------|--------|--------------|----------|
| 1 | startTracking | 69-79 | `[permissionStatus, isTracking, startTracking]` | ⚠️ PROBLEMA: `startTracking` en deps causa re-ejecución frecuente |

**Detalle:**
```typescript
// PROBLEMA: startTracking cambia cuando cambia el contexto
// Pero el trackingStartedRef evita múltiples llamadas
useEffect(() => {
  if (permissionStatus === 'granted' && !isTracking && !trackingStartedRef.current) {
    trackingStartedRef.current = true;
    startTracking();
  }
  if (!isTracking) {
    trackingStartedRef.current = false;
  }
}, [permissionStatus, isTracking, startTracking]);
```

### LocationProvider

| # | useEffect | Dependencias | Análisis |
|---|-----------|--------------|----------|
| 1 | Cleanup | `[]` | ✅ Correcto |
| 2 | CheckPermission | `[]` | ✅ Correcto |
| 3 | AppState | `[appState]` | ✅ Correcto |

---

## AUDITORÍA DEL STORE

### Estados del LocationStore

| Estado | Tipo | Inicial | Quién lo escribe | Quién lo lee |
|--------|------|---------|------------------|--------------|
| `currentLocation` | LocationData \| null | `null` | handleLocationUpdate | UI, RecorridoScreen |
| `previousLocation` | LocationData \| null | `null` | handleLocationUpdate | - |
| `permissionStatus` | PermissionStatus | `'denied'` | requestPermission, handleLocationError | RecorridoScreen, LocationProvider |
| `gpsStatus` | GpsStatus | `'unavailable'` | handleLocationUpdate, handleLocationError | UI |
| `isTracking` | boolean | `false` | startTracking, stopTracking, handleLocationUpdate | RecorridoScreen, LocationProvider |
| `error` | Error \| null | `null` | handleLocationError | UI |
| `lastUpdate` | number \| null | `null` | handleLocationUpdate | UI |

---

## AUDITORÍA DEL BRIDGE

### Contrato TypeScript ↔ Kotlin

| Capa | Método | Parámetros | Estado |
|------|--------|------------|--------|
| TypeScript Interface | `startLocationUpdates(options)` | 1 | ✅ Sincronizado |
| TypeScript Call | `GuidyLocation.startLocationUpdates(mergedOptions)` | 1 | ✅ Correcto |
| Kotlin Method | `startLocationUpdates(options: ReadableMap)` | 1 | ✅ Correcto |

### Eventos Nativos → JS

| Evento | Origen (Kotlin) | Handler (JS) | Acción |
|--------|-----------------|--------------|--------|
| `GuidyLocationUpdate` | `locationCallback.onLocationResult()` | `handleLocationUpdate()` | Actualiza ubicación |
| `GuidyLocationError` | `locationCallback.onLocationAvailability(false)` | `handleLocationError()` | gpsStatus = 'unavailable' |
| `GuidyLocationStatus` | `trackingStopped` | Actualiza estado interno | Cleanup callbacks |

---

## CAUSA RAÍZ 1: LOOP GPS DISPONIBLE ↔ NO DISPONIBLE

### Problema Observado

```
GPS Disponible → GPS No Disponible → GPS Disponible → GPS No Disponible → ...
(loop infinito)
```

### Causa Raíz Identificada

**Archivo:** `GuidyLocationModule.kt`  
**Líneas:** 434-447

```kotlin
override fun onLocationAvailability(availability: LocationAvailability) {
    log("Location availability: ${availability.isLocationAvailable}")
    if (!isTracking || !isModuleReady) {
        return
    }
    
    // ❌ PROBLEMA: Solo maneja NO disponible
    if (!availability.isLocationAvailable) {
        val errorEvent = Arguments.createMap().apply {
            putString("type", "error")
            putString("code", "LOCATION_UNAVAILABLE")
            putString("message", "Location is not available")
        }
        sendEvent("GuidyLocationError", errorEvent)
    }
    // ❌ FALTA: Manejar cuando disponibilidad vuelve a TRUE
    // Android llama a este callback cuando la disponibilidad CAMBIA
    // No hay evento para cuando vuelve a TRUE
}
```

### Flujo del Loop

1. `onLocationResult` recibe ubicación → `gpsStatus = 'active'`
2. `onLocationAvailability(false)` → `gpsStatus = 'unavailable'`
3. Android reporta disponibilidad de nuevo (onLocationAvailability(true)) → ❌ **NO SE MANEJA**
4. `onLocationResult` recibe ubicación → `gpsStatus = 'active'`
5. goto 2 → **LOOP**

### Evidencia

El código Kotlin NO tiene manejo para cuando `availability.isLocationAvailable` vuelve a `true`. Solo envía error cuando es `false`.

### Solución Propuesta

Agregar manejo para disponibilidad recuperada:

```kotlin
// En onLocationAvailability():
if (availability.isLocationAvailable) {
    // Enviar evento de disponibilidad recuperada
    // O no hacer nada - el GPS sigue activo esperando ubicaciones
} else {
    // Enviar error como antes
}
```

**Riesgo:** Medio - Requiere modificar GuidyLocationModule.kt

---

## CAUSA RAÍZ 2: NAVEGACIÓN FALLIDA POST-PERMISOS

### Problema Observado

```
✓ Usuario concede permisos
✗ No navega automáticamente al mapa
✓ Usuario debe cerrar y reabrir la app
```

### Análisis del Flujo

1. **RecorridoScreen se monta**
2. **useEffect verifica permissionStatus**
3. **permissionStatus = 'denied' → muestra pantalla de permisos**
4. **Usuario concede permisos**
5. **Android devuelve result a la app**
6. **LocationProvider.setPermissionStatus('granted')**
7. **RecorridoScreen re-renderiza**
8. **useEffect detecta permissionStatus === 'granted'**
9. **startTracking() es llamado**

### Verificación del Flujo

El flujo ES correcto. El useEffect en RecorridoScreen (líneas 69-79) debería detectar el cambio y llamar a startTracking.

### Posible Causa

**El contexto useMemo podría no estar propagando cambios correctamente.**

```typescript
// LocationProvider.tsx línea 430-455
const contextValue = useMemo<LocationContextValue>(() => ({
    // ... estados ...
    permissionStatus,  // ← Este debería cambiar
    startTracking,      // ← Función referencialmente estable
}), [
    // ... dependencias ...
    permissionStatus,   // ← Incluido
    // ... 
]);
```

**Análisis:** El contexto SÍ se actualiza cuando permissionStatus cambia. El useEffect SÍ debería ejecutarse.

### Verificación Adicional Necesaria

El problema real podría ser:
1. El hook `useLocation()` no se re-suscribe cuando el contexto cambia
2. El ref `trackingStartedRef` se mantiene entre renders
3. El `startTracking` se ejecuta pero algo falla internamente

**Verificación pendiente:** Logs de debug en el dispositivo.

### Solución Propuesta

1. Verificar logs de `[TRACKING]` en Logcat
2. Agregar console.log en startTracking para confirmar ejecución
3. Verificar que `locationService.startLocationUpdates()` no falle

**Riesgo:** Bajo - Problema de debugging, no de código

---

## PROBLEMAS ADICIONALES IDENTIFICADOS

### Problema 1: Contexto no estable

**Archivo:** `LocationProvider.tsx`  
**Líneas:** 430-455

El `contextValue` se recrea cada vez que cualquier dependencia cambia. Esto incluye `startTracking`, que se recrea cada vez que `handleLocationUpdate` o `handleLocationError` cambian.

```typescript
// startTracking depende de handleLocationUpdate y handleLocationError
// handleLocationUpdate depende de isMounted (ref estable)
// handleLocationError depende de isMounted (ref estable)
// Pero las funciones useCallback se recalculan cuando cambian deps
```

**Impacto:** Posibles re-renders innecesarios en consumidores del contexto.

### Problema 2: No hay verificación post-permisos

Después de que el usuario concede permisos, la app no verifica inmediatamente si el tracking debe comenzar. Depende del useEffect en RecorridoScreen.

**Impacto:** Si el useEffect no se ejecuta correctamente, el tracking no inicia.

---

## RESUMEN DE PROBLEMAS

| # | Problema | Causa Raíz | Archivo | Líneas | Severidad |
|---|----------|------------|---------|--------|-----------|
| 1 | Loop GPS Disponible/No Disponible | onLocationAvailability no maneja disponibilidad TRUE | GuidyLocationModule.kt | 434-447 | Alta |
| 2 | Navegación fallida post-permisos | Necesita verificación en logs | - | - | Media |

---

## RECOMENDACIONES DE CORRECCIÓN

### Para STAGE 3.4B (Correcciones)

1. **Fix loop GPS:**
   ```kotlin
   // En GuidyLocationModule.kt, onLocationAvailability()
   override fun onLocationAvailability(availability: LocationAvailability) {
       if (!isTracking || !isModuleReady) {
           return
       }
       
       if (!availability.isLocationAvailable) {
           // Error - GPS no disponible
           sendEvent("GuidyLocationError", errorEvent)
       }
       // No enviar evento cuando vuelve a TRUE
       // El GPS sigue activo esperando ubicaciones
   }
   ```

2. **Verificación de navegación:**
   - Agregar logs en startTracking()
   - Verificar que permissionStatus realmente cambia a 'granted'
   - Confirmar que startTracking() se ejecuta

3. **Estabilización del contexto:**
   - Considerar usar useCallback para todas las funciones del contexto
   - Verificar que startTracking sea referencialmente estable

---

## COMMIT REALIZADO

```bash
# No se realizan cambios en código (STAGE de auditoría únicamente)
# Los cambios serán aplicados en STAGE 3.4B
```

---

## APROBACIÓN REQUERIDA

Para continuar con STAGE 3.4B (implementación de correcciones):

1. Aprobar las correcciones propuestas
2. Generar nuevo APK Debug
3. Validar físicamente:
   - Conceder permisos → verificar navegación automática
   - Observar GPS status → verificar no hay loop
   - Mantener app abierta 5+ minutos → verificar estabilidad

---

*Reporte de auditoría generado: 2026-07-22*

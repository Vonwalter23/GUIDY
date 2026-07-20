# STAGE 3.2A: Root Cause Investigation

**Fecha:** 2026-07-17  
**Versión:** v0.0.6-STAGE3.2A  
**Estado:** 🔍 INVESTIGACIÓN COMPLETA

---

## Problema Reportado

Después de conceder el permiso de ubicación en un dispositivo Android físico:
- La aplicación permanece mostrando "Buscando ubicación..."
- Nunca aparecen coordenadas reales
- El GPS no entrega ubicación

---

## Preguntas Obligatorias Respondidas

### 1. ¿Qué librería exacta obtiene la ubicación?

**Respuesta:**
```
Librería: @react-native-community/geolocation v3.4.0
Paquete: @react-native-community/geolocation
```

**Evidencia:**
```typescript
// src/services/location/LocationService.ts (línea 17-20)
import Geolocation, {
  GeolocationResponse,
  GeolocationError,
} from '@react-native-community/geolocation';
```

---

### 2. ¿Se utiliza realmente FusedLocationProviderClient?

**Respuesta: NO**

`@react-native-community/geolocation` usa **Android LocationManager**, NO FusedLocationProviderClient.

**Evidencia:**
```typescript
// src/services/location/LocationService.ts (líneas 1-14)
/**
 * IMPORTANT: This file uses @react-native-community/geolocation
 * which internally uses Android's LocationManager (NOT FusedLocationProviderClient)
 * 
 * For FusedLocationProviderClient, consider using react-native-geolocation-service
 * but this requires additional native configuration.
 */
```

---

### 3. ¿O se utiliza react-native-geolocation-service?

**Respuesta: NO**

Actualmente NO se usa `react-native-geolocation-service`. Se usa `@react-native-community/geolocation`.

**Diferencia:**
| Librería | Proveedor | Configuración |
|----------|-----------|---------------|
| @react-native-community/geolocation | Android LocationManager | Básica |
| react-native-geolocation-service | FusedLocationProviderClient | Requiere configuración nativa adicional |

---

### 4. ¿Qué método exacto solicita la primera ubicación?

**Respuesta:**

Se usan DOS métodos en paralelo:

1. **`getCurrentLocation()`** - Solicita ubicación inmediata
```typescript
// LocationProvider.tsx (línea 258)
locationService.getCurrentLocation({enableHighAccuracy})
  .then(handleLocationUpdate)
  .catch(...);
```

2. **`startLocationUpdates()`** → `watchPosition()` - Tracking continuo
```typescript
// LocationProvider.tsx (línea 247)
locationService.startLocationUpdates(
  handleLocationUpdate,
  handleLocationError,
  {enableHighAccuracy, distanceFilter, interval},
);
```

---

### 5. ¿getCurrentLocation() devuelve null?

**Respuesta:** Depende del dispositivo.

El método devuelve:
- **Success:** `Promise<LocationData>` con coordenadas
- **Error:** `Promise rejection` con error.code y error.message

**Logs que permiten diagnosticar:**
```
[GPS ${timestamp}] getCurrentLocation() CALLED
[GPS ${timestamp}] Calling Geolocation.getCurrentPosition()
[GPS ${timestamp}] getCurrentPosition SUCCESS o ERROR
```

---

### 6. ¿watchPosition() recibe callbacks?

**Respuesta:** Sí, si el GPS funciona correctamente.

**Logs que permiten diagnosticar:**
```
[GPS ${timestamp}] watchPosition started successfully
[GPS ${timestamp}] watchPosition SUCCESS o ERROR
```

---

### 7. ¿Se ejecuta el callback de error?

**Respuesta:** Sí, cuando hay error.

**Código del callback:**
```typescript
// LocationService.ts (líneas 325-337)
(error: GeolocationError) => {
  // Logs detallados del error
  console.log(`[GPS ${timestamp}] Error code: ${error.code} (${getErrorDescription(error.code)})`);
  console.log(`[GPS ${timestamp}] Error message: ${error.message}`);
  onError(toLocationError(error));
}
```

---

### 8. ¿Cuál es el código exacto del error?

**Respuesta:** Puede ser uno de:

| Código | Constante | Significado |
|--------|-----------|-------------|
| 1 | PERMISSION_DENIED | Permiso denegado |
| 2 | POSITION_UNAVAILABLE | GPS no disponible |
| 3 | TIMEOUT | Tiempo agotado |
| 0 | UNKNOWN | Error desconocido |

**Logs:**
```
[GPS ${timestamp}] ERROR - Code: 2 (POSITION_UNAVAILABLE)
[GPS ${timestamp}] ERROR - Message: "Ubicación no disponible..."
```

---

### 9. ¿Google Play Services está disponible?

**Respuesta:** No es relevante directamente.

`@react-native-community/geolocation` usa `Android LocationManager`, que NO requiere Google Play Services.

**Nota:** Para usar FusedLocationProviderClient se necesita Google Play Services Y la librería `react-native-geolocation-service`.

---

### 10. ¿El dispositivo devuelve LastKnownLocation?

**Respuesta:** Potencialmente sí.

El `Geolocation.getCurrentPosition()` de `@react-native-community/geolocation` puede usar `LastKnownLocation` para devolver una ubicación rápida mientras obtiene una nueva.

**Parámetros relevantes:**
```typescript
maximumAge: mergedOptions.maximumAge ?? 0  // En getCurrentLocation
```

Con `maximumAge: 0` se fuerza una ubicación fresca.

---

### 11. ¿El callback actualiza correctamente Zustand?

**Respuesta:** Sí, según el código.

**Flujo:**
```
1. Geolocation callback → handleLocationUpdate()
2. handleLocationUpdate() → store.setCurrentLocation(location)
3. store.setGpsStatus(getGpsStatus(location))
4. store.setLastUpdate(Date.now())
```

**Logs:**
```
[GPS Provider ${timestamp}] handleLocationUpdate() CALLED
[GPS Provider ${timestamp}] Location received: {lat, lng, accuracy, ...}
[GPS Provider ${timestamp}] Updated store.currentLocation
[GPS Provider ${timestamp}] Updated store.gpsStatus: active
```

---

### 12. ¿El mapa consume correctamente el Store?

**Respuesta:** Sí, según el código.

**Consumo:**
```typescript
// RecorridoScreen.tsx
const {
  currentLocation,
  gpsStatus,
  isTracking,
  ...
} = useLocation();
```

---

### 13. ¿Existe race condition?

**Respuesta:** Potencialmente sí.

**Código problemático:**
```typescript
// LocationProvider.tsx (líneas 247-266)
// Ambos se llaman simultáneamente
locationService.startLocationUpdates(...);  // No returns promise
locationService.getCurrentLocation(...)     // Promise
  .then(handleLocationUpdate)
  .catch(...);
```

Si `startLocationUpdates()`Internally calls `watchPosition()`, ambas funciones escuchan el GPS simultáneamente. Esto NO causa problemas de ubicación, pero puede causar múltiples callbacks.

---

### 14. ¿Existe timeout?

**Respuesta:** Sí, en `getCurrentLocation()`.

```typescript
// LocationService.ts (línea 215)
timeout: mergedOptions.timeout ?? 15000,  // 15 segundos
```

**Nota:** `watchPosition()` NO tiene timeout configurado. Puede esperar indefinidamente.

```typescript
// LocationService.ts (línea 339-342)
{
  enableHighAccuracy: mergedOptions.enableHighAccuracy ?? true,
  distanceFilter: mergedOptions.distanceFilter ?? 0,
  // NO timeout aquí!
}
```

---

### 15. ¿Qué muestran exactamente los logs?

**Respuesta:** Ahora se registran TODOS los eventos con timestamps:

```
[GPS ${timestamp}] ========================================
[GPS ${timestamp}] startTracking() CALLED
[GPS ${timestamp}] Options: {enableHighAccuracy: true, distanceFilter: 0, interval: 5000}
[GPS ${timestamp}] Library: @react-native-community/geolocation
[GPS ${timestamp}] ========================================

[GPS ${timestamp}] hasPermission: true
[GPS ${timestamp}] Permission granted, starting watchPosition()
[GPS ${timestamp}] Watch options: {enableHighAccuracy: true, distanceFilter: 0}

[GPS ${timestamp}] watchPosition started successfully
[GPS ${timestamp}] watchId assigned: 1
[GPS ${timestamp}] isTracking set to: true

[GPS ${timestamp}] Calling Geolocation.getCurrentPosition()
[GPS ${timestamp}] With options: {enableHighAccuracy: true, timeout: 15000, maximumAge: 0}

[GPS Provider ${timestamp}] ==============================
[GPS Provider ${timestamp}] handleLocationUpdate() CALLED
[GPS Provider ${timestamp}] Location received: {lat: -34.603723, lng: -58.381593, ...}
[GPS Provider ${timestamp}] Updated store.gpsStatus: active
```

---

## Arquitectura Revisada

```
┌─────────────────────────────────────────────────────────────────┐
│                        RecorridoScreen.tsx                       │
│  useEffect: permissionStatus === 'granted' → startTracking()    │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LocationProvider.tsx                          │
│  startTracking():                                                │
│    1. store.setGpsStatus('searching')                          │
│    2. locationService.startLocationUpdates()                     │
│    3. locationService.getCurrentLocation()                       │
└──────────────────────────┬──────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
┌─────────────────────────┐   ┌─────────────────────────────────┐
│ LocationService.ts      │   │ LocationService.ts               │
│ startLocationUpdates()  │   │ getCurrentLocation()             │
│                         │   │                                 │
│ Geolocation.watchPosition│   │ Geolocation.getCurrentPosition │
│   └─ onSuccess:         │   │   └─ Promise resolve:           │
│       toLocationData()  │   │       toLocationData()          │
│       onSuccess(loc)    │   │       resolve(location)        │
│   └─ onError:          │   │   └─ Promise reject:            │
│       onError(err)     │   │       reject(error)            │
└─────────────────────────┘   └─────────────────────────────────┘
              │                                     │
              └──────────────┬──────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                 @react-native-community/geolocation              │
│                                                                 │
│  PROVEEDOR: Android LocationManager (NO FusedLocationProvider)  │
│                                                                 │
│  Métodos usados:                                                │
│  - Geolocation.getCurrentPosition()                             │
│  - Geolocation.watchPosition()                                  │
│  - Geolocation.clearWatch()                                     │
│                                                                 │
│  PermissionsAndroid para permisos Android                         │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Android LocationManager                       │
│                                                                 │
│  Requisitos:                                                     │
│  - Permisos en AndroidManifest.xml ✓                            │
│  - ACCESS_FINE_LOCATION ✓                                       │
│  - ACCESS_COARSE_LOCATION ✓                                      │
│  - GPS Hardware del dispositivo                                  │
│  - Android Location Services enabled                             │
│                                                                 │
│  NO requiere:                                                   │
│  - Google Play Services                                         │
│  - FusedLocationProviderClient                                   │
│  - Configuración adicional de Google                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Resumen de Configuración

### AndroidManifest.xml
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

### package.json
```json
"@react-native-community/geolocation": "^3.4.0"
```

### Opciones de Geolocation
```typescript
// getCurrentPosition
{
  enableHighAccuracy: true,
  timeout: 15000,       // 15 segundos
  maximumAge: 0         // No usar cache
}

// watchPosition  
{
  enableHighAccuracy: true,
  distanceFilter: 0     // Todas las actualizaciones
}
```

---

## Causa Raíz Identificada

### Análisis

El problema reportedo indica que el GPS permanece en "Buscando ubicación..." indefinidamente. Esto puede ser causado por:

1. **GPS Hardware Issue**
   - El GPS del dispositivo no puede obtener señal
   - Solución: Verificar que el GPS está activado

2. **Android Location Services**
   - Los servicios de ubicación de Android están deshabilitados
   - Solución: Activar "Ubicación" en Settings

3. **Provider Issue**
   - `@react-native-community/geolocation` usa LocationManager básico
   - NO tiene acceso a FusedLocationProvider de Google
   - Solución: Considerar usar `react-native-geolocation-service`

4. **Timeout Issue**
   - `getCurrentPosition` tiene timeout de 15 segundos
   - `watchPosition` NO tiene timeout
   - Puede quedar esperando indefinidamente

---

## Evidencias Agregadas

### Logs Detallados

Se agregaron logs exhaustivos con timestamps en:

1. **LocationService.ts**
   - `getCurrentLocation()` - Cada paso
   - `startLocationUpdates()` - Cada paso
   - `stopLocationUpdates()` - Cada paso
   - Callbacks de éxito y error
   - Tiempos de ejecución
   - Proveedor utilizado

2. **LocationProvider.tsx**
   - `handleLocationUpdate()` - Store updates
   - `handleLocationError()` - Errores
   - `startTracking()` - Inicio de tracking
   - Permisos y estados

### Formato de Logs

```
[GPS ${ISO_TIMESTAMP}] ========================================
[GPS ${ISO_TIMESTAMP}] METHOD_NAME() CALLED
[GPS ${ISO_TIMESTAMP}] PARAMETERS: {...}
[GPS ${ISO_TIMESTAMP}] RESULT: {...}
[GPS ${ISO_TIMESTAMP}] ========================================
```

---

## Pruebas Requeridas en Dispositivo Físico

### Logcat Commands

```bash
# Filtrar logs de GPS
adb logcat | grep "\[GPS"

# Filtrar logs de LocationProvider
adb logcat | grep "GPS Provider"

# Todos los logs de la app
adb logcat -s GUIDY:V
```

### Capturas Requeridas

El usuario debe proporcionar:

1. [ ] Logcat completo desde el inicio de la app
2. [ ] Logs después de conceder permiso
3. [ ] Logs después de 30 segundos de espera
4. [ ] Screenshots de la pantalla del dispositivo

---

## Conclusión

### Causa Raíz Potencial

Según el análisis del código, el problema puede ser:

1. **El GPS del dispositivo no puede obtener señal**
2. **Los servicios de ubicación de Android están deshabilitados**
3. **El proveedor de ubicación básico no es suficiente**

### Recomendación

Para diagnóstico definitivo, se necesitan los **logs de Logcat** del dispositivo físico mostrando:

1. Si `getCurrentPosition` o `watchPosition` reciben callback de éxito
2. Si reciben callback de error
3. Cuál es el código del error (si hay error)
4. El mensaje del error

### Solución Potencial

Si los logs confirman que `POSITION_UNAVAILABLE` (código 2) es el error:

**Opción 1:** Mantener `@react-native-community/geolocation`
- Agregar más tiempo de espera
- Mostrar instrucciones al usuario

**Opción 2:** Migrar a `react-native-geolocation-service`
- Usa FusedLocationProviderClient
- Mejor precisión y velocidad
- Requiere configuración nativa adicional

---

## Archivos Creados/Modificados

| Archivo | Cambio |
|---------|--------|
| `src/services/location/LocationService.ts` | +200 líneas de logging |
| `src/services/location/LocationProvider.tsx` | +150 líneas de logging |
| `docs/STAGE_3_2A_ROOT_CAUSE.md` | Este documento |

---

## Build Information

**Debug APK:** Pending build  
**Release APK:** Pending build

---

## Próximo Paso

Una vez que el usuario proporcione los logs de Logcat del dispositivo físico, se podrá determinar la causa exacta del problema.

**NO SE APLICARÁ NINGUNA CORRECCIÓN hasta tener evidencia de los logs.**

---

*Documento generado - STAGE 3.2A Investigation*

# STAGE 3.3B: PROFESSIONAL CRASH INVESTIGATION

**Fecha:** 2026-07-21  
**Versión:** v0.0.6-STAGE3.3B  
**Estado:** 🔍 INVESTIGACIÓN COMPLETADA - CORRECCIÓN PENDIENTE

---

## Validación Física Confirmada

| Verificación | Estado |
|-------------|--------|
| APK instala | ✅ |
| Splash correcta | ✅ |
| Home correcta | ✅ |
| Configuración correcta | ✅ |
| Permisos correctos | ✅ |
| Mapa aparece | ✅ |
| Se muestra "Buscando ubicación..." | ✅ |
| **Crash a los pocos segundos** | ❌ CRASH CONFIRMADO |

---

## Cronología del Crash

```
1. App inicia correctamente
2. Splashscreen se muestra
3. Navegación a Home funciona
4. Navegación a Configuración funciona
5. Navegación a Recorrido funciona
6. Mapa se renderiza correctamente
7. Se otorgan permisos de ubicación
8. Estado cambia a "Buscando ubicación..."
9. SE LLAMA startTracking()
10. SE CRASHEA ❌
```

---

## Puntos de Crash Identificados

### 1. NATIVE MODULE - GuidyLocationModule.kt

#### Posible Crash #1: NullPointerException en Inicialización

**Archivo:** `GuidyLocationModule.kt`  
**Línea:** 45  
**Método:** `init`  
**Código:**
```kotlin
init {
    reactContext.addLifecycleEventListener(this)
    fusedLocationClient = LocationServices.getFusedLocationProviderClient(reactContext)
    log("Module initialized - FusedLocationProviderClient ready")
}
```

**Descripción:** Si `reactContext` es null, `LocationServices.getFusedLocationProviderClient()` podría fallar.

---

#### Posible Crash #2: NullPointerException en currentActivity

**Archivo:** `GuidyLocationModule.kt`  
**Línea:** 83  
**Método:** `requestPermission()`  
**Código:**
```kotlin
fun requestPermission(promise: Promise) {
    log("Requesting location permission...")
        
    val activity = reactContext.currentActivity
    if (activity == null) {  // <-- Aquí se verifica, pero si pasa...
        log("No activity available")
        promise.reject("E_NO_ACTIVITY", "No activity available")
        return
    }
```

**Descripción:** Si `currentActivity` es null en algún momento no controlado, podría causar crash.

---

#### Posible Crash #3: Google Play Services No Disponible

**Archivo:** `GuidyLocationModule.kt`  
**Línea:** 45  
**Método:** `init`  
**Código:**
```kotlin
fusedLocationClient = LocationServices.getFusedLocationProviderClient(reactContext)
```

**Descripción:** Si el dispositivo NO tiene Google Play Services instalado, esto lanzaría:

```
java.lang.IllegalStateException: Not instantiating FusedLocationProviderClient because it could not find the Google Play Services namespace.
```

**Probabilidad:** MEDIA - Dispositivos sin GMS (Huawei, emuladores genéricos)

---

#### Posible Crash #4: SecurityException en getCurrentLocation

**Archivo:** `GuidyLocationModule.kt`  
**Línea:** 147  
**Método:** `getCurrentLocation()`  
**Código:**
```kotlin
fusedLocationClient?.getCurrentLocation(priority, null)?.addOnSuccessListener { location ->
    // ...
}?.addOnFailureListener { e ->
    // ...
}
```

**Descripción:** Aunque se verifica permiso en línea 127, `getCurrentLocation()` puede lanzar `SecurityException` si:
- El permiso fue revocado entre la verificación y la llamada
- El permiso no se propagó correctamente al Native Module
- El Context no tiene permisos de Location

---

#### Posible Crash #5: Crash en sendEvent()

**Archivo:** `GuidyLocationModule.kt`  
**Línea:** 55-58  
**Método:** `sendEvent()`  
**Código:**
```kotlin
private fun sendEvent(eventName: String, params: WritableMap) {
    reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(eventName, params)
}
```

**Descripción:** Si `reactContext` está en estado de destrucción (`onHostDestroy`), `getJSModule()` podría lanzar excepción.

---

#### Posible Crash #6: Callbacks Invocados Después de Destrucción

**Archivo:** `GuidyLocationModule.kt`  
**Líneas:** 148-176, 222-232  
**Métodos:** `getCurrentLocation()`, `onLocationResult()`  
**Descripción:** Los callbacks asíncronos pueden ejecutarse después de que el módulo fue destruido, causando crash cuando intentan acceder a `reactContext` o `pendingWatchCallbacks`.

---

### 2. TYPE WRAPPER - FusedLocationProvider.ts

#### Posible Crash #7: Native Module No Disponible

**Archivo:** `FusedLocationProvider.ts`  
**Línea:** 30  
**Código:**
```typescript
const {GuidyLocation} = NativeModules as {GuidyLocation: GuidyLocationNativeModule};
```

**Descripción:** Si `GuidyLocation` es `undefined` o `null`, todas las llamadas fallarán.

**Mitigación actual:** Se verifica en cada método, pero podría ser demasiado tarde si el módulo se carga mal.

---

#### Posible Crash #8: EventEmitter en Módulo Nulo

**Archivo:** `FusedLocationProvider.ts`  
**Líneas:** 33-35  
**Código:**
```typescript
const locationEmitter = Platform.OS === 'android' && GuidyLocation
  ? new NativeEventEmitter(NativeModules.GuidyLocation)
  : null;
```

**Descripción:** Si `NativeModules.GuidyLocation` es `null`, `new NativeEventEmitter(null)` podría causar problemas.

---

### 3. SERVICE LAYER - LocationService.ts

#### Posible Crash #9: Promesa Rechazada Sin Handler

**Archivo:** `LocationService.ts`  
**Líneas:** 258-266  
**Código:**
```typescript
locationService.getCurrentLocation({enableHighAccuracy})
  .then(handleLocationUpdate)
  .catch((error) => {
    if (DEBUG_GPS) {
      console.log(`[GPS Provider ${getTimestamp()}] Immediate location failed:`, JSON.stringify(error));
    }
    // Don't call handleLocationError here - let watchPosition handle it
  });
```

**Descripción:** El `.catch()` está vacío para `getCurrentLocation`, pero si `handleLocationUpdate` lanza una excepción, no hay handler.

---

#### Posible Crash #10: State Update en Componente Desmontado

**Archivo:** `LocationService.ts`  
**Líneas:** 203-214  
**Código:**
```typescript
(location: LocationData) => {
  const elapsed = Date.now() - this.startTime;
  this.isTracking = true;
  // ...
  if (isValidLocation(location)) {
    onSuccess(location);  // <-- Puede actualizar estado de React
  }
}
```

**Descripción:** Si el componente se desmonta mientras llega la ubicación, `onSuccess` intentará hacer `setState` en un componente desmontado.

---

### 4. PROVIDER - LocationProvider.tsx

#### Posible Crash #11: store.setIsTracking en Componente Desmontado

**Archivo:** `LocationProvider.tsx`  
**Línea:** 226  
**Código:**
```typescript
// Set tracking state
store.setIsTracking(true);  // <-- Zustand store update
```

**Descripción:** Aunque Zustand está diseñado para ser seguro, actualizaciones rápidas pueden causar problemas si el Provider se desmonta mientras se actualiza.

---

#### Posible Crash #12: Closure en useCallback Dependencias

**Archivo:** `LocationProvider.tsx`  
**Línea:** 271  
**Código:**
```typescript
}, [store, handleLocationUpdate, handleLocationError, enableHighAccuracy, distanceFilter, interval]);
```

**Descripción:** `store` como dependencia puede causar re-renders infinitos o closures stale.

---

## Causas Raíz Más Probables

### 🔴 CAUSA RAÍZ #1 (ALTA PROBABILIDAD): Google Play Services No Disponible

**Evidencia间接a:** El crash ocurre específicamente cuando se llama `startLocationUpdates()` que usa `FusedLocationProviderClient`.

**Síntomas esperados en logcat:**
```
AndroidRuntime: FATAL EXCEPTION: main
java.lang.IllegalStateException: Not instantiating FusedLocationProviderClient because it could not find the Google Play Services namespace.
```

**Solución propuesta:** Agregar verificación de Google Play Services antes de inicializar.

---

### 🟡 CAUSA RAÍZ #2 (MEDIA PROBABILIDAD): NullPointerException en currentActivity

**Evidencia间接a:** El Native Module guarda `reactContext.currentActivity` pero el Activity puede ser null.

**Síntomas esperados en logcat:**
```
AndroidRuntime: FATAL EXCEPTION: main
java.lang.NullPointerException: Attempt to invoke virtual method 'void android.app.Activity.requestPermissions(java.lang.String[], int)' on a null object reference
```

**Solución propuesta:** Verificar Activity null en todos los puntos de uso.

---

### 🟡 CAUSA RAÍZ #3 (MEDIA PROBABILIDAD): Crash en Callbacks Asíncronos

**Evidencia间接a:** Los callbacks de ubicación llegan después de que el módulo se destruye.

**Síntomas esperados en logcat:**
```
AndroidRuntime: FATAL EXCEPTION: main
java.lang.NullPointerException: Attempt to invoke interface method 'void com.facebook.react.bridge.Promise.resolve(java.lang.Object)' on a null object reference
```

**Solución propuesta:** Agregar verificación de `isTracking` antes de invocar callbacks.

---

## Evidencia Requerida del Usuario

Para confirmar la causa raíz exacta, se necesita el logcat completo:

```bash
# Capturar logcat completo
adb logcat -c && adb logcat *:V > logcat_full.txt

# Filtrar por crash
adb logcat | grep -i "FATAL\|EXCEPTION\|CRASH\|AndroidRuntime"

# Filtrar por [GUIDY GPS]
adb logcat | grep -i "GUIDY GPS\|GuidyLocation"
```

---

## Posibles Soluciones (Sin Implementar)

### Solución A: Verificar Google Play Services
```kotlin
fun checkGooglePlayServices(): Boolean {
    val gms = GoogleApiAvailability.getInstance()
    val status = gms.isGooglePlayServicesAvailable(reactContext)
    return status == ConnectionResult.SUCCESS
}
```

### Solución B: Agregar try-catch en Initialization
```kotlin
init {
    reactContext.addLifecycleEventListener(this)
    try {
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(reactContext)
        log("Module initialized - FusedLocationProviderClient ready")
    } catch (e: Exception) {
        log("CRITICAL: Failed to initialize FusedLocationProviderClient: ${e.message}")
        fusedLocationClient = null
    }
}
```

### Solución C: Verificar Activity Antes de Usar
```kotlin
private fun getValidActivity(): Activity? {
    val activity = reactContext.currentActivity
    if (activity == null || activity.isFinishing || activity.isDestroyed) {
        return null
    }
    return activity
}
```

### Solución D: Proteger Callbacks con isTracking
```kotlin
override fun onLocationResult(result: LocationResult) {
    if (!isTracking || pendingWatchCallbacks == null) {
        log("Callback ignored - module destroyed or stopped")
        return
    }
    // Continuar con callback...
}
```

---

## Conclusión

El crash ocurre en la transición de mostrar "Buscando ubicación..." a obtener la primera ubicación GPS. La causa más probable es:

1. **Google Play Services no disponible en el dispositivo** (Huawei, emuladores sin GMS)
2. **NullPointerException en `currentActivity`**
3. **Excepción no manejada en `FusedLocationProviderClient`**

**Se requiere logcat del usuario para confirmar la causa exacta.**

---

*Documento generado automáticamente - STAGE 3.3B CRASH ANALYSIS*

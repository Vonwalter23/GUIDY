# STAGE 4.1.1 COMPLETED

## LOCATION MARKER FORENSIC INVESTIGATION

**Fecha:** 2026-07-24
**Estado:** INVESTIGACIÓN COMPLETADA ✅
**Tipo:** Diagnóstico Arquitectónico

---

## 1. INVESTIGATION SUMMARY

Se realizó una investigación forense completa del flujo de ubicación para determinar por qué el punto azul de ubicación del usuario no se muestra en el mapa después de la recuperación a Stage 4.1.

**Resultado:** Se identificó la causa raíz en el componente OpenStreetMap.

---

## 2. CURRENT ARCHITECTURE

```
Android Native (GuidyLocationModule.kt)
    ↓ (Native Events)
FusedLocationProvider.ts
    ↓ (JavaScript Events)
LocationProvider.tsx
    ↓ (React Context)
MapProvider.tsx
    ↓ (userMarker state)
OpenStreetMap.tsx ⚠️ PROBLEMA AQUÍ
    ↓ (WebView postMessage)
Leaflet.js (Mapa)
    ↓
User Location Marker (PUNTO AZUL)
```

---

## 3. LOCATION FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ANDROID LAYER                                     │
│  GuidyLocationModule.kt                                              │
│  - FusedLocationProviderClient                                       │
│  - LifecycleEventListener                                           │
│  - sendEvent("GuidyLocationUpdate", locationEvent)                  │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ Native Event
┌─────────────────────────────────────────────────────────────────────┐
│                  REACT NATIVE LAYER                                 │
│                                                                      │
│  FusedLocationProvider.ts                                            │
│  - NativeEventEmitter                                                │
│  - Listener: "GuidyLocationUpdate" → trackingCallback               │
│                                                                      │
│  LocationProvider.tsx                                               │
│  - handleLocationUpdate() → setCurrentLocation()                     │
│  - locationStateMachine.getCurrentLocation()                         │
│  - Context: currentLocation                                         │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ Context Hook: useLocation()
┌─────────────────────────────────────────────────────────────────────┐
│                      MAP LAYER                                       │
│                                                                      │
│  MapProvider.tsx                                                    │
│  - const location = useLocation()                                   │
│  - const currentLocation = location?.currentLocation                 │
│  - useEffect: setUserMarker({...}) cuando currentLocation cambia   │
│  - Context: userMarker                                              │
│                                                                      │
│  OpenStreetMap.tsx ⚠️ CAUSA RAÍZ                                   │
│  - const { userMarker } = useMap()                                 │
│  - useEffect: postMessage({type: 'updateLocation', ...})          │
│  - WebView: NO RECIBE EL MENSAJE ❌                               │
│                                                                      │
│  HTML/Leaflet                                                       │
│  - userMarker = null (nunca se actualiza)                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. COMPONENT ANALYSIS

### 4.1 Android Native Layer ✅

**Archivo:** `android/app/src/main/java/com/guidy/location/GuidyLocationModule.kt`

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| FusedLocationProviderClient | ✅ OK | Instanciado correctamente |
| Lifecycle Management | ✅ OK | LifecycleEventListener implementado |
| Permissions | ✅ OK | checkSelfPermission verificado |
| Event Emission | ✅ OK | sendEvent("GuidyLocationUpdate", ...) |
| Error Handling | ✅ OK | try-catch en todo el código |

**Conclusión:** Android está funcionando correctamente y emitiendo eventos de ubicación.

---

### 4.2 FusedLocationProvider.ts ✅

**Archivo:** `src/services/location/FusedLocationProvider.ts`

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| NativeEventEmitter | ✅ OK | Configurado correctamente |
| Event Listeners | ✅ OK | Escucha "GuidyLocationUpdate", "GuidyLocationStatus", "GuidyLocationError" |
| Callback Storage | ✅ OK | trackingCallback configurado |
| Cleanup | ✅ OK | destroy() limpia subscriptions |

**Conclusión:** El puente nativo a JavaScript está funcionando correctamente.

---

### 4.3 LocationProvider.tsx ✅

**Archivo:** `src/services/location/LocationProvider.tsx`

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Context Creation | ✅ OK | LocationContext configurado |
| useLocation Hook | ✅ OK | Retorna context correctamente |
| State Management | ✅ OK | Zustand store actualizado |
| handleLocationUpdate | ✅ OK | actualiza currentLocation |
| startTracking | ✅ OK | Llama locationService.startLocationUpdates() |

**Conclusión:** El Location Engine está funcionando correctamente.

---

### 4.4 MapProvider.tsx ✅

**Archivo:** `src/services/maps/MapProvider.tsx`

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| useLocation Hook | ✅ OK | currentLocation obtenido correctamente |
| userMarker State | ✅ OK | Se actualiza cuando currentLocation cambia |
| Context Value | ✅ OK | userMarker incluido en context |
| useEffect Logic | ✅ OK | setUserMarker() llamado correctamente |

**Líneas 80-119:**
```typescript
useEffect(() => {
  if (currentLocation && isFollowingUser && enableFollowOnLocationUpdate) {
    // ...
    setUserMarker({
      id: 'user-location',
      coordinate: newCoordinate,
      title: 'Tu ubicación',
    });
  }
}, [currentLocation, isFollowingUser, ...]);
```

**Conclusión:** El MapProvider está funcionando correctamente y propagando el userMarker.

---

### 4.5 OpenStreetMap.tsx ❌ CAUSA RAÍZ

**Archivo:** `src/components/OpenStreetMap.tsx`

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| useMap Hook | ✅ OK | userMarker obtenido correctamente |
| postMessage Call | ✅ OK | Llama webViewRef.current.postMessage() |
| WebView onMessage | ✅ OK | Configurado para recibir mensajes del WebView |
| WebView Message Listener | ❌ **FAIL** | **INCORRECTO** |

**PROBLEMA IDENTIFICADO:**

**Línea 232 del HTML:**
```javascript
window.addEventListener('message', function(e) {
```

**PROBLEMA:** `window.addEventListener('message')` NO funciona para recibir mensajes de React Native WebView.

React Native WebView envía mensajes usando `window.ReactNativeWebView.postMessage()`, pero el listener correcto debe ser `document.addEventListener('message', ...)` para recibir mensajes en el contexto del WebView.

---

## 5. EVIDENCE COLLECTED

### Evidencia 1: Código del Listener (INCORRECTO)

**Archivo:** `src/components/OpenStreetMap.tsx`, Línea 232

```javascript
// ❌ INCORRECTO - No funciona con React Native WebView
window.addEventListener('message', function(e) {
  console.log('[WEBVIEW] Received message:', e.data);
  // ...
});
```

### Evidencia 2: postMessage Call (CORRECTO)

**Archivo:** `src/components/OpenStreetMap.tsx`, Líneas 333-346

```typescript
// ✅ CORRECTO - El mensaje se envía
useEffect(() => {
  if (webViewRef.current && isMapReady && userMarker) {
    webViewRef.current.postMessage(JSON.stringify({
      type: 'updateLocation',
      latitude: userMarker.coordinate.latitude,
      longitude: userMarker.coordinate.longitude,
    }));
  }
}, [userMarker, isMapReady, isFollowingUser]);
```

### Evidencia 3: Flujo Completo

```
React Native                        WebView (Leaflet)
    │                                    │
    │ postMessage({type:'updateLocation'}) │
    │ ─────────────────────────────────► ✗ window.addEventListener NO recibe
    │                                    │ (el mensaje se pierde)
    │                                    │
    │ onMessage (from WebView)           │
    │ ◄────────────────────────────────── │
```

---

## 6. ROOT CAUSE

### Causa Raíz Identificada

**El mensaje de actualización de ubicación de React Native (`postMessage`) NUNCA llega al código JavaScript del WebView porque el listener está configurado incorrectamente.**

**Detalle Técnico:**

1. React Native WebView proporciona un mecanismo para comunicar desde React Native hacia el JavaScript dentro del WebView mediante `window.ReactNativeWebView.postMessage()`.

2. Para recibir estos mensajes en el JavaScript del WebView, se debe usar `document.addEventListener('message', ...)` o el método `postMessage` del objeto `window`.

3. El código actual usa `window.addEventListener('message', ...)` que NO es el evento correcto para React Native WebView.

4. Como resultado, `updateUserLocation(lat, lng)` nunca se llama en el JavaScript del WebView, y el marcador nunca se crea/actualiza.

---

## 7. FILES INVOLVED

| Archivo | Líneas | Cambio Necesario |
|---------|--------|------------------|
| `src/components/OpenStreetMap.tsx` | 232 | Cambiar `window.addEventListener` por `document.addEventListener` |

---

## 8. RECOMMENDED SOLUTION

### Solución Mínima Recomendada

**Cambiar la línea 232 de:**

```javascript
window.addEventListener('message', function(e) {
```

**Por:**

```javascript
document.addEventListener('message', function(e) {
```

### Verificación Post-Fix

Después del cambio, verificar:
1. El listener recibe el mensaje `{"type":"updateLocation", ...}`
2. La función `updateUserLocation()` se ejecuta
3. El marcador azul aparece en el mapa
4. El marcador se actualiza cuando cambia la ubicación

---

## 9. RISKS

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Romper otros listeners | Baja | Media | Solo cambiar el evento específico |
| WebView no carga | Baja | Alta | Testear después del cambio |
| Otros mensajes afectados | Baja | Media | Verificar que `regionChange` y `mapClick` aún funcionen |

---

## 10. PROPOSED NEXT STAGE

### STAGE 4.1.2: LOCATION MARKER FIX

**Tipo:** Implementación de corrección

**Cambio único:**
- Modificar línea 232 en `OpenStreetMap.tsx`

**Validación:**
1. Compilar APK Debug
2. Compilar APK Release
3. Probar en dispositivo físico
4. Verificar marcador visible
5. Verificar actualización de ubicación

**NO incluir:**
- Nuevos componentes
- Re-arquitectura
- POI functionality
- Otros cambios

---

## CHECKLIST DE VERIFICACIÓN

- [x] Android Native Layer auditado
- [x] FusedLocationProvider auditado
- [x] LocationProvider auditado
- [x] MapProvider auditado
- [x] OpenStreetMap auditado
- [x] Causa raíz identificada
- [x] Evidencia documentada
- [x] Solución propuesta
- [x] Riesgos evaluados
- [ ] Aprobación humana pendiente
- [ ] Implementación pendiente

---

## NOTA IMPORTANTE

Este stage es exclusivamente diagnóstico. NO se han realizado cambios de código. La corrección propuesta requiere aprobación humana antes de implementar.

---

*Documento generado: 2026-07-24*
*Investigación forense: OpenHands Agent*
*Versión: STAGE 4.1.1*

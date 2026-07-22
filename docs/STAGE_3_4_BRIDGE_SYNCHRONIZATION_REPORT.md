# STAGE 3.4 - BRIDGE CONTRACT SYNCHRONIZATION & PERMISSION FLOW RECOVERY

**Fecha:** 2026-07-22  
**Versión:** v0.0.11-STAGE3.4  
**Estado:** ✅ IMPLEMENTATION COMPLETED - PHYSICAL VALIDATION PENDING

---

## RESUMEN EJECUTIVO

STAGE 3.4 sincroniza el contrato del puente JS↔Native entre TypeScript y Kotlin. Se detectó y corrigió una discrepancia donde el módulo nativo esperaba 3 parámetros pero TypeScript solo pasaba 1.

---

## CAUSA RAÍZ IDENTIFICADA

### Problema: Contrato de startLocationUpdates Desincronizado

| Capa | Método | Parámetros | Estado |
|------|--------|------------|--------|
| TypeScript Interface | `startLocationUpdates(options)` | 1 | ❌ Desincronizado |
| TypeScript Call | `GuidyLocation.startLocationUpdates(mergedOptions)` | 1 | ❌ Desincronizado |
| Kotlin Module | `startLocationUpdates(options, watchCallback, errorCallback)` | 3 | ❌ Espera 3 |

**Evidencia:**
```
TurboModule method: startLocationUpdates called with 1 arguments expected 3 arguments
```

### Solución Aplicada

Se actualizó `GuidyLocationModule.kt` para que acepte solo 1 parámetro (options) y use eventos para todas las actualizaciones, eliminando los callbacks.

---

## CONTRATO FINAL

### TypeScript (FusedLocationProvider.ts)

```typescript
interface GuidyLocationNativeModule {
  hasPermission(): Promise<boolean>;
  requestPermission(): Promise<PermissionResult>;
  getCurrentLocation(options: LocationOptions): Promise<LocationData>;
  startLocationUpdates(options: LocationOptions): void;  // 1 parámetro
  stopLocationUpdates(): void;
  isTracking(): Promise<boolean>;
}
```

### Kotlin (GuidyLocationModule.kt)

```kotlin
@ReactMethod
fun startLocationUpdates(options: ReadableMap) {  // 1 parámetro
    // Usa sendEvent() para GuidyLocationUpdate
    // Usa sendEvent() para GuidyLocationError
    // Usa sendEvent() para GuidyLocationStatus
}
```

### Arquitectura del Bridge (Post-Fix)

```
JS Layer                          Native Layer
┌──────────────────────┐          ┌──────────────────────────┐
│ FusedLocationProvider│          │ GuidyLocationModule.kt   │
│                      │          │                          │
│ startLocationUpdates │ ───────► │ startLocationUpdates()   │
│   (1 param)        │          │   (1 param: options)     │
│                      │          │                          │
│ Event Listeners:     │          │ onLocationResult():      │
│ - GuidyLocationUpdate│ ◄─────── │   sendEvent()            │
│ - GuidyLocationError │          │   (EVENTS ONLY)         │
│ - GuidyLocationStatus│          │                          │
└──────────────────────┘          └──────────────────────────┘
```

---

## CAMBIOS IMPLEMENTADOS

### Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `android/app/src/main/java/com/guidy/location/GuidyLocationModule.kt` | Sincronizado contrato, removidos callbacks |

### Métodos Modificados

1. **startLocationUpdates()**
   - Antes: `fun startLocationUpdates(options: ReadableMap, watchCallback: Callback, errorCallback: Callback)`
   - Después: `fun startLocationUpdates(options: ReadableMap)`
   - Usa SOLO eventos para entregar actualizaciones

2. **safeInvokeWatchCallback()** - ELIMINADO
3. **safeInvokeErrorCallback()** - ELIMINADO

### Variables Eliminadas

- `pendingWatchCallbacks: Callback?`
- `pendingErrorCallback: Callback?`

### Eventos Utilizados

| Evento | Uso |
|--------|-----|
| `GuidyLocationUpdate` | Ubicación continua |
| `GuidyLocationError` | Errores |
| `GuidyLocationStatus` | Estado de tracking |

---

## AUDITORÍA DEL FLUJO DE PERMISOS

### Flujo Actual

```
1. Home → "Iniciar recorrido" → navigation.navigate('Recorrido')
2. RecorridoScreen se monta
3. LocationProvider verifica permissionStatus
4. Si denied → Muestra pantalla de permisos
5. Usuario concede permisos → permissionStatus = 'granted'
6. useEffect detecta cambio → startTracking()
7. RecorridoScreen muestra mapa y coordenadas
```

### Verificación

El flujo de permisos está correctamente implementado:
- RecorridoScreen usa `useLocation()` hook
- El hook proporciona `permissionStatus` actualizado
- El useEffect inicia tracking cuando permisos concedidos
- No se requiere reiniciar la aplicación

---

## VALIDACIÓN DE CALIDAD

### TypeScript Check
```
✅ 0 errors
```

### ESLint
```
✅ 0 errors
⚠️ 10 warnings (pre-existentes, no relacionados)
```

### Tests
```
Test Suites: 2 passed, 1 failed (pre-existente)
Tests: 47 passed, 1 failed (pre-existente)
```

El test fallando es pre-existente (react-native-paper mock issue).

---

## BUILD ARTIFACTS

⚠️ **NOTA:** No se pudieron generar APKs en este entorno (falta JDK/Android SDK configurado)

El usuario debe ejecutar:
```bash
cd android && ./gradlew assembleDebug assembleRelease
```

---

## RIESGOS RESIDUALES

| Riesgo | Nivel | Mitigación |
|--------|-------|------------|
| Build no verificado | Medio | Requiere validación física |
| Entorno Android no disponible | Alto | Usuario debe generar APKs |

---

## PRÓXIMOS PASOS

1. ✅ Contrato sincronizado
2. ⏳ Generar APKs Debug y Release
3. ⏳ Validación física por el usuario:
   - Instalar APK Release
   - Verificar navegación después de permisos
   - Verificar GPS obtiene ubicación
   - Verificar estabilidad 5+ minutos

---

## COMMIT

```
fix(stage-3.4): synchronize TurboModule contract - remove callbacks, use events only
```

---

*Reporte generado: 2026-07-22*

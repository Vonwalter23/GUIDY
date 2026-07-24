# STAGE RECOVERY PLAN - ROLLBACK TO STAGE 4.1 CERTIFIED BASE

**Fecha:** 2026-07-24
**Estado:** PENDING APPROVAL
**Objetivo:** Recuperar foundation Stage 4.1 certificado

---

## RESUMEN EJECUTIVO

El proyecto GUIDY ha acumulado regresiones técnicas durante las etapas 4.2-4.4. Este documento clasifica todos los archivos modificados para determinar qué debe:
- **KEEP**: Mantener sin cambios (Stage 3.5 / Stage 4.1)
- **RESTORE**: Restaurar a versión certificada
- **REMOVE**: Eliminar completamente (código Stage 4.2+)
- **REWRITE LATER**: Reescribir en etapa futura (después de aprobación humana)

---

## CLASIFICACIÓN DE ARCHIVOS

### 1. LOCATION ENGINE (STAGE 3.5 - KEEP)

El Location Engine fue certificado en Stage 3.5 y debe mantenerse intacto.

| Archivo | Clasificación | Razón |
|---------|-------------|-------|
| `src/services/location/LocationProvider.tsx` | **KEEP** | Certificado Stage 3.5, arquitectura correcta |
| `src/services/location/LocationService.ts` | **KEEP** | Certificado Stage 3.5 |
| `src/services/location/FusedLocationProvider.ts` | **KEEP** | Certificado Stage 3.5 |
| `src/services/location/LocationStateMachine.ts` | **KEEP** | Certificado Stage 3.5 |
| `src/services/location/useLocationStore.ts` | **KEEP** | Certificado Stage 3.5 |
| `src/services/location/LocationPermissions.ts` | **KEEP** | Certificado Stage 3.5 |
| `src/services/location/LocationTypes.ts` | **KEEP** | Tipos base certificados |
| `src/services/location/LocationUtils.ts` | **KEEP** | Utilidades certificadas |
| `src/services/location/DistanceCalculator.ts` | **KEEP** | Utilidades certificadas |
| `src/services/location/MovementDetector.ts` | **KEEP** | Utilidades certificadas |

### 2. MAP ENGINE (STAGE 3.5 - KEEP/MODIFY)

El Map Engine fue certificado en Stage 3.5. Requiere revisión de regresiones.

| Archivo | Clasificación | Razón |
|---------|-------------|-------|
| `src/services/maps/MapProvider.tsx` | **RESTORE** | Tiene logs de debug agregados en Stage 4.4H que deben removerse |
| `src/services/maps/MapService.ts` | **KEEP** | Servicio base certificado |
| `src/services/maps/MapTypes.ts` | **KEEP** | Tipos base |
| `src/services/maps/MapConstants.ts` | **KEEP** | Constantes base |
| `src/services/maps/MapUtils.ts` | **KEEP** | Utilidades base |
| `src/services/maps/useMapStore.ts` | **KEEP** | Store base |
| `src/components/OpenStreetMap.tsx` | **RESTORE** | Tiene logs de debug agregados en Stage 4.4H que deben removerse |

### 3. POI ENGINE (STAGE 4.0-4.1 - KEEP)

La arquitectura base del POI Engine fue certificada en Stage 4.1.

| Archivo | Clasificación | Razón |
|---------|-------------|-------|
| `src/services/poi/POITypes.ts` | **KEEP** | Tipos base certificados |
| `src/services/poi/POIConstants.ts` | **KEEP** | Constantes base |
| `src/services/poi/POIRepository.ts` | **KEEP** | Repository certificado Stage 4.1 |
| `src/services/poi/POIDatasource.ts` | **KEEP** | Interfaz base |
| `src/services/poi/POICache.ts` | **KEEP** | Cache base |
| `src/services/poi/POIFilter.ts` | **KEEP** | Filtro base |
| `src/services/poi/POIEngine.ts` | **KEEP** | Engine base |
| `src/services/poi/POIStateMachine.ts` | **KEEP** | State machine base |
| `src/services/poi/usePOIStore.ts` | **KEEP** | Store base |
| `src/services/poi/index.ts` | **KEEP** | Exports base |

### 4. POI DATASOURCES (STAGE 4.1 - KEEP)

La capa de datasource fue certificada en Stage 4.1.

| Archivo | Clasificación | Razón |
|---------|-------------|-------|
| `src/services/poi/datasources/BaseNetworkClient.ts` | **KEEP** | Certificado Stage 4.1 |
| `src/services/poi/datasources/OverpassDatasource.ts` | **KEEP** | Certificado Stage 4.1 (fix query ya aplicado) |
| `src/services/poi/datasources/DatasourceFactory.ts` | **KEEP** | Certificado Stage 4.1 |
| `src/services/poi/datasources/index.ts` | **KEEP** | Exports base |

### 5. POI DISCOVERY (STAGE 4.2+ - REMOVE/RESTORE)

Discovery fue introducido en Stage 4.2 y es causa de regresiones.

| Archivo | Clasificación | Razón |
|---------|-------------|-------|
| `src/services/poi/discovery/DiscoveryEngine.ts` | **REMOVE** | Introducido en Stage 4.2, causa regresiones |
| `src/services/poi/discovery/DiscoveryScheduler.ts` | **REMOVE** | Introducido en Stage 4.2, causa regresiones |
| `src/services/poi/discovery/DiscoveryStateMachine.ts` | **REMOVE** | Introducido en Stage 4.2, causa regresiones |
| `src/services/poi/discovery/DiscoveryTypes.ts` | **REMOVE** | Introducido en Stage 4.2 |
| `src/services/poi/discovery/DiscoveryCache.ts` | **REMOVE** | Introducido en Stage 4.2 |
| `src/services/poi/discovery/MovementThreshold.ts` | **REMOVE** | Introducido en Stage 4.2 |
| `src/services/poi/discovery/POIRanking.ts` | **REMOVE** | Introducido en Stage 4.2, causa regresiones |
| `src/services/poi/discovery/POIDeduplicator.ts` | **REMOVE** | Introducido en Stage 4.2 |
| `src/services/poi/discovery/index.ts` | **REMOVE** | Introducido en Stage 4.2 |

### 6. POI SESSION (STAGE 4.3+ - REMOVE)

Session fue introducido en Stage 4.3.

| Archivo | Clasificación | Razón |
|---------|-------------|-------|
| `src/services/poi/session/POISessionManager.ts` | **REMOVE** | Introducido en Stage 4.3 |
| `src/services/poi/session/POISessionStateMachine.ts` | **REMOVE** | Introducido en Stage 4.3 |
| `src/services/poi/session/POISessionTypes.ts` | **REMOVE** | Introducido en Stage 4.3 |
| `src/services/poi/session/POISessionStore.ts` | **REMOVE** | Introducido en Stage 4.3 |
| `src/services/poi/session/POISelection.ts` | **REMOVE** | Introducido en Stage 4.3 |
| `src/services/poi/session/POISessionEvents.ts` | **REMOVE** | Introducido en Stage 4.3 |
| `src/services/poi/session/POIObservers.ts` | **REMOVE** | Introducido en Stage 4.3 |
| `src/services/poi/session/index.ts` | **REMOVE** | Introducido en Stage 4.3 |

### 7. POI ORCHESTRATOR (STAGE 4.4 - REMOVE)

Orchestrator fue introducido en Stage 4.4 y es causa principal de regresiones.

| Archivo | Clasificación | Razón |
|---------|-------------|-------|
| `src/services/poi/POIOrchestrator.ts` | **REMOVE** | Introducido en Stage 4.4, causa regresiones críticas |
| `src/services/poi/POIOrchestratorProvider.tsx` | **REMOVE** | Introducido en Stage 4.4, causa regresiones críticas |
| `src/services/poi/POIProvider.tsx` | **REMOVE** | Proveedor alternativo introducido en Stage 4.4 |

### 8. UI SCREENS (STAGE 3.5 - KEEP)

Las pantallas fueron certificadas en Stage 3.5.

| Archivo | Clasificación | Razón |
|---------|-------------|-------|
| `src/screens/RecorridoScreen.tsx` | **KEEP** | Certificado Stage 3.5 (verificar uso de POIs) |
| `src/screens/HomeScreen.tsx` | **KEEP** | Certificado Stage 3.5 |
| `src/screens/SplashScreen.tsx` | **KEEP** | Certificado Stage 3.5 |
| `src/screens/ConfiguracionScreen.tsx` | **KEEP** | Certificado Stage 3.5 |
| `src/screens/index.ts` | **KEEP** | Exports base |

### 9. APP ENTRY POINT

| Archivo | Clasificación | Razón |
|---------|-------------|-------|
| `App.tsx` | **RESTORE** | Contiene POIOrchestratorProvider que debe removerse - restaurar a Stage 4.1 |
| `index.js` | **KEEP** | Entry point base |

### 10. CONFIGURATION FILES

| Archivo | Clasificación | Razón |
|---------|-------------|-------|
| `package.json` | **KEEP** | Dependencias base |
| `tsconfig.json` | **KEEP** | Configuración TypeScript base |
| `babel.config.js` | **KEEP** | Configuración Babel base |
| `metro.config.js` | **KEEP** | Configuración Metro base |
| `jest.config.js` | **KEEP** | Configuración Jest base |
| `jest.setup.js` | **KEEP** | Setup Jest base |

### 11. ANDROID CONFIGURATION

| Archivo | Clasificación | Razón |
|---------|-------------|-------|
| `android/app/build.gradle` | **KEEP** | Configuración Gradle base |
| `android/build.gradle` | **KEEP** | Configuración Gradle base |
| `android/gradle.properties` | **KEEP** | Propiedades Gradle base |

### 12. TESTS

| Archivo | Clasificación | Razón |
|---------|-------------|-------|
| `__tests__/App.test.tsx` | **KEEP** | Tests base |
| `__tests__/LocationPermissions.test.ts` | **KEEP** | Tests certificados |
| `__tests__/MapService.test.ts` | **KEEP** | Tests base |
| `__tests__/orchestration/POIOrchestrator.test.ts` | **REMOVE** | Tests para código Stage 4.4 a eliminar |
| `__tests__/discovery/*.ts` | **REMOVE** | Tests para código Stage 4.2 a eliminar |
| `__tests__/session/*.ts` | **REMOVE** | Tests para código Stage 4.3 a eliminar |

---

## ACCIONES DE RECUPERACIÓN

### PASO 1: Restaurar App.tsx (Stage 4.1)

**Estado Actual (Stage 4.4H):**
```tsx
<LocationProvider>
  <MapProvider>
    <POIOrchestratorProvider autoStart={true} autoDiscovery={true}>
      <AppNavigator />
    </POIOrchestratorProvider>
  </MapProvider>
</LocationProvider>
```

**Estado Stage 4.1:**
```tsx
<LocationProvider>
  <MapProvider>
    <AppNavigator />
  </MapProvider>
</LocationProvider>
```

### PASO 2: Remover código Stage 4.2-4.4

Eliminar completamente:
- `src/services/poi/POIOrchestrator.ts`
- `src/services/poi/POIOrchestratorProvider.tsx`
- `src/services/poi/POIProvider.tsx`
- `src/services/poi/discovery/` (todo el directorio)
- `src/services/poi/session/` (todo el directorio)

### PASO 3: Restaurar MapProvider y OpenStreetMap

Remover logs de debug agregados en Stage 4.4H.

### PASO 4: Actualizar exports en POI index.ts

Remover exports de componentes eliminados.

### PASO 5: Eliminar tests obsoletos

Eliminar tests para código removido.

---

## VALIDACIONES REQUERIDAS

Después de la recuperación, verificar:

- [ ] GPS inicializa correctamente
- [ ] Permisos funcionan
- [ ] Ubicación del usuario se actualiza
- [ ] Marcador azul visible en el mapa
- [ ] Mapa centra correctamente
- [ ] Sin crashes
- [ ] Sin listeners duplicados
- [ ] Sin memory leaks

---

## DEFINICIÓN DE ÉXITO

La recuperación es exitosa cuando:

1. ✅ App se comporta como Stage 4.1
2. ✅ GPS funciona
3. ✅ Marcador de ubicación visible
4. ✅ Mapa estable
5. ✅ Arquitectura limpia
6. ✅ Sin código de fix temporales
7. ✅ Documentación actualizada
8. ✅ Aprobación humana obtenida

---

## PRÓXIMO PASO

**ESPERAR APROBACIÓN HUMANA** antes de ejecutar la recuperación.

Una vez aprobada, ejecutar los pasos en orden y generar:
- `STAGE_RECOVERY_AUDIT.md`
- `STAGE_RECOVERY_REPORT.md`
- `STAGE_RECOVERY_REGRESSION.md`
- Commit con tag `v0.0.23-RECOVERY-STAGE4.1`
- Debug APK y Release APK
- SHA256 para ambos APKs

---

*Documento generado: 2026-07-24*
*Auditoría: OpenHands Agent*

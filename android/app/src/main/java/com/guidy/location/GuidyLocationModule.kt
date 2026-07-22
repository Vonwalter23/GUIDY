package com.guidy.location

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.os.Looper
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.location.*
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * GUIDY Location Module - FusedLocationProviderClient Implementation
 * 
 * Uses Android's FusedLocationProviderClient for optimal GPS performance.
 * STAGE 3.3C: Added crash protection for Google Play Services issues.
 */

class GuidyLocationModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

    companion object {
        private const val TAG = "[GUIDY GPS]"
        private const val PERMISSION_REQUEST_CODE = 1001
        private const val DEFAULT_TIMEOUT_MS = 15000L
        private const val DEFAULT_INTERVAL_MS = 5000L
        private const val DEFAULT_FASTEST_INTERVAL_MS = 2000L
    }

    private var fusedLocationClient: FusedLocationProviderClient? = null
    private var locationCallback: LocationCallback? = null
    private var isTracking = false
    private var isModuleReady = false
    private var pendingWatchCallbacks: Callback? = null
    private var pendingErrorCallback: Callback? = null
    private var permissionPromise: Promise? = null
    private val dateFormat = SimpleDateFormat("HH:mm:ss.SSS", Locale.getDefault())

    // STAGE 3.3C: Check if Google Play Services is available
    private fun isGooglePlayServicesAvailable(): Boolean {
        val googleApiAvailability = GoogleApiAvailability.getInstance()
        val status = googleApiAvailability.isGooglePlayServicesAvailable(reactContext)
        
        when (status) {
            ConnectionResult.SUCCESS -> {
                log("Google Play Services is available")
                return true
            }
            ConnectionResult.SERVICE_MISSING -> {
                log("ERROR: Google Play Services - SERVICE_MISSING")
                return false
            }
            ConnectionResult.SERVICE_UPDATING -> {
                log("WARNING: Google Play Services is updating")
                return true // May still work
            }
            ConnectionResult.SERVICE_VERSION_UPDATE_REQUIRED -> {
                log("WARNING: Google Play Services update required")
                return true // May still work
            }
            ConnectionResult.SERVICE_DISABLED -> {
                log("ERROR: Google Play Services is DISABLED")
                return false
            }
            ConnectionResult.SERVICE_INVALID -> {
                log("ERROR: Google Play Services is INVALID")
                return false
            }
            else -> {
                log("ERROR: Google Play Services status: $status")
                return false
            }
        }
    }

    init {
        reactContext.addLifecycleEventListener(this)
        
        // STAGE 3.3C: Check Google Play Services availability and initialize
        initializeModule()
    }
    
    // STAGE 3.3C: Separate initialization function
    private fun initializeModule() {
        if (!isGooglePlayServicesAvailable()) {
            log("ERROR: Google Play Services not available!")
            isModuleReady = false
            return
        }
        
        // STAGE 3.3C: Safe initialization with try-catch
        try {
            fusedLocationClient = LocationServices.getFusedLocationProviderClient(reactContext)
            isModuleReady = true
            log("Module initialized - FusedLocationProviderClient ready")
        } catch (e: Exception) {
            log("ERROR during initialization: ${e.message}")
            e.printStackTrace()
            isModuleReady = false
        }
    }

    override fun getName(): String = "GuidyLocation"

    private fun log(message: String) {
        Log.d(TAG, "[${dateFormat.format(Date())}] $message")
    }

    // STAGE 3.3C: Safe event sending with null checks
    private fun sendEvent(eventName: String, params: WritableMap) {
        // STAGE 3.3C: Check if module is ready and not destroyed
        if (!isModuleReady) {
            log("Cannot send event - module not ready")
            return
        }
        
        // STAGE 3.3C: Check if ReactContext is still valid
        if (reactContext.isBridgeless || reactContext.hasActiveCatalystInstance()) {
            try {
                reactContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(eventName, params)
            } catch (e: Exception) {
                log("Error sending event $eventName: ${e.message}")
            }
        } else {
            log("Cannot send event - React context not valid")
        }
    }
    
    // STAGE 3.3C: Safe callback invocation
    private fun safeInvokeWatchCallback(locationMap: WritableMap) {
        if (!isModuleReady || !isTracking) {
            log("Cannot invoke callback - module not tracking")
            return
        }
        try {
            pendingWatchCallbacks?.invoke(null, locationMap)
        } catch (e: Exception) {
            log("Error invoking watch callback: ${e.message}")
        }
    }
    
    // STAGE 3.3C: Safe error callback invocation
    private fun safeInvokeErrorCallback(code: String, message: String) {
        if (!isModuleReady) {
            log("Cannot invoke error callback - module not ready")
            return
        }
        try {
            pendingErrorCallback?.invoke(code, message)
            pendingErrorCallback = null
            pendingWatchCallbacks = null
        } catch (e: Exception) {
            log("Error invoking error callback: ${e.message}")
        }
    }

    // Permission checking
    @ReactMethod
    fun hasPermission(promise: Promise) {
        // STAGE 3.3C: Check if module is ready first
        if (!isModuleReady) {
            log("hasPermission: Module not ready, rejecting")
            promise.reject("E_MODULE_NOT_READY", "Location module not ready - Google Play Services issue")
            return
        }
        
        log("Checking location permission...")
        val hasFine = ContextCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        
        val hasCoarse = ContextCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        log("Permission check - Fine: $hasFine, Coarse: $hasCoarse")
        promise.resolve(hasFine || hasCoarse)
    }

    @ReactMethod
    fun requestPermission(promise: Promise) {
        // STAGE 3.3C: Check if module is ready first
        if (!isModuleReady) {
            log("requestPermission: Module not ready, rejecting")
            promise.reject("E_MODULE_NOT_READY", "Location module not ready - Google Play Services issue")
            return
        }
        
        log("Requesting location permission...")
        
        // STAGE 3.3C: Safe activity access with null check
        val activity = reactContext.currentActivity
        if (activity == null) {
            log("No activity available")
            promise.reject("E_NO_ACTIVITY", "No activity available")
            return
        }
        
        // STAGE 3.3C: Check if activity is finishing
        if (activity.isFinishing) {
            log("Activity is finishing, cannot request permission")
            promise.reject("E_ACTIVITY_FINISHING", "Activity is finishing")
            return
        }

        val hasFine = ContextCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        
        val hasCoarse = ContextCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED

        if (hasFine || hasCoarse) {
            log("Permission already granted")
            val result = Arguments.createMap().apply {
                putString("status", "granted")
                putBoolean("canAskAgain", true)
            }
            promise.resolve(result)
            return
        }

        permissionPromise = promise
        
        val permissions = arrayOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )

        // STAGE 3.3C: Check permission before requesting
        if (ActivityCompat.shouldShowRequestPermissionRationale(activity, Manifest.permission.ACCESS_FINE_LOCATION)) {
            log("Should show permission rationale")
        }
        
        try {
            ActivityCompat.requestPermissions(activity, permissions, PERMISSION_REQUEST_CODE)
            log("Permission request sent to system")
        } catch (e: Exception) {
            log("Exception requesting permissions: ${e.message}")
            promise.reject("E_PERMISSION_ERROR", e.message ?: "Permission request failed")
        }
    }

    // Get current location once
    @ReactMethod
    fun getCurrentLocation(options: ReadableMap, promise: Promise) {
        // STAGE 3.3C: Check if module is ready first
        if (!isModuleReady) {
            log("getCurrentLocation: Module not ready, rejecting")
            promise.reject("E_MODULE_NOT_READY", "Location module not ready - Google Play Services issue")
            return
        }
        
        // STAGE 3.3C: Check if fusedLocationClient is available
        if (fusedLocationClient == null) {
            log("getCurrentLocation: FusedLocationProviderClient is null")
            promise.reject("E_CLIENT_NULL", "Location client not available")
            return
        }
        
        log("=== GET CURRENT LOCATION ===")
        log("Options: $options")

        if (!hasLocationPermissionSync()) {
            log("No permission - rejecting")
            promise.reject("PERMISSION_DENIED", "Location permission not granted")
            return
        }

        val enableHighAccuracy = options.hasKey("enableHighAccuracy") && options.getBoolean("enableHighAccuracy")
        val timeout = if (options.hasKey("timeout")) options.getDouble("timeout").toLong() else DEFAULT_TIMEOUT_MS

        log("High accuracy: $enableHighAccuracy, Timeout: ${timeout}ms")

        val priority = if (enableHighAccuracy) {
            Priority.PRIORITY_HIGH_ACCURACY
        } else {
            Priority.PRIORITY_BALANCED_POWER_ACCURACY
        }

        // STAGE 3.3C: Store promise reference for async callbacks
        val currentPromise = promise
        
        try {
            log("Requesting location with priority: $priority")

            fusedLocationClient?.getCurrentLocation(priority, null)?.addOnSuccessListener { location ->
                // STAGE 3.3C: Check if still tracking and module ready
                if (!isModuleReady) {
                    log("getCurrentLocation: Module destroyed, ignoring callback")
                    return@addOnSuccessListener
                }
                
                if (location != null) {
                    log("Got location from getCurrentLocation: ${location.latitude}, ${location.longitude}")
                    try {
                        currentPromise.resolve(locationToMap(location))
                    } catch (e: Exception) {
                        log("Error resolving promise: ${e.message}")
                    }
                } else {
                    log("getCurrentLocation returned null, trying last location...")
                    fusedLocationClient?.lastLocation?.addOnSuccessListener { lastLocation ->
                        if (!isModuleReady) {
                            log("Module destroyed during lastLocation callback")
                            return@addOnSuccessListener
                        }
                        
                        if (lastLocation != null) {
                            log("Got location from lastLocation: ${lastLocation.latitude}, ${lastLocation.longitude}")
                            try {
                                currentPromise.resolve(locationToMap(lastLocation))
                            } catch (e: Exception) {
                                log("Error resolving promise: ${e.message}")
                            }
                        } else {
                            log("No cached location available")
                            try {
                                currentPromise.reject("LOCATION_UNAVAILABLE", "Unable to get current location")
                            } catch (e: Exception) {
                                log("Error rejecting promise: ${e.message}")
                            }
                        }
                    }?.addOnFailureListener { e ->
                        log("lastLocation failed: ${e.message}")
                        try {
                            currentPromise.reject("LOCATION_ERROR", e.message ?: "Unknown error")
                        } catch (ex: Exception) {
                            log("Error rejecting promise: ${ex.message}")
                        }
                    }
                }
            }?.addOnFailureListener { e ->
                log("getCurrentLocation failed: ${e.message}")
                try {
                    currentPromise.reject("LOCATION_ERROR", e.message ?: "Unknown error")
                } catch (ex: Exception) {
                    log("Error rejecting promise: ${ex.message}")
                }
            }
        } catch (e: SecurityException) {
            log("SecurityException: ${e.message}")
            promise.reject("PERMISSION_DENIED", "Location permission denied")
        } catch (e: Exception) {
            log("Exception: ${e.message}")
            promise.reject("LOCATION_ERROR", e.message ?: "Unknown error")
        }
    }

    // Start continuous location updates
    @ReactMethod
    fun startLocationUpdates(options: ReadableMap, watchCallback: Callback, errorCallback: Callback) {
        // STAGE 3.3C: Check if module is ready first
        if (!isModuleReady) {
            log("startLocationUpdates: Module not ready, calling error callback")
            try {
                errorCallback.invoke("E_MODULE_NOT_READY", "Location module not ready - Google Play Services issue")
            } catch (e: Exception) {
                log("Error invoking errorCallback: ${e.message}")
            }
            return
        }
        
        // STAGE 3.3C: Check if fusedLocationClient is available
        if (fusedLocationClient == null) {
            log("startLocationUpdates: FusedLocationProviderClient is null")
            try {
                errorCallback.invoke("E_CLIENT_NULL", "Location client not available")
            } catch (e: Exception) {
                log("Error invoking errorCallback: ${e.message}")
            }
            return
        }
        
        log("=== START LOCATION UPDATES ===")
        log("Options: $options")

        if (!hasLocationPermissionSync()) {
            log("No permission - calling error")
            try {
                errorCallback.invoke("PERMISSION_DENIED", "Location permission not granted")
            } catch (e: Exception) {
                log("Error invoking errorCallback: ${e.message}")
            }
            return
        }

        if (isTracking) {
            log("Already tracking - stopping first")
            stopLocationUpdates()
        }

        val enableHighAccuracy = options.hasKey("enableHighAccuracy") && options.getBoolean("enableHighAccuracy")
        val interval = if (options.hasKey("interval")) options.getDouble("interval").toLong() else DEFAULT_INTERVAL_MS
        val fastestInterval = if (options.hasKey("fastestInterval")) 
            options.getDouble("fastestInterval").toLong() else DEFAULT_FASTEST_INTERVAL_MS
        val distanceFilter = if (options.hasKey("distanceFilter")) 
            options.getDouble("distanceFilter").toInt() else 0

        log("Config - High accuracy: $enableHighAccuracy, Interval: ${interval}ms, Fastest: ${fastestInterval}ms, Distance: ${distanceFilter}m")

        pendingWatchCallbacks = watchCallback
        pendingErrorCallback = errorCallback

        val priority = if (enableHighAccuracy) {
            Priority.PRIORITY_HIGH_ACCURACY
        } else {
            Priority.PRIORITY_BALANCED_POWER_ACCURACY
        }

        // Create LocationRequest using default constructor
        val locationRequest = LocationRequest()
        locationRequest.interval = interval
        locationRequest.fastestInterval = fastestInterval
        locationRequest.smallestDisplacement = distanceFilter.toFloat()
        locationRequest.priority = priority

        // STAGE 3.3C: Use local reference for callbacks to prevent stale closures
        val currentWatchCallback = watchCallback
        val currentErrorCallback = errorCallback
        
        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                // STAGE 3.3G: Check if module is still valid
                if (!isModuleReady || !isTracking) {
                    log("onLocationResult: Module not tracking, ignoring callback")
                    return
                }
                
                result.lastLocation?.let { location ->
                    log("Location update: ${location.latitude}, ${location.longitude}, acc: ${location.accuracy}m, provider: ${location.provider}")
                    
                    // STAGE 3.3H: Only use callback OR event, not both
                    // Using only callback to avoid double invocation
                    try {
                        currentWatchCallback?.invoke(null, locationToMap(location))
                    } catch (e: Exception) {
                        log("Error invoking watchCallback: ${e.message}")
                    }
                    
                    // STAGE 3.3H: Removed duplicate event emission to prevent double callback
                }
            }

            override fun onLocationAvailability(availability: LocationAvailability) {
                log("Location availability: ${availability.isLocationAvailable}")
                // STAGE 3.3C: Check if still tracking
                if (!isTracking || !isModuleReady) {
                    return
                }
                
                if (!availability.isLocationAvailable) {
                    val errorEvent = Arguments.createMap().apply {
                        putString("type", "error")
                        putString("code", "LOCATION_UNAVAILABLE")
                        putString("message", "Location is not available")
                    }
                    sendEvent("GuidyLocationError", errorEvent)
                }
            }
        }

        try {
            fusedLocationClient?.requestLocationUpdates(
                locationRequest,
                locationCallback!!,
                Looper.getMainLooper()
            )
            isTracking = true
            log("Location updates started successfully")
            
            val event = Arguments.createMap().apply {
                putString("type", "trackingStarted")
                putBoolean("isTracking", true)
            }
            sendEvent("GuidyLocationStatus", event)
            
        } catch (e: SecurityException) {
            log("SecurityException starting updates: ${e.message}")
            try {
                currentErrorCallback?.invoke("PERMISSION_DENIED", "Location permission denied")
            } catch (ex: Exception) {
                log("Error invoking errorCallback: ${ex.message}")
            }
            pendingErrorCallback = null
            pendingWatchCallbacks = null
        } catch (e: Exception) {
            log("Exception starting updates: ${e.message}")
            try {
                currentErrorCallback?.invoke("LOCATION_ERROR", e.message ?: "Unknown error")
            } catch (ex: Exception) {
                log("Error invoking errorCallback: ${ex.message}")
            }
            pendingErrorCallback = null
            pendingWatchCallbacks = null
        }
    }

    @ReactMethod
    fun stopLocationUpdates() {
        // STAGE 3.3C: Check if module is ready
        if (!isModuleReady) {
            log("stopLocationUpdates: Module not ready")
            return
        }
        
        log("=== STOP LOCATION UPDATES ===")
        
        // STAGE 3.3C: Safe cleanup of location callback
        try {
            locationCallback?.let {
                fusedLocationClient?.removeLocationUpdates(it)
                log("Location updates removed")
            }
        } catch (e: Exception) {
            log("Error removing location updates: ${e.message}")
        }
        
        locationCallback = null
        isTracking = false
        pendingWatchCallbacks = null
        pendingErrorCallback = null
        
        val event = Arguments.createMap().apply {
            putString("type", "trackingStopped")
            putBoolean("isTracking", false)
        }
        sendEvent("GuidyLocationStatus", event)
        
        log("Tracking stopped")
    }

    @ReactMethod
    fun isTracking(promise: Promise) {
        promise.resolve(isTracking)
    }

    @ReactMethod
    fun addListener(eventName: String) {
        log("Added listener for: $eventName")
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        log("Removed $count listeners")
    }

    private fun hasLocationPermissionSync(): Boolean {
        val hasFine = ContextCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        
        val hasCoarse = ContextCompat.checkSelfPermission(
            reactContext,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        
        return hasFine || hasCoarse
    }

    private fun locationToMap(location: Location): WritableMap {
        return Arguments.createMap().apply {
            putDouble("latitude", location.latitude)
            putDouble("longitude", location.longitude)
            putDouble("altitude", location.altitude)
            putDouble("accuracy", location.accuracy.toDouble())
            putDouble("altitudeAccuracy", 0.0) // Not available in standard Location API
            putDouble("speed", if (location.hasSpeed()) location.speed.toDouble() else 0.0)
            putDouble("heading", if (location.hasBearing()) location.bearing.toDouble() else 0.0)
            putDouble("timestamp", location.time.toDouble())
            putString("provider", location.provider ?: "fused")
        }
    }

    // STAGE 3.3C: Enhanced lifecycle management
    override fun onHostResume() {
        log("Activity resumed")
    }

    override fun onHostPause() {
        log("Activity paused")
        // STAGE 3.3C: Don't stop tracking on pause, but clear callbacks if needed
    }

    override fun onHostDestroy() {
        log("Activity destroyed - cleaning up")
        
        // STAGE 3.3C: Mark module as not ready FIRST to prevent callbacks
        isModuleReady = false
        
        // STAGE 3.3C: Safe cleanup - stop tracking but don't send events
        try {
            if (locationCallback != null && fusedLocationClient != null) {
                fusedLocationClient?.removeLocationUpdates(locationCallback!!)
                log("Location updates removed on destroy")
            }
        } catch (e: Exception) {
            log("Error removing location updates on destroy: ${e.message}")
        }
        
        locationCallback = null
        isTracking = false
        pendingWatchCallbacks = null
        pendingErrorCallback = null
        
        // Remove lifecycle listener to prevent further callbacks
        try {
            reactContext.removeLifecycleEventListener(this)
        } catch (e: Exception) {
            log("Error removing lifecycle listener: ${e.message}")
        }
        
        log("Module cleanup complete")
    }
}

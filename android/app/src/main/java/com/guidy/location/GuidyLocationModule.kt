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
import com.google.android.gms.location.*
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * GUIDY Location Module - FusedLocationProviderClient Implementation
 * 
 * Uses Android's FusedLocationProviderClient for optimal GPS performance.
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
    private var pendingWatchCallbacks: Callback? = null
    private var pendingErrorCallback: Callback? = null
    private var permissionPromise: Promise? = null
    private val dateFormat = SimpleDateFormat("HH:mm:ss.SSS", Locale.getDefault())

    init {
        reactContext.addLifecycleEventListener(this)
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(reactContext)
        log("Module initialized - FusedLocationProviderClient ready")
    }

    override fun getName(): String = "GuidyLocation"

    private fun log(message: String) {
        Log.d(TAG, "[${dateFormat.format(Date())}] $message")
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    // Permission checking
    @ReactMethod
    fun hasPermission(promise: Promise) {
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
        log("Requesting location permission...")
        
        val activity = reactContext.currentActivity
        if (activity == null) {
            log("No activity available")
            promise.reject("E_NO_ACTIVITY", "No activity available")
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

        ActivityCompat.requestPermissions(activity, permissions, PERMISSION_REQUEST_CODE)
        log("Permission request sent to system")
    }

    // Get current location once
    @ReactMethod
    fun getCurrentLocation(options: ReadableMap, promise: Promise) {
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

        try {
            log("Requesting location with priority: $priority")

            fusedLocationClient?.getCurrentLocation(priority, null)?.addOnSuccessListener { location ->
                if (location != null) {
                    log("Got location from getCurrentLocation: ${location.latitude}, ${location.longitude}")
                    promise.resolve(locationToMap(location))
                } else {
                    log("getCurrentLocation returned null, trying last location...")
                    fusedLocationClient?.lastLocation?.addOnSuccessListener { lastLocation ->
                        if (lastLocation != null) {
                            log("Got location from lastLocation: ${lastLocation.latitude}, ${lastLocation.longitude}")
                            promise.resolve(locationToMap(lastLocation))
                        } else {
                            log("No cached location available")
                            promise.reject("LOCATION_UNAVAILABLE", "Unable to get current location")
                        }
                    }?.addOnFailureListener { e ->
                        log("lastLocation failed: ${e.message}")
                        promise.reject("LOCATION_ERROR", e.message ?: "Unknown error")
                    }
                }
            }?.addOnFailureListener { e ->
                log("getCurrentLocation failed: ${e.message}")
                promise.reject("LOCATION_ERROR", e.message ?: "Unknown error")
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
        log("=== START LOCATION UPDATES ===")
        log("Options: $options")

        if (!hasLocationPermissionSync()) {
            log("No permission - calling error")
            errorCallback.invoke("PERMISSION_DENIED", "Location permission not granted")
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

        locationCallback = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { location ->
                    log("Location update: ${location.latitude}, ${location.longitude}, acc: ${location.accuracy}m, provider: ${location.provider}")
                    val locationMap = locationToMap(location)
                    pendingWatchCallbacks?.invoke(null, locationMap)
                    
                    val event = Arguments.createMap().apply {
                        putMap("location", locationMap)
                        putString("type", "locationUpdate")
                    }
                    sendEvent("GuidyLocationUpdate", event)
                }
            }

            override fun onLocationAvailability(availability: LocationAvailability) {
                log("Location availability: ${availability.isLocationAvailable}")
                if (!availability.isLocationAvailable && isTracking) {
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
            pendingErrorCallback?.invoke("PERMISSION_DENIED", "Location permission denied")
            pendingErrorCallback = null
            pendingWatchCallbacks = null
        } catch (e: Exception) {
            log("Exception starting updates: ${e.message}")
            pendingErrorCallback?.invoke("LOCATION_ERROR", e.message ?: "Unknown error")
            pendingErrorCallback = null
            pendingWatchCallbacks = null
        }
    }

    @ReactMethod
    fun stopLocationUpdates() {
        log("=== STOP LOCATION UPDATES ===")
        
        locationCallback?.let {
            fusedLocationClient?.removeLocationUpdates(it)
            log("Location updates removed")
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

    override fun onHostResume() {
        log("Activity resumed")
    }

    override fun onHostPause() {
        log("Activity paused")
    }

    override fun onHostDestroy() {
        log("Activity destroyed - cleaning up")
        stopLocationUpdates()
    }
}

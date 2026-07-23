/**
 * GUIDY - OpenStreetMap Component
 * Map component using react-native-webview with Leaflet.js
 * 
 * This component renders OpenStreetMap tiles in a WebView using Leaflet.js
 * No API keys required - uses free OpenStreetMap tiles.
 */

import React, {useRef, useEffect, useCallback, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {WebView} from 'react-native-webview';
import {useMap} from '../services/maps';
import {usePOIs} from '../services/poi';

interface OpenStreetMapProps {
  style?: object;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  showsCompass?: boolean;
  showsScale?: boolean;
  followsUserLocation?: boolean;
  onRegionChange?: (region: {latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number}) => void;
  onRegionChangeComplete?: (region: {latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number}) => void;
  onPress?: (event: {nativeEvent: {coordinate: {latitude: number; longitude: number}}}) => void;
  children?: React.ReactNode;
}

// HTML content for the map
const MAP_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; overflow: hidden; }
    .leaflet-control-attribution { font-size: 8px !important; }
    .poi-marker { text-align: center; line-height: 1; }
    .poi-popup { min-width: 150px; }
    .poi-popup h4 { margin: 0 0 5px 0; font-size: 14px; }
    .poi-popup p { margin: 2px 0; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    // POI marker colors
    var POI_COLORS = {
      RESTAURANT: '#FF5722',
      CAFE: '#795548',
      SHOPPING: '#9C27B0',
      ATTRACTION: '#E91E63',
      HOTEL: '#3F51B5',
      TRANSPORT: '#009688',
      ATM: '#4CAF50',
      PHARMACY: '#00BCD4',
      HOSPITAL: '#F44336',
      default: '#607D8B'
    };

    // Initialize map centered on Trelew, Argentina
    var map = L.map('map', {
      center: [-43.3001, -65.1028],
      zoom: 15,
      zoomControl: true,
      attributionControl: true
    });

    // Add OpenStreetMap tiles
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // User marker
    var userMarker = null;

    // POI markers layer
    var poiLayer = L.layerGroup().addTo(map);

    // Function to update user location
    function updateUserLocation(lat, lng) {
      var icon = L.divIcon({
        className: 'user-marker',
        html: '<div style="background-color: #2196F3; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      
      if (userMarker) {
        userMarker.setLatLng([lat, lng]);
      } else {
        userMarker = L.marker([lat, lng], {icon: icon}).addTo(map);
      }
      
      // Send location to React Native
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'locationUpdate',
        latitude: lat,
        longitude: lng
      }));
    }

    // Function to get color for POI category
    function getPOIColor(category) {
      if (!category) return POI_COLORS.default;
      var cat = category.toUpperCase();
      return POI_COLORS[cat] || POI_COLORS.default;
    }

    // Function to create POI marker icon
    function createPOIIcon(category) {
      var color = getPOIColor(category);
      return L.divIcon({
        className: 'poi-marker',
        html: '<div style="background-color: ' + color + '; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;"><span style="color: white; font-size: 12px; font-weight: bold;">P</span></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
        popupAnchor: [0, -12]
      });
    }

    // Function to update POI markers
    function updatePOIMarkers(pois) {
      // Clear existing markers
      poiLayer.clearLayers();
      
      if (!pois || pois.length === 0) {
        console.log('[MAP] No POIs to display');
        return;
      }
      
      console.log('[MAP] Adding ' + pois.length + ' POI markers');
      
      pois.forEach(function(poi) {
        if (poi.latitude && poi.longitude) {
          var marker = L.marker([poi.latitude, poi.longitude], {
            icon: createPOIIcon(poi.category)
          });
          
          // Create popup content
          var popupContent = '<div class="poi-popup">';
          popupContent += '<h4>' + (poi.name || 'Unknown POI') + '</h4>';
          if (poi.category) {
            popupContent += '<p>Category: ' + poi.category + '</p>';
          }
          if (poi.subcategory) {
            popupContent += '<p>Type: ' + poi.subcategory + '</p>';
          }
          if (poi.distance !== undefined) {
            popupContent += '<p>Distance: ' + Math.round(poi.distance) + 'm</p>';
          }
          popupContent += '</div>';
          
          marker.bindPopup(popupContent);
          poiLayer.addLayer(marker);
        }
      });
      
      // Send update to React Native
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'poiMarkersUpdated',
        count: pois.length
      }));
    }

    // Function to center on user
    function centerOnUser(lat, lng, animate) {
      if (animate) {
        map.setView([lat, lng], map.getZoom(), {animate: true});
      } else {
        map.setView([lat, lng], map.getZoom());
      }
    }

    // Listen for map move
    map.on('moveend', function() {
      var center = map.getCenter();
      var bounds = map.getBounds();
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'regionChange',
        latitude: center.lat,
        longitude: center.lng,
        latitudeDelta: bounds.getNorth() - bounds.getSouth(),
        longitudeDelta: bounds.getEast() - bounds.getWest()
      }));
    });

    // Listen for map click
    map.on('click', function(e) {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'mapClick',
        latitude: e.latlng.lat,
        longitude: e.latlng.lng
      }));
    });

    // Message handler from React Native
    document.addEventListener('message', function(e) {
      var data = JSON.parse(e.data);
      if (data.type === 'updateLocation') {
        updateUserLocation(data.latitude, data.longitude);
      } else if (data.type === 'centerOnUser') {
        centerOnUser(data.latitude, data.longitude, data.animate || false);
      } else if (data.type === 'setRegion') {
        map.setView([data.latitude, data.longitude], data.zoom || 15, {animate: data.animate || false});
      } else if (data.type === 'updatePOIs') {
        updatePOIMarkers(data.pois);
      }
    });
  </script>
</body>
</html>
`;

/**
 * OpenStreetMap component
 * Uses WebView with Leaflet.js to render OpenStreetMap tiles
 */
export function OpenStreetMap({
  style,
  followsUserLocation: _followsUserLocation = true,
  onRegionChange,
  onRegionChangeComplete,
  onPress,
}: OpenStreetMapProps) {
  const webViewRef = useRef<WebView>(null);
  const {
    region,
    userMarker,
    isFollowingUser,
    setRegion,
  } = useMap();
  
  // Get POIs from POIStore
  const pois = usePOIs();
  
  const [isMapReady, setIsMapReady] = useState(false);

  // Handle messages from WebView
  const handleMessage = useCallback((event: {nativeEvent: {data: string}}) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'regionChange') {
        const newRegion = {
          latitude: data.latitude,
          longitude: data.longitude,
          latitudeDelta: data.latitudeDelta,
          longitudeDelta: data.longitudeDelta,
        };
        setRegion(newRegion);
        onRegionChange?.(newRegion);
        onRegionChangeComplete?.(newRegion);
      } else if (data.type === 'mapClick' && onPress) {
        onPress({
          nativeEvent: {
            coordinate: {
              latitude: data.latitude,
              longitude: data.longitude,
            },
          },
        });
      }
    } catch {
      // Ignore parse errors
    }
  }, [setRegion, onRegionChange, onRegionChangeComplete, onPress]);

  // Update map when region changes
  useEffect(() => {
    if (webViewRef.current && isMapReady && !isFollowingUser) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'setRegion',
        latitude: region.latitude,
        longitude: region.longitude,
        zoom: 15,
        animate: false,
      }));
    }
  }, [region, isMapReady, isFollowingUser]);

  // Update map when user location changes
  useEffect(() => {
    if (webViewRef.current && isMapReady && userMarker) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'updateLocation',
        latitude: userMarker.coordinate.latitude,
        longitude: userMarker.coordinate.longitude,
      }));
      
      if (isFollowingUser) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'centerOnUser',
          latitude: userMarker.coordinate.latitude,
          longitude: userMarker.coordinate.longitude,
          animate: true,
        }));
      }
    }
  }, [userMarker, isMapReady, isFollowingUser]);

  // Update POI markers when pois change
  useEffect(() => {
    if (webViewRef.current && isMapReady) {
      console.log('[OPENSTREETMAP] Sending POIs to map:', pois.length, 'POIs');
      webViewRef.current.postMessage(JSON.stringify({
        type: 'updatePOIs',
        pois: pois.map(poi => ({
          id: poi.id,
          name: poi.name,
          latitude: poi.latitude,
          longitude: poi.longitude,
          category: poi.category,
          subcategory: poi.subcategory,
          distance: poi.distance,
        })),
      }));
    }
  }, [pois, isMapReady]);

  // Handle WebView load
  const handleLoadEnd = useCallback(() => {
    setIsMapReady(true);
  }, []);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef as any}
        style={styles.webview as any}
        source={{html: MAP_HTML, baseUrl: ''}}
        onMessage={handleMessage as any}
        onLoadEnd={handleLoadEnd as any}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        bounces={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scalesPageToFit={false}
        originWhitelist={['*']}
        mixedContentMode="compatibility"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0E0E0',
  },
  webview: {
    flex: 1,
    backgroundColor: '#E0E0E0',
  },
});

export default OpenStreetMap;

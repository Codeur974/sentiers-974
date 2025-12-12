import React, { useState, useEffect, useRef, useMemo } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { WebView } from "react-native-webview";

interface EnhancedMapViewProps {
  coords: {
    latitude: number;
    longitude: number;
    altitude?: number | null;
    accuracy?: number | null;
    timestamp: number;
  } | null;
  address?: string | null;
  isVisible: boolean;
  onToggle: () => void;
  trackingPath?: Array<{latitude: number; longitude: number}>;
  isTracking?: boolean;
  showControls?: boolean;
}

export default function EnhancedMapView({
  coords,
  address,
  isVisible,
  onToggle,
  trackingPath = [],
  isTracking = false,
  showControls = true,
}: EnhancedMapViewProps) {
  const [mapReady, setMapReady] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const { width, height } = Dimensions.get('window');
  const initialCoords = useRef(coords);

  // Mémoriser le HTML initial pour éviter de recréer la WebView à chaque render
  // IMPORTANT: useMemo doit être appelé AVANT les useEffect et les returns conditionnels
  const mapHTML = useMemo(() => {
    const lat = initialCoords.current?.latitude ?? -21.115141;
    const lng = initialCoords.current?.longitude ?? 55.536384;

    return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { height: 100%; font-family: -apple-system, sans-serif; }
          #map { height: 100%; width: 100%; }
          .speed-indicator {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(255,255,255,0.9);
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: bold;
            color: #333;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            z-index: 1000;
          }
          .distance-indicator {
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(255,255,255,0.9);
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: bold;
            color: #333;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            z-index: 1000;
          }
          .custom-zoom-controls {
            position: absolute;
            top: 60px;
            right: 10px;
            z-index: 1000;
          }
          .zoom-btn {
            display: block;
            width: 45px;
            height: 45px;
            background: rgba(255,255,255,0.95);
            border: 2px solid #ddd;
            border-radius: 6px;
            margin-bottom: 8px;
            text-align: center;
            line-height: 41px;
            font-size: 22px;
            font-weight: bold;
            color: #333;
            cursor: pointer;
            box-shadow: 0 3px 10px rgba(0,0,0,0.2);
            user-select: none;
            -webkit-tap-highlight-color: transparent;
            -webkit-touch-callout: none;
            -webkit-user-select: none;
            -khtml-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            touch-action: manipulation;
          }
          .zoom-btn:hover {
            background: rgba(255,255,255,1);
            border-color: #2563eb;
            color: #2563eb;
          }
          .zoom-btn:active {
            background: rgba(240,240,240,1);
            transform: scale(0.92);
          }
          
          /* Styles pour les popups Leaflet */
          .leaflet-popup-content-wrapper {
            background: rgba(255, 255, 255, 0.98) !important;
            border-radius: 8px !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
            border: 1px solid rgba(0, 0, 0, 0.1) !important;
          }
          
          .leaflet-popup-content {
            margin: 8px 12px !important;
            color: #1f2937 !important;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
          }
          
          .leaflet-popup-tip {
            background: rgba(255, 255, 255, 0.98) !important;
            border: 1px solid rgba(0, 0, 0, 0.1) !important;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
          }
          
          .custom-popup .leaflet-popup-content-wrapper {
            background: white !important;
            border-radius: 12px !important;
          }
        </style>
      </head>
      <body>
        ${showControls ? `
          <div id="distance-indicator" class="distance-indicator">0.00 km</div>
          <div id="speed-indicator" class="speed-indicator">0 km/h</div>
          <div class="custom-zoom-controls">
            <button class="zoom-btn" onclick="zoomIn()" type="button">+</button>
            <button class="zoom-btn" onclick="zoomOut()" type="button">−</button>
            <button class="zoom-btn" onclick="centerOnUser()" type="button" style="font-size: 18px;">📍</button>
          </div>
        ` : ''}
        <div id="map"></div>
        
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <script>
          // Variables globales
          let map, marker, currentPolyline;
          let lastUpdateTime = 0;
          let totalDistance = 0;
          let lastPosition = null;
          
          // Initialiser la carte avec contrôles de zoom optimisés
          map = L.map('map', {
            zoomControl: true, // Garder aussi les contrôles Leaflet comme fallback
            attributionControl: true,
            preferCanvas: true,
            maxZoom: 20,
            minZoom: 5,
            zoomSnap: 0.25, // Zoom plus fluide
            zoomDelta: 1,
            wheelDebounceTime: 40,
            wheelPxPerZoomLevel: 60,
            // Améliorer les interactions tactiles
            tap: true,
            tapTolerance: 15,
            bounceAtZoomLimits: false,
            maxBoundsViscosity: 0.3,
            // Activer le double-tap pour zoom
            doubleClickZoom: true,
            // Améliorer le pinch-zoom sur mobile
            touchZoom: true,
            scrollWheelZoom: true
          }).setView([${lat}, ${lng}], 17);
          
          // Repositionner les contrôles Leaflet pour qu'ils ne gênent pas
          if (map.zoomControl) {
            map.zoomControl.setPosition('bottomright');
          }
          
          // Fonctions de zoom simplifiées et plus efficaces
          window.zoomIn = function() {
            if (map) {
              map.zoomIn(1);
              console.log('Zoom in - Niveau:', map.getZoom());
            }
          };
          
          window.zoomOut = function() {
            if (map) {
              map.zoomOut(1);
              console.log('Zoom out - Niveau:', map.getZoom());
            }
          };
          
          window.centerOnUser = function() {
            if (map && marker) {
              const targetZoom = Math.max(map.getZoom(), 16);
              map.setView(marker.getLatLng(), targetZoom);
              console.log('Centré sur utilisateur - Niveau:', targetZoom);
            }
          };
          
          // Couches de cartes avec zoom étendu
          const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 20,
            maxNativeZoom: 19,
            tileSize: 256,
            zoomOffset: 0
          });
          
          const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri',
            maxZoom: 20,
            maxNativeZoom: 18,
            tileSize: 256,
            zoomOffset: 0
          });
          
          // Ajouter la couche satellite par défaut (plus belle pour La Réunion)
          satelliteLayer.addTo(map);
          
          // Contrôle de couches avec satellite en premier
          const baseMaps = {
            "Satellite": satelliteLayer,
            "Plan": osmLayer
          };
          
          L.control.layers(baseMaps).addTo(map);
          
          // Icône personnalisée pour le marker
          const createCustomIcon = (color) => L.divIcon({
            html: \`<div style="background-color: \${color}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>\`,
            className: 'custom-marker',
            iconSize: [26, 26],
            iconAnchor: [13, 13]
          });
          
          // Marker initial
          marker = L.marker([${lat}, ${lng}], {
            icon: createCustomIcon('#3b82f6')
          }).addTo(map);

          marker.bindPopup(\`
            <div style="text-align: center; background: white; padding: 8px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
              <strong style="color: #1f2937; font-size: 14px;">📍 Ma position</strong><br/>
              <small style="color: #4b5563; font-size: 12px; margin-top: 4px; display: block;">Position actuelle</small><br/>
              <small style="color: #6b7280; font-family: monospace; font-size: 10px; margin-top: 2px; display: block;">
                ${lat.toFixed(6)}, ${lng.toFixed(6)}
              </small>
            </div>
          \`, {
            className: 'custom-popup',
            maxWidth: 250,
            closeButton: true
          }).openPopup();
          
          // Fonction pour calculer la distance entre deux points
          function calculateDistance(lat1, lon1, lat2, lon2) {
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
          }
          
          // Mettre à jour la position du marker
          window.updateMarkerPosition = function(lat, lng, newAddress, isTracking) {
            const newLatLng = L.latLng(lat, lng);
            marker.setLatLng(newLatLng);
            marker.setIcon(createCustomIcon(isTracking ? '#22c55e' : '#3b82f6'));
            
            marker.setPopupContent(\`
              <div style="text-align: center; background: white; padding: 8px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
                <strong style="color: #1f2937; font-size: 14px;">\${newAddress && newAddress.includes('Piton de la Fournaise') ? '🌋 Piton de la Fournaise' : '📍 Ma position'}</strong><br/>
                <small style="color: #4b5563; font-size: 12px; margin-top: 4px; display: block;">\${newAddress}</small><br/>
                <small style="color: #6b7280; font-family: monospace; font-size: 10px; margin-top: 2px; display: block;">
                  \${lat.toFixed(6)}, \${lng.toFixed(6)}
                </small>
              </div>
            \`);
            
            // Calculer et afficher la vitesse si on a une position précédente
            const now = Date.now();
            if (lastPosition && now - lastUpdateTime > 1000) {
              const distance = calculateDistance(lastPosition.lat, lastPosition.lng, lat, lng);
              const timeHours = (now - lastUpdateTime) / (1000 * 60 * 60);
              const speed = distance / timeHours;
              
              if (speed < 100) { // Filtrer les vitesses irréalistes
                document.getElementById('speed-indicator').textContent = speed.toFixed(1) + ' km/h';
              }
            }
            
            lastPosition = { lat, lng };
            lastUpdateTime = now;
          };
          
          // Mettre à jour le tracé
          window.updateTrackingPath = function(pathCoords, isActive) {
            console.log('🗺️ [MAP JS] updateTrackingPath appelé:', pathCoords.length, 'points');

            // Supprimer l'ancien tracé
            if (currentPolyline) {
              map.removeLayer(currentPolyline);
            }

            if (pathCoords.length > 1) {
              // Convertir {latitude, longitude} en [lat, lng] pour Leaflet
              const latLngs = pathCoords.map(coord => [coord.latitude, coord.longitude]);
              console.log('🗺️ [MAP JS] Premier point converti:', latLngs[0]);
              console.log('🗺️ [MAP JS] Dernier point converti:', latLngs[latLngs.length - 1]);

              currentPolyline = L.polyline(latLngs, {
                color: isActive ? '#22c55e' : '#3b82f6',
                weight: 5,
                opacity: 0.8,
                smoothFactor: 1.5,
                lineCap: 'round',
                lineJoin: 'round'
              }).addTo(map);

              console.log('✅ [MAP JS] Polyline ajoutée à la carte avec', latLngs.length, 'points');
              
              // Calculer la distance totale
              totalDistance = 0;
              for (let i = 1; i < pathCoords.length; i++) {
                totalDistance += calculateDistance(
                  pathCoords[i-1].latitude, pathCoords[i-1].longitude,
                  pathCoords[i].latitude, pathCoords[i].longitude
                );
              }
              document.getElementById('distance-indicator').textContent = totalDistance.toFixed(2) + ' km';
              
              // Auto-zoom pour inclure tout le tracé périodiquement
              if (isActive && pathCoords.length % 10 === 0) {
                const group = new L.featureGroup([marker, currentPolyline]);
                map.fitBounds(group.getBounds().pad(0.05));
              }
            }
          };
          
          // Écouter les messages du React Native
          window.addEventListener('message', function(event) {
            try {
              eval(event.data);
            } catch (e) {
              console.log('Message reçu:', event.data);
            }
          });
          
          // Marquer la carte comme prête
          setTimeout(() => {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage('MAP_READY');
            }
          }, 1000);
        </script>
      </body>
    </html>
  `;
  }, []); // useMemo - HTML créé une seule fois au montage

  // Mettre à jour la position en temps réel
  useEffect(() => {
    if (coords && mapReady && webViewRef.current) {
      // Échapper les guillemets pour prévenir les injections XSS
      const safeAddress = (address || 'Position actuelle').replace(/"/g, '\\"').replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
      const updateScript = `
        if (typeof updateMarkerPosition === 'function') {
          updateMarkerPosition(${coords.latitude}, ${coords.longitude}, "${safeAddress}", ${isTracking});
        }
      `;
      webViewRef.current.injectJavaScript(updateScript);
    }
  }, [coords, address, isTracking, mapReady]);

  // Mettre à jour le tracé en temps réel
  useEffect(() => {
    if (trackingPath.length > 0 && mapReady && webViewRef.current) {
      console.log(`🗺️ Mise à jour du tracé sur la carte: ${trackingPath.length} points, isTracking=${isTracking}`);
      const updatePathScript = `
        if (typeof updateTrackingPath === 'function') {
          updateTrackingPath(${JSON.stringify(trackingPath)}, ${isTracking});
        }
      `;
      webViewRef.current.injectJavaScript(updatePathScript);
    }
  }, [trackingPath, isTracking, mapReady]);

  if (!isVisible) {
    return null;
  }

  if (!coords) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-100">
        <View className="w-16 h-16 bg-blue-500 rounded-full items-center justify-center mb-4">
          <Text className="text-white text-2xl">📡</Text>
        </View>
        <Text className="text-gray-700 text-lg font-medium">Localisation GPS...</Text>
        <Text className="text-gray-500 text-sm mt-2">Recherche de votre position</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">

      {/* Carte WebView ultra-précise */}
      <View className="flex-1">
        <WebView
          ref={webViewRef}
          style={{ flex: 1 }}
          source={{ html: mapHTML }}
          onLoad={() => setMapReady(true)}
          onMessage={(event) => {
            if (event.nativeEvent.data === 'MAP_READY') {
              setMapReady(true);
            }
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          // Optimisations pour les interactions tactiles
          scalesPageToFit={false}
          bounces={false}
          scrollEnabled={false}
          // Améliorer les performances
          cacheEnabled={true}
          incognito={false}
          // Support multi-touch pour pinch-zoom
          allowsBackForwardNavigationGestures={false}
          // Améliorer les interactions tactiles
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          decelerationRate={0.998}
          renderLoading={() => (
            <View className="flex-1 items-center justify-center bg-gray-100">
              <Text className="text-gray-600 text-lg">📡 Initialisation GPS...</Text>
              <Text className="text-gray-500 text-sm mt-2">Carte haute précision</Text>
            </View>
          )}
        />
      </View>

      {/* Info position discrète - seulement si nécessaire */}
      {coords && coords.accuracy && coords.accuracy > 20 && (
        <View className="absolute bottom-4 left-4 z-10 bg-red-100/90 backdrop-blur-sm rounded-lg px-3 py-2">
          <Text className="text-xs text-red-700 font-medium">
            🎯 GPS: ±{coords.accuracy.toFixed(0)}m
          </Text>
        </View>
      )}
    </View>
  );
}
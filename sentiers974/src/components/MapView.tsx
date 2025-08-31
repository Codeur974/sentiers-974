import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { WebView } from "react-native-webview";

interface GoogleMapViewProps {
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
}

export default function GoogleMapViewComponent({
  coords,
  address,
  isVisible,
  onToggle,
}: GoogleMapViewProps) {
  const [mapReady, setMapReady] = useState(false);
  const { width } = Dimensions.get('window');

  // Reset map when component unmounts or isVisible changes
  useEffect(() => {
    if (!isVisible) {
      setMapReady(false);
    }
  }, [isVisible]);

  // Ne rien afficher du tout si isVisible est false
  if (!isVisible || !coords) {
    return null;
  }

  const region = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <View className="mb-4 bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header carte avec infos et bouton masquer */}
      <View className="flex-row items-center justify-between p-4 bg-blue-50 border-b border-blue-100">
        <View className="flex-1">
          <View className="flex-row items-center mb-1">
            <Text className="text-blue-600 text-lg mr-2">🗺️</Text>
            <Text className="text-blue-600 font-semibold">Carte OpenStreetMap</Text>
          </View>
          {address && (
            <Text className="text-sm text-gray-600" numberOfLines={1}>
              📍 {address}
            </Text>
          )}
        </View>
        <TouchableOpacity 
          onPress={onToggle}
          className="bg-blue-600 px-4 py-2 rounded-lg shadow-sm"
        >
          <Text className="text-white text-sm font-medium">✕ Fermer</Text>
        </TouchableOpacity>
      </View>

      {/* Carte OpenStreetMap - Solution fiable sans API keys */}
      <View className="h-80">
        <WebView
          style={{ flex: 1 }}
          source={{
            html: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                  <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    html, body { height: 100%; }
                    #map { height: 100%; width: 100%; }
                  </style>
                </head>
                <body>
                  <div id="map"></div>
                  
                  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                  <script>
                    // Initialiser la carte Leaflet avec OpenStreetMap
                    const map = L.map('map').setView([${coords.latitude}, ${coords.longitude}], 16);
                    
                    // Ajouter les tuiles OpenStreetMap
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                      attribution: '© OpenStreetMap contributors'
                    }).addTo(map);
                    
                    // Ajouter un marker personnalisé
                    const marker = L.marker([${coords.latitude}, ${coords.longitude}])
                      .addTo(map)
                      .bindPopup(\`
                        <div style="text-align: center; font-family: -apple-system, sans-serif;">
                          <strong>📍 Ma position</strong><br/>
                          <small style="color: #666;">${address || 'Position actuelle'}</small><br/>
                          <small style="color: #999; font-family: monospace;">
                            ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}
                          </small>
                        </div>
                      \`)
                      .openPopup();
                    
                    // Style personnalisé pour le marker
                    marker._icon.style.filter = 'hue-rotate(220deg)'; // Bleu comme Google
                  </script>
                </body>
              </html>
            `
          }}
          onLoad={() => setMapReady(true)}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View className="flex-1 items-center justify-center bg-gray-100">
              <Text className="text-gray-600">Chargement de la carte...</Text>
            </View>
          )}
        />
      </View>

      {/* Info position sous la carte */}
      <View className="p-3 bg-gray-50 border-t border-gray-100">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center space-x-4">
            <Text className="text-xs text-gray-600">
              📍 {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
            </Text>
            {coords.accuracy && (
              <Text className="text-xs text-gray-600">
                🎯 ±{coords.accuracy.toFixed(0)}m
              </Text>
            )}
          </View>
          {coords.altitude && (
            <Text className="text-xs text-gray-600">
              ⛰️ {coords.altitude.toFixed(0)}m
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}
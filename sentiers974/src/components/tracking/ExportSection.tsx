import React, { useState } from "react";
import { View, Text, TouchableOpacity, Share, Alert } from "react-native";
import * as FileSystem from 'expo-file-system';
import { GPXExporter } from "../../utils/gpxExport";

interface ExportSectionProps {
  trackingPath: Array<{latitude: number; longitude: number}>;
  chartData: Array<{time: number; altitude: number | null; speed: number; timestamp: number}>;
  sessionData: {
    sport: string;
    distance: number;
    duration: number;
    elevationGain: number;
    elevationLoss: number;
    maxSpeed: number;
    avgSpeed: number;
  };
  isSessionComplete: boolean;
}

export default function ExportSection({ 
  trackingPath, 
  chartData, 
  sessionData, 
  isSessionComplete 
}: ExportSectionProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportGPX = async () => {
    if (!isSessionComplete || trackingPath.length === 0) {
      Alert.alert(
        "Export impossible", 
        "Terminez d'abord votre session pour exporter la trace GPX."
      );
      return;
    }

    setIsExporting(true);

    try {
      // Préparer les données de session
      const now = Date.now();
      const startTime = now - sessionData.duration;
      
      const gpxSessionData = GPXExporter.convertTrackingDataToGPX(
        trackingPath,
        chartData,
        {
          sport: sessionData.sport,
          startTime: startTime,
          endTime: now,
          distance: sessionData.distance,
          duration: sessionData.duration,
          elevationGain: sessionData.elevationGain,
          elevationLoss: sessionData.elevationLoss,
          maxSpeed: sessionData.maxSpeed,
          avgSpeed: sessionData.avgSpeed
        }
      );

      // Générer le contenu GPX
      const gpxContent = GPXExporter.generateGPX(gpxSessionData);
      
      // Créer le nom de fichier
      const date = new Date().toISOString().split('T')[0];
      const filename = `Sentiers974_${sessionData.sport}_${date}.gpx`;
      
      // Écrire le fichier
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, gpxContent, {
        encoding: FileSystem.EncodingType.UTF8
      });

      // Partager le fichier avec le Share natif
      try {
        await Share.share({
          url: fileUri,
          title: 'Trace GPX - Sentiers 974',
          message: `Ma trace ${sessionData.sport} de ${sessionData.distance.toFixed(1)}km à La Réunion 🏝️`
        });
      } catch (shareError) {
        // Si le partage échoue, au moins informer que le fichier est créé
        Alert.alert(
          "Fichier GPX créé", 
          `Votre trace a été sauvegardée :\n${filename}\n\nVous pouvez le trouver dans vos fichiers et l'importer dans Strava, Garmin Connect, etc.`
        );
      }
      
      console.log(`✅ GPX exporté: ${filename} (${trackingPath.length} points)`);
      
    } catch (error) {
      console.error('Erreur export GPX:', error);
      Alert.alert(
        "Erreur d'export", 
        "Impossible d'exporter la trace GPX. Vérifiez les permissions."
      );
    } finally {
      setIsExporting(false);
    }
  };

  if (!isSessionComplete) {
    return (
      <View className="bg-gray-50 p-3 rounded-lg border border-gray-200">
        <Text className="text-center text-gray-500 text-sm">
          📤 Export GPX disponible après la session
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-blue-50 p-3 rounded-lg border border-blue-200">
      <Text className="text-gray-700 mb-2 font-bold">📤 Export & Partage</Text>
      
      <TouchableOpacity
        onPress={handleExportGPX}
        disabled={isExporting}
        className={`p-3 rounded-lg ${
          isExporting ? 'bg-gray-400' : 'bg-blue-600'
        }`}
      >
        <Text className="text-white font-bold text-center">
          {isExporting ? '🔄 Export en cours...' : '📁 Exporter en GPX'}
        </Text>
      </TouchableOpacity>
      
      <View className="flex-row justify-around mt-3">
        <Text className="text-xs text-blue-700">📊 {trackingPath.length} points GPS</Text>
        <Text className="text-xs text-blue-700">🏝️ Compatible Strava/Garmin</Text>
      </View>
      
      <Text className="text-xs text-center text-gray-500 mt-2">
        Format GPX standard • Importable partout • Made in 974 🏝️
      </Text>
    </View>
  );
}
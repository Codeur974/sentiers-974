import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PointOfInterest, POICreationData } from '../types/poi';
import { PhotoManager } from '../utils/photoUtils';

const STORAGE_KEY = 'sentiers974_pois';

export const usePointsOfInterest = () => {
  const [pois, setPois] = useState<PointOfInterest[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les POI depuis AsyncStorage
  const loadPOIs = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedPois = JSON.parse(stored);
        setPois(parsedPois);
        console.log(`📍 ${parsedPois.length} POI chargés`);
      }
    } catch (error) {
      console.error('❌ Erreur chargement POI:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sauvegarder les POI
  const savePOIs = async (poisToSave: PointOfInterest[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(poisToSave));
      console.log(`💾 ${poisToSave.length} POI sauvegardés`);
    } catch (error) {
      console.error('❌ Erreur sauvegarde POI:', error);
    }
  };

  // Créer un nouveau POI
  const createPOI = async (
    coords: { latitude: number; longitude: number; altitude?: number },
    distance: number,
    time: number,
    data: POICreationData,
    sessionId?: string,
    customTimestamp?: number
  ): Promise<PointOfInterest | null> => {
    
    let photoUri: string | undefined;
    
    // Gérer la photo selon le type
    if (data.photo) {
      if (typeof data.photo === 'string') {
        // Photo déjà sélectionnée depuis la galerie
        photoUri = data.photo;
        console.log('📷 Utilisation photo galerie:', photoUri);
      } else {
        // Prendre une nouvelle photo avec la caméra
        photoUri = await PhotoManager.takePhoto() || undefined;
        console.log('📷 Photo prise avec caméra:', photoUri);
      }
    }

    const poi: PointOfInterest = {
      id: `poi_${Date.now()}`,
      latitude: coords.latitude,
      longitude: coords.longitude,
      altitude: coords.altitude,
      distance,
      time,
      title: data.title,
      note: data.note,
      photoUri,
      createdAt: customTimestamp || Date.now(),
      sessionId
    };

    const newPois = [...pois, poi];
    setPois(newPois);
    await savePOIs(newPois);
    
    console.log(`📍 POI créé: ${poi.title} à ${distance.toFixed(2)}km`, {
      poiId: poi.id,
      sessionId: poi.sessionId,
      hasPhoto: !!poi.photoUri,
      photoUri: poi.photoUri
    });
    return poi;
  };

  // Supprimer un POI
  const deletePOI = async (poiId: string) => {
    const poiToDelete = pois.find(p => p.id === poiId);
    if (poiToDelete?.photoUri) {
      await PhotoManager.deletePhoto(poiToDelete.photoUri);
    }

    const newPois = pois.filter(p => p.id !== poiId);
    setPois(newPois);
    await savePOIs(newPois);
    
    console.log(`🗑️ POI supprimé: ${poiId}`);
  };

  // Obtenir les POI d'une session
  const getPOIsForSession = (sessionId: string): PointOfInterest[] => {
    return pois.filter(poi => poi.sessionId === sessionId);
  };

  // Charger au démarrage
  useEffect(() => {
    loadPOIs();
  }, []);

  return {
    pois,
    loading,
    createPOI,
    deletePOI,
    getPOIsForSession,
    reload: loadPOIs
  };
};
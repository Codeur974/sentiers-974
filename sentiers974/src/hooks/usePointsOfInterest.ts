import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PointOfInterest, POICreationData } from '../types/poi';
import { PhotoManager } from '../utils/photoUtils';

const STORAGE_KEY = 'sentiers974_pois';

export const usePointsOfInterest = () => {
  const [pois, setPois] = useState<PointOfInterest[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les POI depuis MongoDB en premier, puis AsyncStorage fallback
  const loadPOIs = async () => {
    setLoading(true);
    try {
      let allPois: PointOfInterest[] = [];
      
      // 1. Essayer de charger depuis MongoDB d'abord
      try {
        console.log('☁️ Chargement POI depuis MongoDB...');
        const response = await fetch('http://192.168.1.12:3001/api/pointofinterests?userId=default-user');
        if (response.ok) {
          const mongoData = await response.json();
          if (mongoData.success && mongoData.data) {
            const mongoPois = mongoData.data.map(poi => ({
              id: poi.id || poi._id,
              title: poi.title,
              note: poi.note || '',
              photoUri: poi.photo || '',
              latitude: poi.latitude,
              longitude: poi.longitude,
              distance: 0, // Valeur par défaut pour les POI MongoDB
              time: 0, // Valeur par défaut pour les POI MongoDB
              sessionId: poi.sessionId || '',
              createdAt: new Date(poi.createdAt).getTime(),
              source: 'mongodb' as const
            }));
            allPois.push(...mongoPois);
            console.log(`☁️ ${mongoPois.length} POI chargés depuis MongoDB`);
          }
        }
      } catch (mongoError) {
        console.log('⚠️ MongoDB indisponible, fallback AsyncStorage:', mongoError);
      }
      
      // 2. Charger aussi depuis AsyncStorage (POI locaux)
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const asyncStoragePois = JSON.parse(stored);
        const localPois = asyncStoragePois.map(poi => ({ ...poi, source: 'local' }));
        allPois.push(...localPois);
        console.log(`📱 ${asyncStoragePois.length} POI chargés depuis AsyncStorage`);
      }
      
      // 3. Fusionner et dédupliquer (MongoDB prioritaire)
      const uniquePois = [];
      const seenIds = new Set();
      
      // D'abord les POI MongoDB
      allPois.filter(poi => poi.source === 'mongodb').forEach(poi => {
        if (!seenIds.has(poi.id)) {
          uniquePois.push(poi);
          seenIds.add(poi.id);
        }
      });
      
      // Puis les POI locaux non dupliqués
      allPois.filter(poi => poi.source === 'local').forEach(poi => {
        if (!seenIds.has(poi.id)) {
          uniquePois.push(poi);
          seenIds.add(poi.id);
        }
      });
      
      setPois(uniquePois);
      console.log(`📍 Total POI chargés: ${uniquePois.length} (${uniquePois.filter(p => p.source === 'mongodb').length} MongoDB + ${uniquePois.filter(p => p.source === 'local').length} local)`);
      
    } catch (error) {
      console.error('❌ Erreur chargement POI:', error);
      setPois([]);
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
      sessionId,
      source: 'local' // Par défaut local, changé si sauvé sur MongoDB
    };

    // 1. Essayer de sauvegarder dans MongoDB d'abord
    try {
      console.log('☁️ Sauvegarde POI dans MongoDB...');
      const mongoData = {
        id: poi.id,
        title: poi.title,
        note: poi.note,
        latitude: poi.latitude,
        longitude: poi.longitude,
        photo: poi.photoUri,
        sessionId: poi.sessionId,
        userId: 'default-user',
        createdAt: new Date(poi.createdAt)
      };
      
      const response = await fetch('http://192.168.1.12:3001/api/pointofinterests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mongoData)
      });
      
      if (response.ok) {
        poi.source = 'mongodb'; // Marquer comme sauvegardé sur MongoDB
        console.log('✅ POI sauvegardé dans MongoDB:', poi.id);
      } else {
        console.log('⚠️ Échec sauvegarde MongoDB, fallback AsyncStorage');
      }
    } catch (mongoError) {
      console.log('⚠️ MongoDB indisponible, sauvegarde locale uniquement:', mongoError);
    }

    // 2. Toujours sauvegarder localement aussi (backup)
    const newPois = [...pois, poi];
    setPois(newPois);
    await savePOIs(newPois.filter(p => p.source === 'local')); // Ne sauvegarder en local que les POI locaux
    
    console.log(`📍 POI créé: ${poi.title} à ${distance.toFixed(2)}km (source: ${poi.source})`, {
      poiId: poi.id,
      sessionId: poi.sessionId,
      hasPhoto: !!poi.photoUri,
      photoUri: poi.photoUri
    });
    return poi;
  };

  // Supprimer un POI
  const deletePOI = async (poiId: string, skipStateUpdate = false) => {
    const poiToDelete = pois.find(p => p.id === poiId);
    if (!poiToDelete) {
      console.log(`⚠️ POI introuvable: ${poiId}`);
      return;
    }

    console.log(`🔍 Suppression POI: ${poiId}, source: ${poiToDelete.source}, title: "${poiToDelete.title}"`);

    try {
      // Si c'est un POI MongoDB, le supprimer du serveur aussi
      if (poiToDelete.source === 'mongodb') {
        console.log(`☁️ Suppression POI MongoDB sur serveur: ${poiId}`);
        try {
          const response = await fetch(`http://192.168.1.12:3001/api/pointofinterests/${poiId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            console.log(`✅ POI MongoDB supprimé du serveur: ${poiId}`);
          } else {
            const errorText = await response.text();
            console.log(`⚠️ Échec suppression serveur: ${response.status} - ${errorText}`);
            // Continuer quand même la suppression locale
          }
        } catch (serverError) {
          console.log(`⚠️ Erreur serveur, suppression locale seulement:`, serverError.message);
          // Continuer quand même la suppression locale
        }
      }

      // Supprimer la photo locale si elle existe
      if (poiToDelete?.photoUri && !poiToDelete.photoUri.includes('placeholder')) {
        await PhotoManager.deletePhoto(poiToDelete.photoUri);
      }

      // Suppression locale
      if (!skipStateUpdate) {
        const newPois = pois.filter(p => p.id !== poiId);
        setPois(newPois);
        await savePOIs(newPois);
      }
      
      console.log(`🗑️ POI supprimé ${skipStateUpdate ? 'sur serveur' : 'localement'}: ${poiId} "${poiToDelete.title}"`);
      
    } catch (error) {
      console.error(`❌ Erreur suppression POI ${poiId}:`, error);
      throw error;
    }
  };

  // Supprimer plusieurs POI en batch (pour la suppression de jour)
  const deletePOIsBatch = async (poiIds: string[]) => {
    console.log(`🗑️ Suppression batch de ${poiIds.length} POI...`);
    
    // Supprimer tous les POI du serveur sans mettre à jour l'état
    for (const poiId of poiIds) {
      try {
        await deletePOI(poiId, true); // skipStateUpdate = true
      } catch (error) {
        console.error(`❌ Erreur suppression POI ${poiId}:`, error);
        // Continue même si erreur
      }
    }
    
    // Mettre à jour l'état une seule fois à la fin
    const newPois = pois.filter(p => !poiIds.includes(p.id));
    setPois(newPois);
    await savePOIs(newPois);
    
    console.log(`✅ Batch supprimé: ${poiIds.length} POI`);
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
    deletePOIsBatch,
    getPOIsForSession,
    reload: loadPOIs
  };
};
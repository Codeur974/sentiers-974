import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PointOfInterest, POICreationData } from '../types/poi';
import { PhotoManager } from '../utils/photoUtils';

const STORAGE_KEY = 'sentiers974_pois';

export const usePointsOfInterest = () => {
  const [pois, setPois] = useState<PointOfInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const isLoadingRef = useRef(false);

  const loadPOIs = useCallback(async () => {
    if (isLoadingRef.current) {
      console.log('POI load skipped: already in progress');
      return;
    }

    isLoadingRef.current = true;
    setLoading(true);
    try {
      let allPois: PointOfInterest[] = [];

      try {
        console.log('Loading POI from MongoDB...');
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
              distance: 0,
              time: 0,
              sessionId: poi.sessionId || '',
              createdAt: new Date(poi.createdAt).getTime(),
              source: 'mongodb' as const
            }));
            allPois.push(...mongoPois);
            console.log(`Loaded ${mongoPois.length} POI from MongoDB`);
          }
        }
      } catch (mongoError) {
        console.log('MongoDB unavailable, fallback to AsyncStorage:', mongoError);
      }

      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const asyncStoragePois = JSON.parse(stored);
        const localPois = asyncStoragePois.map((poi: PointOfInterest) => ({ ...poi, source: 'local' }));
        allPois.push(...localPois);
        console.log(`Loaded ${asyncStoragePois.length} POI from AsyncStorage`);
      }

      const uniquePois: PointOfInterest[] = [];
      const seenIds = new Set<string>();

      allPois
        .filter(poi => poi.source === 'mongodb')
        .forEach(poi => {
          if (!seenIds.has(poi.id)) {
            uniquePois.push(poi);
            seenIds.add(poi.id);
          }
        });

      allPois
        .filter(poi => poi.source === 'local')
        .forEach(poi => {
          if (!seenIds.has(poi.id)) {
            uniquePois.push(poi);
            seenIds.add(poi.id);
          }
        });

      setPois(uniquePois);
      const mongoCount = uniquePois.filter(p => p.source === 'mongodb').length;
      const localCount = uniquePois.length - mongoCount;
      console.log(`Total POI loaded: ${uniquePois.length} (${mongoCount} MongoDB + ${localCount} local)`);
    } catch (error) {
      console.error('POI load error:', error);
      setPois([]);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, []);

  // useEffect supprimé - doublon avec celui de la ligne 318

  // Sauvegarder les POI
  const savePOIs = async (poisToSave: PointOfInterest[]) => {
    try {
      const localPois = poisToSave.filter(poi => poi.source !== 'mongodb');
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(localPois));
      console.log(`ðŸ’¾ ${poisToSave.length} POI sauvegardÃ©s`);
    } catch (error) {
      console.error('âŒ Erreur sauvegarde POI:', error);
    }
  };

  // CrÃ©er un nouveau POI
  const createPOI = async (
    coords: { latitude: number; longitude: number; altitude?: number },
    distance: number,
    time: number,
    data: POICreationData,
    sessionId?: string,
    customTimestamp?: number
  ): Promise<PointOfInterest | null> => {

    let photoUri: string | undefined;

    // GÃ©rer la photo selon le type
    if (data.photo) {
      if (typeof data.photo === 'string') {
        // Photo dÃ©jÃ  sÃ©lectionnÃ©e depuis la galerie
        photoUri = data.photo;
        console.log('ðŸ“· Utilisation photo galerie:', photoUri);
      } else {
        // Prendre une nouvelle photo avec la camÃ©ra
        photoUri = await PhotoManager.takePhoto() || undefined;
        console.log('ðŸ“· Photo prise avec camÃ©ra:', photoUri);
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
      source: 'local' // Par dÃ©faut local, changÃ© si sauvÃ© sur MongoDB
    };

    let latestPois = [poi, ...pois.filter(p => p.id !== poi.id)];
    setPois(latestPois);
    await savePOIs(latestPois);

    // 1. Essayer de sauvegarder dans les sessions MongoDB d'abord
    try {
      if (sessionId) {
        console.log('â˜ï¸ Ajout photo Ã  la session MongoDB...', { sessionId, title: poi.title });
        const photoData = {
          id: poi.id,
          uri: poi.photoUri,
          coordinates: {
            latitude: poi.latitude,
            longitude: poi.longitude
          },
          timestamp: poi.createdAt,
          caption: poi.title
        };

        console.log('ðŸ“¤ DonnÃ©es envoyÃ©es au backend:', JSON.stringify(photoData, null, 2));
        console.log('🔗 URL de l\'endpoint:', `http://192.168.1.12:3001/api/sessions/${sessionId}/photos`);

        const response = await fetch(`http://192.168.1.12:3001/api/sessions/${sessionId}/photos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(photoData)
        });

        console.log('ðŸ“¥ RÃ©ponse du serveur:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok
        });

        if (response.ok) {
          const responseData = await response.json();
          console.log('ðŸ“‹ DonnÃ©es de rÃ©ponse:', responseData);

          const returnedPhoto = responseData?.data;
          const finalPoiId = returnedPhoto?.id || poi.id;

          poi.id = finalPoiId;
          poi.photoUri = returnedPhoto?.uri || poi.photoUri;
          poi.source = 'mongodb';

          latestPois = latestPois.map(item =>
            item.id === photoData.id || item.id === finalPoiId
              ? { ...item, ...poi }
              : item
          );

          setPois(latestPois);
          await savePOIs(latestPois);

          console.log('âœ… Photo ajoutÃ©e Ã  la session MongoDB:', sessionId);

          await loadPOIs();
        } else {
          const errorText = await response.text();
          if (response.status === 404) {
            console.log('âš ï¸ Session MongoDB expirÃ©e/introuvable:', sessionId);
          } else {
            console.log('âŒ Ã‰chec sauvegarde session MongoDB:', {
              status: response.status,
              statusText: response.statusText,
              errorBody: errorText
            });
          }
        }
      } else {
        console.log('âš ï¸ Pas de sessionId fourni, impossible de sauvegarder en MongoDB');
      }
    } catch (mongoError) {
      console.log('âŒ Erreur rÃ©seau/serveur MongoDB:', mongoError);
    }

    console.log(`ðŸ“ POI crÃ©Ã©: ${poi.title} Ã  ${distance.toFixed(2)}km (source: ${poi.source})`, {
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
      console.log(`âš ï¸ POI introuvable: ${poiId}`);
      return;
    }

    console.log(`ðŸ” Suppression POI: ${poiId}, source: ${poiToDelete.source}, title: "${poiToDelete.title}"`);

    try {
      // Si c'est un POI MongoDB, le supprimer du serveur aussi
      if (poiToDelete.source === 'mongodb') {
        console.log(`â˜ï¸ Suppression POI MongoDB sur serveur: ${poiId}`);
        try {
          const response = await fetch(`http://192.168.1.12:3001/api/pointofinterests/${poiId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            console.log(`âœ… POI MongoDB supprimÃ© du serveur: ${poiId}`);
          } else {
            const errorText = await response.text();
            console.log(`âš ï¸ Ã‰chec suppression serveur: ${response.status} - ${errorText}`);
            // Continuer quand mÃªme la suppression locale
          }
        } catch (serverError) {
          console.log(`âš ï¸ Erreur serveur, suppression locale seulement:`, serverError.message);
          // Continuer quand mÃªme la suppression locale
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
      
      console.log(`ðŸ—‘ï¸ POI supprimÃ© ${skipStateUpdate ? 'sur serveur' : 'localement'}: ${poiId} "${poiToDelete.title}"`);
      
    } catch (error) {
      console.error(`âŒ Erreur suppression POI ${poiId}:`, error);
      throw error;
    }
  };

  // Supprimer plusieurs POI en batch (pour la suppression de jour)
  const deletePOIsBatch = async (poiIds: string[]) => {
    console.log(`ðŸ—‘ï¸ Suppression batch de ${poiIds.length} POI...`);
    
    // Supprimer tous les POI du serveur sans mettre Ã  jour l'Ã©tat
    for (const poiId of poiIds) {
      try {
        await deletePOI(poiId, true); // skipStateUpdate = true
      } catch (error) {
        console.error(`âŒ Erreur suppression POI ${poiId}:`, error);
        // Continue mÃªme si erreur
      }
    }
    
    // Mettre Ã  jour l'Ã©tat une seule fois Ã  la fin
    const newPois = pois.filter(p => !poiIds.includes(p.id));
    setPois(newPois);
    await savePOIs(newPois);
    
    console.log(`âœ… Batch supprimÃ©: ${poiIds.length} POI`);
  };

  // Obtenir les POI d'une session
  const getPOIsForSession = (sessionId: string): PointOfInterest[] => {
    return pois.filter(poi => poi.sessionId === sessionId);
  };

  // Charger au dÃ©marrage
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

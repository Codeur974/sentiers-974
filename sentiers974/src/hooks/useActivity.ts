import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { Activity, CreateActivityData, PointOfInterest, CreatePOIData } from '../types/api';

export const useActivity = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== ACTIVITÉS =====

  // Charger toutes les activités de l'utilisateur
  const loadActivities = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiService.getUserActivities();
      if (response.success && response.data) {
        setActivities(response.data as Activity[]);
      } else {
        setError(response.message || 'Erreur lors du chargement des activités');
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Erreur loadActivities:', err);
    } finally {
      setLoading(false);
    }
  };

  // Créer une nouvelle activité
  const createActivity = async (activityData: CreateActivityData): Promise<Activity | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.createActivity(activityData);
      if (response.success && response.data) {
        const newActivity = response.data as Activity;
        setActivities(prev => [newActivity, ...prev]);
        setCurrentActivity(newActivity);
        console.log('✅ Activité créée:', newActivity.title);
        return newActivity;
      } else {
        setError(response.message || 'Erreur lors de la création');
        return null;
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Erreur createActivity:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Obtenir une activité par ID
  const getActivity = async (activityId: string): Promise<Activity | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.getActivity(activityId);
      if (response.success && response.data) {
        const activity = response.data as Activity;
        setCurrentActivity(activity);
        return activity;
      } else {
        setError(response.message || 'Activité non trouvée');
        return null;
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Erreur getActivity:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Mettre à jour une activité
  const updateActivity = async (activityId: string, updateData: Partial<Activity>): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.updateActivity(activityId, updateData);
      if (response.success) {
        // Mettre à jour dans la liste
        setActivities(prev => prev.map(act => 
          act._id === activityId ? { ...act, ...updateData } : act
        ));
        
        // Mettre à jour l'activité courante si c'est celle-ci
        if (currentActivity?._id === activityId) {
          setCurrentActivity(prev => prev ? { ...prev, ...updateData } : null);
        }
        
        console.log('✅ Activité mise à jour');
        return true;
      } else {
        setError(response.message || 'Erreur lors de la mise à jour');
        return false;
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Erreur updateActivity:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Supprimer une activité
  const deleteActivity = async (activityId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiService.deleteActivity(activityId);
      if (response.success) {
        setActivities(prev => prev.filter(act => act._id !== activityId));
        
        if (currentActivity?._id === activityId) {
          setCurrentActivity(null);
        }
        
        console.log('✅ Activité supprimée');
        return true;
      } else {
        setError(response.message || 'Erreur lors de la suppression');
        return false;
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Erreur deleteActivity:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ===== POINTS D'INTÉRÊT =====

  // Créer un POI pour une activité
  const createPOI = async (activityId: string, poiData: CreatePOIData): Promise<PointOfInterest | null> => {
    setError(null);

    try {
      const response = await apiService.createPOI(activityId, poiData);
      if (response.success && response.data) {
        const poi = response.data as PointOfInterest;
        console.log('✅ POI créé:', poi.title);
        return poi;
      } else {
        setError(response.message || 'Erreur lors de la création du POI');
        return null;
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Erreur createPOI:', err);
      return null;
    }
  };

  // Obtenir les POI d'une activité
  const getActivityPOIs = async (activityId: string): Promise<PointOfInterest[]> => {
    try {
      const response = await apiService.getActivityPOIs(activityId);
      if (response.success && response.data) {
        return response.data as PointOfInterest[];
      } else {
        console.warn('Erreur lors du chargement des POI:', response.message);
        return [];
      }
    } catch (err) {
      console.error('Erreur getActivityPOIs:', err);
      return [];
    }
  };

  // Supprimer un POI
  const deletePOI = async (poiId: string): Promise<boolean> => {
    try {
      const response = await apiService.deletePOI(poiId);
      if (response.success) {
        console.log('✅ POI supprimé');
        return true;
      } else {
        setError(response.message || 'Erreur lors de la suppression du POI');
        return false;
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Erreur deletePOI:', err);
      return false;
    }
  };

  // ===== UTILITAIRES =====

  // Convertir les données de tracking en format Activity
  const trackingToActivity = (
    trackingData: {
      selectedSport: any;
      distance: number;
      duration: number;
      trackingPath: Array<{ latitude: number; longitude: number }>;
      elevationGain: number;
      elevationLoss: number;
      minAltitude: number | null;
      maxAltitude: number | null;
      maxSpeed: number;
      avgSpeed: number;
    },
    title?: string
  ): CreateActivityData => {
    return {
      title: title || `${trackingData.selectedSport.nom} - ${new Date().toLocaleDateString('fr-FR')}`,
      activityType: trackingData.selectedSport.nom.toLowerCase() as CreateActivityData['activityType'],
      gpsData: trackingData.trackingPath.map(point => ({
        lat: point.latitude,
        lng: point.longitude,
        timestamp: Date.now(),
      })),
      distance: trackingData.distance,
      duration: Math.floor(trackingData.duration / 1000), // Convertir ms en secondes
      elevation: {
        gain: trackingData.elevationGain,
        loss: trackingData.elevationLoss,
        max: trackingData.maxAltitude || 0,
        min: trackingData.minAltitude || 0,
      },
    };
  };

  // Charger les activités au montage
  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await apiService.isAuthenticated();
      if (isAuth) {
        loadActivities();
      }
    };
    checkAuth();
  }, []);

  return {
    // État
    activities,
    currentActivity,
    loading,
    error,
    
    // Actions activités
    loadActivities,
    createActivity,
    getActivity,
    updateActivity,
    deleteActivity,
    
    // Actions POI
    createPOI,
    getActivityPOIs,
    deletePOI,
    
    // Utilitaires
    trackingToActivity,
    
    // Actions
    clearError: () => setError(null),
    setCurrentActivity,
  };
};
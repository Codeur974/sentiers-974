import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { POI } from '../store/useDataStore';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl
  ? `${Constants.expoConfig.extra.apiUrl}/api`
  : 'https://sentiers-974.onrender.com/api';

type PoiUploadResult = {
  ok: boolean;
  status: number;
  data: any;
};

export const uploadPoiToServer = async (
  sessionId: string,
  poi: POI,
  signal?: AbortSignal
): Promise<PoiUploadResult> => {
  const { secureGetItem } = await import('../utils/secureStorage');
  const token =
    (await secureGetItem('authToken')) ||
    (await secureGetItem('userToken')) ||
    null;

  const controller = signal ? undefined : new AbortController();
  const timeoutSignal = controller?.signal;
  if (controller) {
    // 60 secondes pour les photos (upload lent en 5G)
    setTimeout(() => controller.abort(), 60000);
  }

  const finalSignal = signal || timeoutSignal;

  const formData = new FormData();
  formData.append('id', poi.id);
  formData.append('title', poi.title);
  formData.append('latitude', String(poi.latitude));
  formData.append('longitude', String(poi.longitude));
  formData.append('distance', String(poi.distance));
  formData.append('time', String(poi.time));
  if (poi.note) formData.append('note', poi.note);
  if (poi.photoUri) {
    formData.append('photo', {
      uri: poi.photoUri,
      type: 'image/jpeg',
      name: 'poi.jpg',
    } as any);
  }

  const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/poi`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
    signal: finalSignal,
  });

  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
};

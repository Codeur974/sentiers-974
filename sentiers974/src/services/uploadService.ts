import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'https://sentiers-974.onrender.com';

interface UploadResponse {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

/**
 * Service d'upload de photos vers Cloudinary via le backend
 */
class UploadService {
  /**
   * Upload une seule image
   * @param uri URI locale de l'image (file://...)
   * @returns URL Cloudinary de l'image uploadée
   */
  async uploadImage(uri: string): Promise<string> {
    try {
      // Vérification du rate limiting
      const rateLimiter = (await import('../utils/rateLimiter')).default;
      const rateCheck = rateLimiter.check('upload_image');

      if (!rateCheck.allowed) {
        throw new Error(rateCheck.error || 'Trop d\'uploads. Attendez un peu.');
      }

      rateLimiter.record('upload_image');

      console.log('📤 Début upload vers:', API_BASE_URL);
      console.log('📄 URI fichier:', uri);

      // Validation de sécurité : vérifier que c'est une vraie image
      const { validateImageFile } = await import('../utils/imageValidator');
      const validation = await validateImageFile(uri);

      if (!validation.isValid) {
        throw new Error(validation.error || 'Fichier invalide');
      }

      console.log('✅ Validation image OK:', validation.mimeType, `(${(validation.fileSize! / 1024).toFixed(0)}KB)`);

      // Manipuler l'image pour obtenir base64 (compatible Expo Go)
      const manipulatedImage = await manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }], // Resize pour optimiser la taille
        { compress: 0.8, format: SaveFormat.JPEG, base64: true }
      );

      console.log('✅ Conversion base64 OK, taille:', manipulatedImage.base64?.length || 0);

      if (!manipulatedImage.base64) {
        throw new Error('Impossible de convertir l\'image en base64');
      }

      const base64WithPrefix = `data:image/jpeg;base64,${manipulatedImage.base64}`;

      // Récupérer le token d'authentification
      const { secureGetItem } = await import('../utils/secureStorage');
      const token = await secureGetItem('authToken') || await secureGetItem('userToken');
      console.log('🔑 Token récupéré:', token ? 'Oui' : 'Non');

      console.log('🌐 Envoi requête vers:', `${API_BASE_URL}/api/upload`);

      // Envoyer au backend
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          base64: base64WithPrefix,
        }),
      });

      console.log('📡 Réponse statut:', response.status);

      const data = await response.json();

      console.log('📦 Données réponse:', data);

      if (!data.success) {
        console.error('❌ Upload échoué:', data.error);
        throw new Error(data.error || 'Erreur lors de l\'upload');
      }

      console.log('✅ Upload réussi, URL:', data.data.url);
      return data.data.url;
    } catch (error) {
      console.error('❌ Erreur upload image:', error);
      console.error('❌ Type erreur:', error.constructor.name);
      console.error('❌ Message:', error.message);
      throw error;
    }
  }

  /**
   * Upload plusieurs images
   * @param uris Liste d'URIs locales des images
   * @returns Liste des URLs Cloudinary
   */
  async uploadMultipleImages(uris: string[]): Promise<string[]> {
    try {
      // Vérification du rate limiting
      const rateLimiter = (await import('../utils/rateLimiter')).default;
      const rateCheck = rateLimiter.check('upload_multiple');

      if (!rateCheck.allowed) {
        throw new Error(rateCheck.error || 'Trop d\'uploads multiples. Attendez un peu.');
      }

      rateLimiter.record('upload_multiple');

      // Validation de sécurité : vérifier que toutes les images sont valides
      const { areAllImagesValid } = await import('../utils/imageValidator');
      const validationResult = await areAllImagesValid(uris);

      if (!validationResult.valid) {
        throw new Error(`Images invalides: ${validationResult.errors.join(', ')}`);
      }

      console.log(`✅ Validation OK pour ${uris.length} images`);

      // Convertir toutes les images en base64
      const base64Images = await Promise.all(
        uris.map(async (uri) => {
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          // Utiliser la validation pour déterminer le vrai MIME type
          const { validateImageFile } = await import('../utils/imageValidator');
          const validation = await validateImageFile(uri);
          const mimeType = validation.mimeType || 'image/jpeg';
          return `data:${mimeType};base64,${base64}`;
        })
      );

      // Récupérer le token d'authentification
      const { secureGetItem } = await import('../utils/secureStorage');
      const token = await secureGetItem('authToken') || await secureGetItem('userToken');

      // Envoyer au backend
      const response = await fetch(`${API_BASE_URL}/api/upload/multiple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          images: base64Images,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de l\'upload');
      }

      return data.data.map((item: UploadResponse) => item.url);
    } catch (error) {
      console.error('Erreur upload multiple images:', error);
      throw error;
    }
  }

  /**
   * Upload une image avec progression (pour UI)
   * @param uri URI locale de l'image
   * @param onProgress Callback de progression (0-100)
   * @returns URL Cloudinary
   */
  async uploadImageWithProgress(
    uri: string,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    try {
      if (onProgress) onProgress(10);

      // Validation de sécurité : vérifier que c'est une vraie image
      const { validateImageFile } = await import('../utils/imageValidator');
      const validation = await validateImageFile(uri);

      if (!validation.isValid) {
        throw new Error(validation.error || 'Fichier invalide');
      }

      if (onProgress) onProgress(30);

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (onProgress) onProgress(50);

      const mimeType = validation.mimeType || 'image/jpeg';
      const base64WithPrefix = `data:${mimeType};base64,${base64}`;

      if (onProgress) onProgress(60);

      // Récupérer le token d'authentification
      const { secureGetItem } = await import('../utils/secureStorage');
      const token = await secureGetItem('authToken') || await secureGetItem('userToken');

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          base64: base64WithPrefix,
        }),
      });

      if (onProgress) onProgress(90);

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Erreur lors de l\'upload');
      }

      if (onProgress) onProgress(100);

      return data.data.url;
    } catch (error) {
      console.error('Erreur upload image avec progression:', error);
      throw error;
    }
  }
}

export const uploadService = new UploadService();

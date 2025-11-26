import * as FileSystem from 'expo-file-system';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://sentiers-974.onrender.com';

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
      console.log('📤 Début upload vers:', API_BASE_URL);
      console.log('📄 URI fichier:', uri);

      // Convertir l'image en base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log('✅ Conversion base64 OK, taille:', base64.length);

      // Déterminer le type MIME
      const mimeType = uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      const base64WithPrefix = `data:${mimeType};base64,${base64}`;

      console.log('🌐 Envoi requête vers:', `${API_BASE_URL}/api/upload`);

      // Envoyer au backend
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      // Convertir toutes les images en base64
      const base64Images = await Promise.all(
        uris.map(async (uri) => {
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const mimeType = uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
          return `data:${mimeType};base64,${base64}`;
        })
      );

      // Envoyer au backend
      const response = await fetch(`${API_BASE_URL}/api/upload/multiple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (onProgress) onProgress(50);

      const mimeType = uri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      const base64WithPrefix = `data:${mimeType};base64,${base64}`;

      if (onProgress) onProgress(60);

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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

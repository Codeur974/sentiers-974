import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from '../services/api';

export class PhotoManager {
  private static readonly PHOTOS_DIR = `${FileSystem.documentDirectory}sentiers974_photos/`;

  // Assurer que le dossier photos existe
  static async ensurePhotosDirectory(): Promise<void> {
    const dirInfo = await FileSystem.statAsync(this.PHOTOS_DIR).catch(() => null);
    if (!dirInfo?.exists) {
      await FileSystem.makeDirectoryAsync(this.PHOTOS_DIR, { intermediates: true });
      console.log('📁 Dossier photos créé:', this.PHOTOS_DIR);
    }
  }

  // Prendre une photo avec la caméra
  static async takePhoto(): Promise<string | null> {
    try {
      // Demander permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        console.log('❌ Permission caméra refusée');
        return null;
      }

      await this.ensurePhotosDirectory();

      // Ouvrir la caméra
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8, // Compression pour économiser l'espace
      });

      if (result.canceled) {
        return null;
      }

      // Sauvegarder la photo localement ET uploader vers le backend
      const photoName = `poi_${Date.now()}.jpg`;
      const destinationUri = `${this.PHOTOS_DIR}${photoName}`;
      
      await FileSystem.copyAsync({
        from: result.assets[0].uri,
        to: destinationUri,
      });

      console.log('📷 Photo sauvegardée localement:', destinationUri);
      
      // Toujours retourner l'URI local pour l'instant (le backend marche pas toujours)
      console.log('📱 Utilisation stockage local:', destinationUri);
      return destinationUri;

    } catch (error) {
      console.error('❌ Erreur prise photo:', error);
      return null;
    }
  }

  // Choisir une photo de la galerie
  static async pickPhoto(): Promise<string | null> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        console.log('❌ Permission galerie refusée');
        return null;
      }

      await this.ensurePhotosDirectory();

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled) {
        return null;
      }

      // Copier la photo dans notre dossier ET uploader vers le backend
      const photoName = `poi_${Date.now()}.jpg`;
      const destinationUri = `${this.PHOTOS_DIR}${photoName}`;
      
      await FileSystem.copyAsync({
        from: result.assets[0].uri,
        to: destinationUri,
      });

      console.log('📷 Photo importée localement:', destinationUri);
      
      // Toujours retourner l'URI local pour l'instant (le backend marche pas toujours)
      console.log('📱 Utilisation stockage local:', destinationUri);
      return destinationUri;

    } catch (error) {
      console.error('❌ Erreur sélection photo:', error);
      return null;
    }
  }

  // Supprimer une photo
  static async deletePhoto(photoUri: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.statAsync(photoUri).catch(() => null);
      if (fileInfo?.exists) {
        await FileSystem.deleteAsync(photoUri, { idempotent: true });
        console.log('🗑️ Photo supprimée:', photoUri);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Erreur suppression photo:', error);
      return false;
    }
  }

  // Nettoyer les photos orphelines (optionnel)
  static async cleanupOrphanedPhotos(usedPhotoUris: string[]): Promise<void> {
    try {
      await this.ensurePhotosDirectory();
      const files = await FileSystem.readDirectoryAsync(this.PHOTOS_DIR);
      
      for (const file of files) {
        const fullPath = `${this.PHOTOS_DIR}${file}`;
        if (!usedPhotoUris.includes(fullPath)) {
          await FileSystem.deleteAsync(fullPath);
          console.log('🧹 Photo orpheline supprimée:', fullPath);
        }
      }
    } catch (error) {
      console.error('❌ Erreur nettoyage:', error);
    }
  }
}

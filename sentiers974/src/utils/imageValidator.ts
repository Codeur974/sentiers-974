/**
 * Helper pour valider les fichiers images avant upload
 * Protège contre les uploads de fichiers malveillants
 */
import * as FileSystem from 'expo-file-system';

// Taille maximale des images (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Magic numbers (signatures) des formats d'images supportés
const IMAGE_SIGNATURES = {
  jpeg: [0xFF, 0xD8, 0xFF],
  png: [0x89, 0x50, 0x4E, 0x47],
  gif: [0x47, 0x49, 0x46],
  webp: [0x52, 0x49, 0x46, 0x46], // Les 4 premiers bytes, suivi de WEBP plus loin
};

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
  fileSize?: number;
  mimeType?: string;
}

/**
 * Vérifie si un fichier est une image valide en lisant ses premiers bytes
 */
export const validateImageFile = async (uri: string): Promise<ImageValidationResult> => {
  try {
    // 1. Vérifier que le fichier existe
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      return { isValid: false, error: 'Le fichier n\'existe pas' };
    }

    // 2. Vérifier la taille du fichier
    const fileSize = fileInfo.size || 0;
    if (fileSize === 0) {
      return { isValid: false, error: 'Le fichier est vide' };
    }

    if (fileSize > MAX_FILE_SIZE) {
      const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
      return {
        isValid: false,
        error: `Image trop grande (${sizeMB}MB). Maximum: 10MB`,
        fileSize
      };
    }

    // 3. Lire les premiers bytes pour vérifier le magic number
    const base64Header = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
      length: 12, // Lire les 12 premiers bytes
    });

    // Convertir base64 en bytes
    const bytes = atob(base64Header)
      .split('')
      .map(char => char.charCodeAt(0));

    // 4. Vérifier le magic number
    let mimeType: string | undefined;

    // Vérifier JPEG
    if (bytes[0] === IMAGE_SIGNATURES.jpeg[0] &&
        bytes[1] === IMAGE_SIGNATURES.jpeg[1] &&
        bytes[2] === IMAGE_SIGNATURES.jpeg[2]) {
      mimeType = 'image/jpeg';
    }
    // Vérifier PNG
    else if (bytes[0] === IMAGE_SIGNATURES.png[0] &&
             bytes[1] === IMAGE_SIGNATURES.png[1] &&
             bytes[2] === IMAGE_SIGNATURES.png[2] &&
             bytes[3] === IMAGE_SIGNATURES.png[3]) {
      mimeType = 'image/png';
    }
    // Vérifier GIF
    else if (bytes[0] === IMAGE_SIGNATURES.gif[0] &&
             bytes[1] === IMAGE_SIGNATURES.gif[1] &&
             bytes[2] === IMAGE_SIGNATURES.gif[2]) {
      mimeType = 'image/gif';
    }
    // Vérifier WebP (RIFF + WEBP)
    else if (bytes[0] === IMAGE_SIGNATURES.webp[0] &&
             bytes[1] === IMAGE_SIGNATURES.webp[1] &&
             bytes[2] === IMAGE_SIGNATURES.webp[2] &&
             bytes[3] === IMAGE_SIGNATURES.webp[3] &&
             bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
      mimeType = 'image/webp';
    }

    // 5. Validation finale
    if (!mimeType) {
      return {
        isValid: false,
        error: 'Format de fichier non supporté. Seules les images JPEG, PNG, GIF et WebP sont acceptées.',
        fileSize
      };
    }

    return {
      isValid: true,
      fileSize,
      mimeType
    };

  } catch (error) {
    console.error('Erreur lors de la validation de l\'image:', error);
    return {
      isValid: false,
      error: 'Impossible de valider le fichier'
    };
  }
};

/**
 * Valide plusieurs images en parallèle
 */
export const validateMultipleImages = async (uris: string[]): Promise<ImageValidationResult[]> => {
  return Promise.all(uris.map(uri => validateImageFile(uri)));
};

/**
 * Vérifie si toutes les images sont valides
 */
export const areAllImagesValid = async (uris: string[]): Promise<{ valid: boolean; errors: string[] }> => {
  const results = await validateMultipleImages(uris);
  const errors = results
    .filter(result => !result.isValid)
    .map(result => result.error || 'Erreur inconnue');

  return {
    valid: errors.length === 0,
    errors
  };
};

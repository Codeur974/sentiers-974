/**
 * Helper sécurisé pour stocker les données sensibles (tokens, mots de passe)
 * Utilise expo-secure-store au lieu d'AsyncStorage pour chiffrer les données
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Clés sensibles qui doivent être stockées dans SecureStore
const SECURE_KEYS = ['authToken', 'userToken', 'userId', 'deviceId'];

/**
 * Stocke une valeur de manière sécurisée
 * Utilise SecureStore pour les clés sensibles, AsyncStorage pour le reste
 */
export const secureSetItem = async (key: string, value: string): Promise<void> => {
  try {
    if (SECURE_KEYS.includes(key)) {
      // Utiliser SecureStore pour les données sensibles (chiffré)
      await SecureStore.setItemAsync(key, value);
    } else {
      // Utiliser AsyncStorage pour les autres données
      await AsyncStorage.setItem(key, value);
    }
  } catch (error) {
    console.error(`Erreur lors du stockage sécurisé de ${key}:`, error);
    throw error;
  }
};

/**
 * Récupère une valeur stockée de manière sécurisée
 */
export const secureGetItem = async (key: string): Promise<string | null> => {
  try {
    if (SECURE_KEYS.includes(key)) {
      // Récupérer depuis SecureStore
      return await SecureStore.getItemAsync(key);
    } else {
      // Récupérer depuis AsyncStorage
      return await AsyncStorage.getItem(key);
    }
  } catch (error) {
    console.error(`Erreur lors de la récupération sécurisée de ${key}:`, error);
    return null;
  }
};

/**
 * Supprime une valeur stockée de manière sécurisée
 */
export const secureDeleteItem = async (key: string): Promise<void> => {
  try {
    if (SECURE_KEYS.includes(key)) {
      await SecureStore.deleteItemAsync(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  } catch (error) {
    console.error(`Erreur lors de la suppression sécurisée de ${key}:`, error);
    throw error;
  }
};

/**
 * Migre les tokens existants d'AsyncStorage vers SecureStore
 * À appeler une fois au démarrage de l'app
 */
export const migrateTokensToSecureStore = async (): Promise<void> => {
  try {
    for (const key of SECURE_KEYS) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        // Déplacer vers SecureStore
        await SecureStore.setItemAsync(key, value);
        // Supprimer d'AsyncStorage
        await AsyncStorage.removeItem(key);
        console.log(`✅ ${key} migré vers SecureStore`);
      }
    }
  } catch (error) {
    console.error('Erreur lors de la migration vers SecureStore:', error);
  }
};

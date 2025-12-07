import AsyncStorage from '@react-native-async-storage/async-storage';

// Supprime les anciennes clés persistées pour éviter les sessions fantômes
export const purgeLegacyCaches = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const toRemove = keys.filter((k) =>
      k.startsWith('daily_stats_') ||
      // k === 'sentiers974_pois' // ne plus supprimer les POI locaux pour conserver l'offline
      k === 'data-store'
      // On ne supprime plus currentSessionId ni tracking_state_v1 pour permettre la reprise offline d'une session en cours
    );

    if (toRemove.length) {
      await AsyncStorage.multiRemove(toRemove);
    }
  } catch {
    // Non bloquant : on ignore si la purge échoue
  }
};

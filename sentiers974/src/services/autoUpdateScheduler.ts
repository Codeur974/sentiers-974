import { autoUpdateEventsService } from './autoUpdateEventsService';
import { eventsDatabaseService } from './eventsDatabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Planificateur pour les mises à jour automatiques
 * Gère la programmation et l'exécution des tâches de mise à jour
 */
class AutoUpdateScheduler {
  private readonly SCHEDULER_CONFIG_KEY = 'auto_update_config';
  private readonly DEFAULT_CONFIG = {
    enabled: true,
    intervalHours: 168, // 7 jours
    lastRun: 0,
    maxRetries: 3,
    notifyOnUpdate: true
  };

  private updateTimer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  /**
   * Initialise et démarre le planificateur automatique
   */
  async initialize(): Promise<void> {
    console.log('⏰ Initialisation du planificateur de mises à jour');
    
    try {
      const config = await this.getConfig();
      
      if (config.enabled) {
        await this.startScheduler();
        console.log('✅ Planificateur démarré');
      } else {
        console.log('⚠️ Planificateur désactivé dans la configuration');
      }
    } catch (error) {
      console.error('❌ Erreur initialisation planificateur:', error);
    }
  }

  /**
   * Démarre le planificateur
   */
  async startScheduler(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Planificateur déjà en cours');
      return;
    }

    const config = await this.getConfig();
    const intervalMs = config.intervalHours * 60 * 60 * 1000;

    // Vérifier si une mise à jour est due
    const now = Date.now();
    const timeSinceLastRun = now - config.lastRun;
    
    if (timeSinceLastRun >= intervalMs) {
      // Exécuter immédiatement si la dernière mise à jour est ancienne
      console.log('🔄 Mise à jour due - exécution immédiate');
      await this.runUpdate();
    }

    // Programmer les mises à jour futures
    this.updateTimer = setInterval(async () => {
      await this.runUpdate();
    }, intervalMs);

    this.isRunning = true;
    console.log(`⏰ Mises à jour programmées toutes les ${config.intervalHours} heures`);
  }

  /**
   * Arrête le planificateur
   */
  async stopScheduler(): Promise<void> {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    
    this.isRunning = false;
    console.log('🛑 Planificateur arrêté');
  }

  /**
   * Force une mise à jour immédiate
   */
  async forceUpdate(): Promise<boolean> {
    console.log('🔄 Mise à jour forcée démarrée');
    return await this.runUpdate();
  }

  /**
   * Exécute une mise à jour
   */
  private async runUpdate(): Promise<boolean> {
    const startTime = Date.now();
    console.log('🚀 Démarrage de la mise à jour automatique');
    
    try {
      // 1. Initialiser la base si nécessaire
      await eventsDatabaseService.initializeDatabase();
      
      // 2. Démarrer la mise à jour des événements
      const updatePromise = this.executeUpdateWithRetry();
      
      // 3. Timeout de sécurité (10 minutes maximum)
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout mise à jour')), 10 * 60 * 1000);
      });
      
      const success = await Promise.race([updatePromise, timeoutPromise]);
      
      // 4. Mettre à jour la configuration
      if (success) {
        await this.updateLastRunTimestamp();
        
        const duration = Date.now() - startTime;
        console.log(`✅ Mise à jour terminée en ${Math.round(duration / 1000)}s`);
        
        // 5. Notification optionnelle
        await this.notifyUpdateCompletion();
      }
      
      return success;
      
    } catch (error) {
      console.error('❌ Erreur durant la mise à jour:', error);
      await this.notifyUpdateError(error);
      return false;
    }
  }

  /**
   * Exécute la mise à jour avec système de retry
   */
  private async executeUpdateWithRetry(): Promise<boolean> {
    const config = await this.getConfig();
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        console.log(`🔄 Tentative de mise à jour ${attempt}/${config.maxRetries}`);
        
        // Démarrer la mise à jour automatique
        await autoUpdateEventsService.startAutoUpdate();
        
        return true;
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`⚠️ Tentative ${attempt} échouée:`, error);
        
        if (attempt < config.maxRetries) {
          // Attendre avant le prochain essai (backoff exponentiel)
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s...
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error('Toutes les tentatives ont échoué');
  }

  /**
   * Configuration du planificateur
   */
  async updateConfig(newConfig: Partial<typeof this.DEFAULT_CONFIG>): Promise<void> {
    try {
      const currentConfig = await this.getConfig();
      const updatedConfig = { ...currentConfig, ...newConfig };
      
      await AsyncStorage.setItem(
        this.SCHEDULER_CONFIG_KEY, 
        JSON.stringify(updatedConfig)
      );
      
      console.log('⚙️ Configuration mise à jour:', updatedConfig);
      
      // Redémarrer si nécessaire
      if (this.isRunning) {
        await this.stopScheduler();
        if (updatedConfig.enabled) {
          await this.startScheduler();
        }
      }
    } catch (error) {
      console.error('❌ Erreur mise à jour configuration:', error);
    }
  }

  /**
   * Récupère la configuration actuelle
   */
  async getConfig(): Promise<typeof this.DEFAULT_CONFIG> {
    try {
      const stored = await AsyncStorage.getItem(this.SCHEDULER_CONFIG_KEY);
      return stored ? { ...this.DEFAULT_CONFIG, ...JSON.parse(stored) } : this.DEFAULT_CONFIG;
    } catch (error) {
      console.error('❌ Erreur lecture configuration:', error);
      return this.DEFAULT_CONFIG;
    }
  }

  /**
   * Statistiques du planificateur
   */
  async getStatus(): Promise<{
    isRunning: boolean;
    nextUpdateIn: string;
    lastRun: string;
    config: typeof this.DEFAULT_CONFIG;
  }> {
    const config = await this.getConfig();
    const now = Date.now();
    
    let nextUpdateIn = 'Désactivé';
    if (config.enabled && this.isRunning) {
      const nextRun = config.lastRun + (config.intervalHours * 60 * 60 * 1000);
      const timeToNext = nextRun - now;
      
      if (timeToNext > 0) {
        const hours = Math.floor(timeToNext / (60 * 60 * 1000));
        const minutes = Math.floor((timeToNext % (60 * 60 * 1000)) / (60 * 1000));
        nextUpdateIn = `${hours}h ${minutes}m`;
      } else {
        nextUpdateIn = 'Maintenant';
      }
    }
    
    return {
      isRunning: this.isRunning,
      nextUpdateIn,
      lastRun: config.lastRun ? new Date(config.lastRun).toLocaleString() : 'Jamais',
      config
    };
  }

  /**
   * Méthodes privées
   */
  private async updateLastRunTimestamp(): Promise<void> {
    const config = await this.getConfig();
    config.lastRun = Date.now();
    await AsyncStorage.setItem(this.SCHEDULER_CONFIG_KEY, JSON.stringify(config));
  }

  private async notifyUpdateCompletion(): Promise<void> {
    const config = await this.getConfig();
    
    if (config.notifyOnUpdate) {
      // Récupérer les statistiques pour la notification
      const stats = await eventsDatabaseService.getStatistics();
      
      console.log('🔔 Notification: Mise à jour terminée');
      console.log(`📊 ${stats.totalEvents} événements dans la base`);
      
      // Ici on pourrait envoyer une vraie notification push
      // ou mettre à jour un indicateur dans l'UI
    }
  }

  private async notifyUpdateError(error: any): Promise<void> {
    console.error('🚨 Notification d\'erreur:', error.message || error);
    
    // Ici on pourrait :
    // - Logger l'erreur dans un service externe
    // - Envoyer une notification d'erreur à l'équipe
    // - Augmenter l'intervalle de retry en cas d'erreurs répétées
  }
}

export const autoUpdateScheduler = new AutoUpdateScheduler();
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { logger } from '../utils/logger';

/**
 * Store Zustand pour l'état global de l'application
 * Remplace les useState dans les composants principaux
 * Gère les préférences, thème, navigation, états globaux
 */

interface AppPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'fr' | 'en';
  units: 'metric' | 'imperial';
  notifications: boolean;
  locationTracking: boolean;
  backgroundTracking: boolean;
}

interface AppState {
  // App status
  isInitialized: boolean;
  isLoading: boolean;
  isOnline: boolean;
  
  // User preferences
  preferences: AppPreferences;
  
  // Navigation state
  currentScreen: string;
  previousScreen: string | null;
  
  // Global flags
  hasSeenOnboarding: boolean;
  hasLocationPermission: boolean;
  hasCameraPermission: boolean;
  
  // Performance tracking
  renderCount: number;
  lastRenderTime: number;
  
  // Error tracking
  globalError: string | null;
  errorHistory: Array<{
    error: string;
    timestamp: number;
    screen: string;
  }>;
  
  // Actions - App status
  setInitialized: (initialized: boolean) => void;
  setLoading: (loading: boolean) => void;
  setOnline: (online: boolean) => void;
  
  // Actions - Preferences
  updatePreferences: (updates: Partial<AppPreferences>) => void;
  resetPreferences: () => void;
  
  // Actions - Navigation
  setCurrentScreen: (screen: string) => void;
  goBack: () => void;
  
  // Actions - Permissions
  setLocationPermission: (granted: boolean) => void;
  setCameraPermission: (granted: boolean) => void;
  
  // Actions - Onboarding
  completeOnboarding: () => void;
  
  // Actions - Performance
  incrementRenderCount: () => void;
  resetPerformanceMetrics: () => void;
  
  // Actions - Error handling
  setGlobalError: (error: string | null) => void;
  addErrorToHistory: (error: string, screen: string) => void;
  clearErrorHistory: () => void;
  
  // Utilities
  getTheme: () => 'light' | 'dark';
  isMetricUnits: () => boolean;
  reset: () => void;
}

const defaultPreferences: AppPreferences = {
  theme: 'auto',
  language: 'fr',
  units: 'metric',
  notifications: true,
  locationTracking: true,
  backgroundTracking: false
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      isInitialized: false,
      isLoading: false,
      isOnline: true,
      preferences: defaultPreferences,
      currentScreen: 'Home',
      previousScreen: null,
      hasSeenOnboarding: false,
      hasLocationPermission: false,
      hasCameraPermission: false,
      renderCount: 0,
      lastRenderTime: Date.now(),
      globalError: null,
      errorHistory: [],
      
      // App status actions
      setInitialized: (initialized) => {
        logger.info('App initialized', { initialized }, 'APP');
        set({ isInitialized: initialized });
      },
      
      setLoading: (loading) => {
        set({ isLoading: loading });
      },
      
      setOnline: (online) => {
        if (get().isOnline !== online) {
          logger.info('Connection status changed', { online }, 'APP');
          set({ isOnline: online });
        }
      },
      
      // Preferences actions
      updatePreferences: (updates) => {
        set(state => ({
          preferences: { ...state.preferences, ...updates }
        }));
        logger.info('Préférences mises à jour', updates, 'APP');
      },
      
      resetPreferences: () => {
        logger.info('Préférences reset', undefined, 'APP');
        set({ preferences: defaultPreferences });
      },
      
      // Navigation actions
      setCurrentScreen: (screen) => {
        const state = get();
        if (state.currentScreen !== screen) {
          logger.debug('Navigation', { from: state.currentScreen, to: screen }, 'APP');
          set({
            previousScreen: state.currentScreen,
            currentScreen: screen
          });
        }
      },
      
      goBack: () => {
        const state = get();
        if (state.previousScreen) {
          logger.debug('Navigation back', { to: state.previousScreen }, 'APP');
          set({
            currentScreen: state.previousScreen,
            previousScreen: null
          });
        }
      },
      
      // Permissions actions
      setLocationPermission: (granted) => {
        logger.info('Permission localisation', { granted }, 'APP');
        set({ hasLocationPermission: granted });
      },
      
      setCameraPermission: (granted) => {
        logger.info('Permission caméra', { granted }, 'APP');
        set({ hasCameraPermission: granted });
      },
      
      // Onboarding actions
      completeOnboarding: () => {
        logger.info('Onboarding terminé', undefined, 'APP');
        set({ hasSeenOnboarding: true });
      },
      
      // Performance actions
      incrementRenderCount: () => {
        set(state => ({
          renderCount: state.renderCount + 1,
          lastRenderTime: Date.now()
        }));
      },
      
      resetPerformanceMetrics: () => {
        logger.debug('Métriques performance reset', undefined, 'APP');
        set({
          renderCount: 0,
          lastRenderTime: Date.now()
        });
      },
      
      // Error handling actions
      setGlobalError: (error) => {
        if (error) {
          logger.error('Erreur globale', error, 'APP');
        } else {
          logger.debug('Erreur globale effacée', undefined, 'APP');
        }
        set({ globalError: error });
      },
      
      addErrorToHistory: (error, screen) => {
        set(state => {
          const newError = {
            error,
            timestamp: Date.now(),
            screen
          };
          
          const newHistory = [newError, ...state.errorHistory];
          // Garder seulement les 50 dernières erreurs
          if (newHistory.length > 50) {
            newHistory.splice(50);
          }
          
          return { errorHistory: newHistory };
        });
        logger.error('Erreur ajoutée à l\'historique', { error, screen }, 'APP');
      },
      
      clearErrorHistory: () => {
        logger.debug('Historique erreurs effacé', undefined, 'APP');
        set({ errorHistory: [] });
      },
      
      // Utilities
      getTheme: () => {
        const { preferences } = get();
        if (preferences.theme === 'auto') {
          // En production, on utiliserait Appearance.getColorScheme()
          return 'light';
        }
        return preferences.theme;
      },
      
      isMetricUnits: () => {
        return get().preferences.units === 'metric';
      },
      
      reset: () => {
        logger.info('Store app reset', undefined, 'APP');
        set({
          isInitialized: false,
          isLoading: false,
          isOnline: true,
          preferences: defaultPreferences,
          currentScreen: 'Home',
          previousScreen: null,
          hasSeenOnboarding: false,
          hasLocationPermission: false,
          hasCameraPermission: false,
          renderCount: 0,
          lastRenderTime: Date.now(),
          globalError: null,
          errorHistory: []
        });
      }
    }),
    {
      name: 'app-store',
      // Persister les données importantes
      partialize: (state) => ({
        preferences: state.preferences,
        hasSeenOnboarding: state.hasSeenOnboarding,
        hasLocationPermission: state.hasLocationPermission,
        hasCameraPermission: state.hasCameraPermission
      })
    }
  )
);

// Hooks utilitaires spécialisés
export const useAppStatus = () => {
  const {
    isInitialized,
    isLoading,
    isOnline,
    setInitialized,
    setLoading,
    setOnline
  } = useAppStore();

  return {
    isInitialized,
    isLoading,
    isOnline,
    setInitialized,
    setLoading,
    setOnline
  };
};

export const useAppPreferences = () => {
  const {
    preferences,
    updatePreferences,
    resetPreferences,
    getTheme,
    isMetricUnits
  } = useAppStore();

  return {
    preferences,
    updatePreferences,
    resetPreferences,
    theme: getTheme(),
    isMetric: isMetricUnits()
  };
};

export const useAppNavigation = () => {
  const {
    currentScreen,
    previousScreen,
    setCurrentScreen,
    goBack
  } = useAppStore();

  return {
    currentScreen,
    previousScreen,
    navigate: setCurrentScreen,
    goBack
  };
};

export const useAppPermissions = () => {
  const {
    hasLocationPermission,
    hasCameraPermission,
    setLocationPermission,
    setCameraPermission
  } = useAppStore();

  return {
    hasLocationPermission,
    hasCameraPermission,
    setLocationPermission,
    setCameraPermission
  };
};

export const useAppErrors = () => {
  const {
    globalError,
    errorHistory,
    setGlobalError,
    addErrorToHistory,
    clearErrorHistory
  } = useAppStore();

  return {
    globalError,
    errorHistory,
    setGlobalError,
    addError: addErrorToHistory,
    clearErrorHistory
  };
};

export const useAppPerformance = () => {
  const {
    renderCount,
    lastRenderTime,
    incrementRenderCount,
    resetPerformanceMetrics
  } = useAppStore();

  return {
    renderCount,
    lastRenderTime,
    incrementRenderCount,
    resetPerformanceMetrics
  };
};
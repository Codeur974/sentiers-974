import { create } from 'zustand';
import { logger } from '../utils/logger';

/**
 * Store Zustand pour gérer l'état de l'interface utilisateur
 * Centralise la gestion des modales, sections ouvertes, filtres, etc.
 * SANS impact sur la logique existante
 */

interface ModalState {
  isOpen: boolean;
  data?: any;
}

interface UIState {
  // Modales
  photoModal: ModalState;
  addPhotoModal: ModalState;
  deleteConfirmModal: ModalState;
  
  // Sections expandables
  expandedSections: Set<string>;
  
  // Filtres et recherche
  sportsFilter: string | null;
  searchQuery: string;
  
  // États de chargement
  loadingStates: Record<string, boolean>;
  
  // Erreurs
  errors: Record<string, string | null>;
  
  // Actions
  // Modales
  openPhotoModal: (data?: any) => void;
  closePhotoModal: () => void;
  
  openAddPhotoModal: (data?: any) => void;
  closeAddPhotoModal: () => void;
  
  openDeleteConfirmModal: (data?: any) => void;
  closeDeleteConfirmModal: () => void;
  
  // Sections
  toggleSection: (sectionId: string) => void;
  closeAllSections: () => void;
  expandSection: (sectionId: string) => void;
  collapseSection: (sectionId: string) => void;
  
  // Filtres
  setSportsFilter: (filter: string | null) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;
  
  // États de chargement
  setLoading: (key: string, loading: boolean) => void;
  clearLoading: () => void;
  
  // Erreurs
  setError: (key: string, error: string | null) => void;
  clearError: (key: string) => void;
  clearAllErrors: () => void;
  
  // Utilitaires
  reset: () => void;
}

const initialState = {
  photoModal: { isOpen: false },
  addPhotoModal: { isOpen: false },
  deleteConfirmModal: { isOpen: false },
  expandedSections: new Set<string>(),
  sportsFilter: null,
  searchQuery: '',
  loadingStates: {},
  errors: {}
};

export const useUIStore = create<UIState>((set, get) => ({
  ...initialState,

  // Actions pour modales
  openPhotoModal: (data) => {
    logger.debug('Opening photo modal', data, 'UI');
    set(state => ({
      photoModal: { isOpen: true, data }
    }));
  },

  closePhotoModal: () => {
    logger.debug('Closing photo modal', undefined, 'UI');
    set(state => ({
      photoModal: { isOpen: false, data: undefined }
    }));
  },

  openAddPhotoModal: (data) => {
    logger.debug('Opening add photo modal', data, 'UI');
    set(state => ({
      addPhotoModal: { isOpen: true, data }
    }));
  },

  closeAddPhotoModal: () => {
    logger.debug('Closing add photo modal', undefined, 'UI');
    set(state => ({
      addPhotoModal: { isOpen: false, data: undefined }
    }));
  },

  openDeleteConfirmModal: (data) => {
    logger.debug('Opening delete confirm modal', data, 'UI');
    set(state => ({
      deleteConfirmModal: { isOpen: true, data }
    }));
  },

  closeDeleteConfirmModal: () => {
    logger.debug('Closing delete confirm modal', undefined, 'UI');
    set(state => ({
      deleteConfirmModal: { isOpen: false, data: undefined }
    }));
  },

  // Actions pour sections
  toggleSection: (sectionId) => {
    logger.debug(`Toggling section: ${sectionId}`, undefined, 'UI');
    set(state => {
      const newExpandedSections = new Set(state.expandedSections);
      if (newExpandedSections.has(sectionId)) {
        newExpandedSections.delete(sectionId);
      } else {
        newExpandedSections.add(sectionId);
      }
      return { expandedSections: newExpandedSections };
    });
  },

  closeAllSections: () => {
    logger.debug('Closing all sections', undefined, 'UI');
    set(state => ({
      expandedSections: new Set()
    }));
  },

  expandSection: (sectionId) => {
    logger.debug(`Expanding section: ${sectionId}`, undefined, 'UI');
    set(state => ({
      expandedSections: new Set([...state.expandedSections, sectionId])
    }));
  },

  collapseSection: (sectionId) => {
    logger.debug(`Collapsing section: ${sectionId}`, undefined, 'UI');
    set(state => {
      const newExpandedSections = new Set(state.expandedSections);
      newExpandedSections.delete(sectionId);
      return { expandedSections: newExpandedSections };
    });
  },

  // Actions pour filtres
  setSportsFilter: (filter) => {
    logger.debug(`Setting sports filter: ${filter}`, undefined, 'UI');
    set(state => ({
      sportsFilter: filter
    }));
  },

  setSearchQuery: (query) => {
    logger.debug(`Setting search query: ${query}`, undefined, 'UI');
    set(state => ({
      searchQuery: query
    }));
  },

  clearFilters: () => {
    logger.debug('Clearing all filters', undefined, 'UI');
    set(state => ({
      sportsFilter: null,
      searchQuery: ''
    }));
  },

  // Actions pour états de chargement
  setLoading: (key, loading) => {
    logger.debug(`Setting loading state for ${key}: ${loading}`, undefined, 'UI');
    set(state => ({
      loadingStates: {
        ...state.loadingStates,
        [key]: loading
      }
    }));
  },

  clearLoading: () => {
    logger.debug('Clearing all loading states', undefined, 'UI');
    set(state => ({
      loadingStates: {}
    }));
  },

  // Actions pour erreurs
  setError: (key, error) => {
    if (error) {
      logger.error(`Setting error for ${key}:`, error, 'UI');
    } else {
      logger.debug(`Clearing error for ${key}`, undefined, 'UI');
    }
    set(state => ({
      errors: {
        ...state.errors,
        [key]: error
      }
    }));
  },

  clearError: (key) => {
    logger.debug(`Clearing error for ${key}`, undefined, 'UI');
    set(state => {
      const newErrors = { ...state.errors };
      delete newErrors[key];
      return { errors: newErrors };
    });
  },

  clearAllErrors: () => {
    logger.debug('Clearing all errors', undefined, 'UI');
    set(state => ({
      errors: {}
    }));
  },

  // Reset complet
  reset: () => {
    logger.debug('Resetting UI store', undefined, 'UI');
    set(initialState);
  }
}));

// Hooks utilitaires pour l'usage spécifique
export const useModals = () => {
  const {
    photoModal,
    addPhotoModal,
    deleteConfirmModal,
    openPhotoModal,
    closePhotoModal,
    openAddPhotoModal,
    closeAddPhotoModal,
    openDeleteConfirmModal,
    closeDeleteConfirmModal
  } = useUIStore();

  return {
    photoModal,
    addPhotoModal,
    deleteConfirmModal,
    openPhotoModal,
    closePhotoModal,
    openAddPhotoModal,
    closeAddPhotoModal,
    openDeleteConfirmModal,
    closeDeleteConfirmModal
  };
};

export const useSections = () => {
  const {
    expandedSections,
    toggleSection,
    closeAllSections,
    expandSection,
    collapseSection
  } = useUIStore();

  const isSectionExpanded = (sectionId: string) => expandedSections.has(sectionId);

  return {
    expandedSections,
    toggleSection,
    closeAllSections,
    expandSection,
    collapseSection,
    isSectionExpanded
  };
};

export const useLoadingStates = () => {
  const {
    loadingStates,
    setLoading,
    clearLoading
  } = useUIStore();

  const isLoading = (key: string) => loadingStates[key] || false;

  return {
    loadingStates,
    setLoading,
    clearLoading,
    isLoading
  };
};

export const useErrorStates = () => {
  const {
    errors,
    setError,
    clearError,
    clearAllErrors
  } = useUIStore();

  const getError = (key: string) => errors[key] || null;
  const hasError = (key: string) => !!errors[key];

  return {
    errors,
    setError,
    clearError,
    clearAllErrors,
    getError,
    hasError
  };
};
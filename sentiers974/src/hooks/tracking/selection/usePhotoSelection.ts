import { create } from 'zustand';
import { logger } from '../../../utils/logger';

interface SelectionState {
  checkboxesVisible: boolean;
  selectedPhotos: string[];
  selectedSessions: string[];

  activateSelectionMode: () => boolean;
  deactivateSelectionMode: () => void;
  togglePhotoSelection: (photoId: string) => void;
  toggleSessionSelection: (sessionId: string) => void;
  selectAllPhotos: (photoIds: string[]) => void;
  selectAllSessions: (sessionIds: string[]) => void;
  deselectAll: () => void;
  getSelectedCount: () => number;
  isPhotoSelected: (photoId: string) => boolean;
  isSessionSelected: (sessionId: string) => boolean;
  areAllPhotosSelected: (photoIds: string[]) => boolean;
  areAllSessionsSelected: (sessionIds: string[]) => boolean;
}

export const usePhotoSelectionStore = create<SelectionState>((set, get) => ({
  checkboxesVisible: false,
  selectedPhotos: [],
  selectedSessions: [],

  activateSelectionMode: () => {
    const state = get();
    if (!state.checkboxesVisible) {
      logger.debug('Activation mode sélection', undefined, 'PhotoSelection');
      set({ checkboxesVisible: true });
      return true;
    }
    return false;
  },

  deactivateSelectionMode: () => {
    logger.debug('Désactivation mode sélection', undefined, 'PhotoSelection');
    set({
      checkboxesVisible: false,
      selectedPhotos: [],
      selectedSessions: []
    });
  },

  togglePhotoSelection: (photoId: string) => {
    const state = get();
    const selectedPhotos = [...state.selectedPhotos];

    if (selectedPhotos.includes(photoId)) {
      const index = selectedPhotos.indexOf(photoId);
      selectedPhotos.splice(index, 1);
      logger.debug('Photo désélectionnée', { photoId }, 'PhotoSelection');
    } else {
      selectedPhotos.push(photoId);
      logger.debug('Photo sélectionnée', { photoId }, 'PhotoSelection');
    }

    set({ selectedPhotos });
  },

  toggleSessionSelection: (sessionId: string) => {
    const state = get();
    const selectedSessions = [...state.selectedSessions];

    if (selectedSessions.includes(sessionId)) {
      const index = selectedSessions.indexOf(sessionId);
      selectedSessions.splice(index, 1);
    } else {
      selectedSessions.push(sessionId);
    }

    set({ selectedSessions });
  },

  selectAllPhotos: (photoIds: string[]) => {
    logger.debug(`Sélection ${photoIds.length} photos`, undefined, 'PhotoSelection');
    set({ selectedPhotos: [...photoIds] });
  },

  selectAllSessions: (sessionIds: string[]) => {
    logger.debug(`Sélection ${sessionIds.length} sessions`, undefined, 'PhotoSelection');
    set({ selectedSessions: [...sessionIds] });
  },

  deselectAll: () => {
    logger.debug('Désélection totale', undefined, 'PhotoSelection');
    set({
      selectedPhotos: [],
      selectedSessions: []
    });
  },

  getSelectedCount: () => {
    const state = get();
    return state.selectedPhotos.length;
  },

  isPhotoSelected: (photoId: string) => {
    const state = get();
    return state.selectedPhotos.includes(photoId);
  },

  isSessionSelected: (sessionId: string) => {
    const state = get();
    return state.selectedSessions.includes(sessionId);
  },

  areAllPhotosSelected: (photoIds: string[]) => {
    const state = get();
    return photoIds.length > 0 && photoIds.every(id => state.selectedPhotos.includes(id));
  },

  areAllSessionsSelected: (sessionIds: string[]) => {
    const state = get();
    return sessionIds.length > 0 && sessionIds.every(id => state.selectedSessions.includes(id));
  },

  // Méthodes pour éviter les conflits entre photos et sessions
  getSelectedPhotosCount: () => {
    const state = get();
    return state.selectedPhotos.length;
  },

  getSelectedSessionsCount: () => {
    const state = get();
    return state.selectedSessions.length;
  },

  hasPhotoSelections: () => {
    const state = get();
    return state.selectedPhotos.length > 0;
  },

  hasSessionSelections: () => {
    const state = get();
    return state.selectedSessions.length > 0;
  }
}));

// Hook personnalisé pour utiliser le store
export const usePhotoSelection = () => {
  const state = usePhotoSelectionStore();

  return {
    checkboxesVisible: state.checkboxesVisible,
    selectedPhotos: state.selectedPhotos,
    selectedSessions: state.selectedSessions,
    activateSelectionMode: state.activateSelectionMode,
    deactivateSelectionMode: state.deactivateSelectionMode,
    togglePhotoSelection: state.togglePhotoSelection,
    toggleSessionSelection: state.toggleSessionSelection,
    selectAllPhotos: state.selectAllPhotos,
    selectAllSessions: state.selectAllSessions,
    deselectAll: state.deselectAll,
    getSelectedCount: state.getSelectedCount,
    isPhotoSelected: state.isPhotoSelected,
    isSessionSelected: state.isSessionSelected,
    areAllPhotosSelected: state.areAllPhotosSelected,
    areAllSessionsSelected: state.areAllSessionsSelected,
  };
};
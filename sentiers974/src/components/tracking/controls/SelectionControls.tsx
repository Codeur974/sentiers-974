import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { usePhotoSelection } from '../../../hooks/tracking/selection/usePhotoSelection';

interface SelectionControlsProps {
  visiblePhotoIds: string[];
  visibleSessionIds: string[];
  onDeleteClick: () => void;
}

export const SelectionControls: React.FC<SelectionControlsProps> = ({
  visiblePhotoIds,
  visibleSessionIds,
  onDeleteClick
}) => {
  const {
    checkboxesVisible,
    selectedPhotos,
    selectedSessions,
    selectAllPhotos,
    selectAllSessions,
    deselectAll,
    deactivateSelectionMode,
    areAllPhotosSelected,
    areAllSessionsSelected
  } = usePhotoSelection();

  // Vérifier si tous les éléments visibles sont sélectionnés
  const allPhotosSelected = visiblePhotoIds.length > 0 && areAllPhotosSelected(visiblePhotoIds);
  const allSessionsSelected = visibleSessionIds.length > 0 && areAllSessionsSelected(visibleSessionIds);

  // Si on a que des photos OU que des sessions, on regarde juste celui qui existe
  // Si on a les deux, il faut que les deux soient sélectionnés
  const allVisibleSelected = (() => {
    if (visiblePhotoIds.length > 0 && visibleSessionIds.length > 0) {
      return allPhotosSelected && allSessionsSelected;
    } else if (visiblePhotoIds.length > 0) {
      return allPhotosSelected;
    } else if (visibleSessionIds.length > 0) {
      return allSessionsSelected;
    }
    return false;
  })();

  // Debug logs (réduits pour éviter le spam)
  if (visiblePhotoIds.length > 0 || visibleSessionIds.length > 0) {
    console.log('🔍 SelectionControls:', {
      photos: `${selectedPhotos.length}/${visiblePhotoIds.length}`,
      sessions: `${selectedSessions.length}/${visibleSessionIds.length}`,
      allSelected: allVisibleSelected
    });
  }

  const handleSelectAll = () => {
    if (allVisibleSelected) {
      console.log('🔍 Désélection totale');
      deselectAll();
    } else {
      console.log('🔍 Sélection totale');
      // Sélectionner les photos visibles s'il y en a
      if (visiblePhotoIds.length > 0) {
        selectAllPhotos(visiblePhotoIds);
      }
      // Sélectionner les sessions visibles s'il y en a
      if (visibleSessionIds.length > 0) {
        selectAllSessions(visibleSessionIds);
      }
    }
  };

  return (
    <View className="mb-3 flex-row justify-between items-center">
      <View className="flex-row items-center">
        {checkboxesVisible && (visiblePhotoIds.length > 0 || visibleSessionIds.length > 0) && (
          <View className="flex-row items-center mr-4">
            <TouchableOpacity onPress={handleSelectAll} className="mr-3" activeOpacity={1}>
              <View className={`w-6 h-6 rounded border-2 items-center justify-center ${
                allVisibleSelected ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-400'
              }`}>
                {allVisibleSelected && (
                  <Text className="text-white text-xs font-bold">✓</Text>
                )}
              </View>
            </TouchableOpacity>
            <Text className="text-gray-700 text-sm">
              Tout ({selectedPhotos.length + selectedSessions.length} sélectionnés)
            </Text>
          </View>
        )}

        {checkboxesVisible && (
          <TouchableOpacity
            onPress={deactivateSelectionMode}
            className="mr-3 px-2 py-1 rounded bg-gray-100 border border-gray-300"
            activeOpacity={1}
          >
            <Text className="text-gray-600 text-xs font-medium">Annuler</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity onPress={onDeleteClick} activeOpacity={1}>
        <Text className="text-red-500 text-lg">🗑️</Text>
      </TouchableOpacity>
    </View>
  );
};
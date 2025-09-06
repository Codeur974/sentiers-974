import React from 'react';
import { Text, TouchableOpacity, View } from "react-native";
import { logger } from '../../utils/logger';

interface TrackingControlsProps {
  status: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onNewSession: () => void;
  onBackToSelection: () => void;
}

/**
 * Version optimisée de TrackingControls avec React.memo
 * Évite les re-renders lors des changements de métriques
 */
const OptimizedTrackingControls = React.memo(function TrackingControls({
  status,
  onStart,
  onPause,
  onResume,
  onStop,
  onNewSession,
  onBackToSelection,
}: TrackingControlsProps) {
  logger.debug('Render TrackingControls', { status }, 'PERF');

  const getStatusColor = () => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'stopped': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'running': return 'En cours';
      case 'paused': return 'En pause';
      case 'stopped': return 'Arrêté';
      default: return 'Prêt';
    }
  };

  const renderMainButton = () => {
    switch (status) {
      case 'idle':
        return (
          <TouchableOpacity
            className="flex-1 bg-green-500 py-4 px-6 rounded-xl mr-2"
            onPress={onStart}
          >
            <Text className="text-white text-center font-bold text-lg">
              ▶️ Démarrer
            </Text>
          </TouchableOpacity>
        );
      
      case 'running':
        return (
          <TouchableOpacity
            className="flex-1 bg-yellow-500 py-4 px-6 rounded-xl mr-2"
            onPress={onPause}
          >
            <Text className="text-white text-center font-bold text-lg">
              ⏸️ Pause
            </Text>
          </TouchableOpacity>
        );
      
      case 'paused':
        return (
          <>
            <TouchableOpacity
              className="flex-1 bg-green-500 py-4 px-6 rounded-xl mr-2"
              onPress={onResume}
            >
              <Text className="text-white text-center font-bold text-lg">
                ▶️ Reprendre
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-red-500 py-4 px-6 rounded-xl ml-2"
              onPress={onStop}
            >
              <Text className="text-white text-center font-bold text-lg">
                ⏹️ Arrêter
              </Text>
            </TouchableOpacity>
          </>
        );
      
      case 'stopped':
        return (
          <TouchableOpacity
            className="flex-1 bg-blue-500 py-4 px-6 rounded-xl mr-2"
            onPress={onNewSession}
          >
            <Text className="text-white text-center font-bold text-lg">
              🔄 Nouvelle session
            </Text>
          </TouchableOpacity>
        );
      
      default:
        return null;
    }
  };

  return (
    <View className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-4">
      {/* Status indicator */}
      <View className="flex-row items-center justify-center mb-4">
        <View className={`w-3 h-3 rounded-full mr-2 ${getStatusColor()}`} />
        <Text className="font-semibold text-gray-700">
          {getStatusText()}
        </Text>
      </View>

      {/* Main controls */}
      <View className="flex-row">
        {renderMainButton()}
        
        {/* Back button (always visible) */}
        <TouchableOpacity
          className="bg-gray-500 py-4 px-6 rounded-xl ml-2"
          onPress={onBackToSelection}
        >
          <Text className="text-white text-center font-bold text-lg">
            🔙
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default OptimizedTrackingControls;
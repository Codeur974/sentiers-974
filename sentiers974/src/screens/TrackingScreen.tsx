import { useState, useRef } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import Filter, { FilterRef } from "../components/Filter";
import Layout from "../components/Layout";
import EnhancedMapView from "../components/EnhancedMapView";
import {
  FloatingTrackingControls,
} from "../components/tracking";
import PhotosSection, { PhotosSectionRef } from "../components/tracking/PhotosSection";
import TrackingFooter from "../components/tracking/TrackingFooter";
import { useTrackingLogic } from "../hooks";

export default function TrackingScreen() {
  const [selectedSport, setSelectedSport] = useState<any>(null);
  const [showTrackingFooter, setShowTrackingFooter] = useState(false);
  const trackingLogic = useTrackingLogic(selectedSport);
  const filterRef = useRef<FilterRef>(null);
  const photosSectionRef = useRef<PhotosSectionRef>(null);

  const handleBackToSelection = () => {
    trackingLogic.handleBackToSelection();
    setSelectedSport(null);
  };

  const handleSportSelect = (sport: any) => {
    setSelectedSport(sport);
  };

  const handlePhotosSectionInteraction = () => {
    // Fermer le filtre des sports quand l'utilisateur interagit avec les photos
    filterRef.current?.closeSportsFilter();
  };

  const handleSportFilterInteraction = () => {
    // Fermer les sections photos quand le filtre sport s'ouvre
    photosSectionRef.current?.closeAllSections();
  };

  // Icônes de tracking dans le footer
  const getFooterButtons = () => {
    if (!selectedSport) return null;

    return (
      <View className="flex-row justify-center space-x-4">
        {/* Démarrer/Pause/Reprendre */}
        {trackingLogic.status === "idle" && (
          <TouchableOpacity
            onPress={trackingLogic.handleStartTracking}
            className="bg-green-600 p-3 rounded-full"
          >
            <Text className="text-white text-xl">▶️</Text>
          </TouchableOpacity>
        )}
        
        {trackingLogic.status === "running" && (
          <TouchableOpacity
            onPress={trackingLogic.handlePauseTracking}
            className="bg-orange-600 p-3 rounded-full"
          >
            <Text className="text-white text-xl">⏸️</Text>
          </TouchableOpacity>
        )}
        
        {trackingLogic.status === "paused" && (
          <TouchableOpacity
            onPress={trackingLogic.handleResumeTracking}
            className="bg-blue-600 p-3 rounded-full"
          >
            <Text className="text-white text-xl">▶️</Text>
          </TouchableOpacity>
        )}
        
        {/* Split manuel - affiché seulement en cours */}
        {trackingLogic.status === "running" && (
          <TouchableOpacity
            onPress={trackingLogic.handleManualSplit}
            className="bg-blue-500 p-3 rounded-full"
          >
            <Text className="text-white text-xl">⏱️</Text>
          </TouchableOpacity>
        )}
        
        {/* Stop - affiché quand en cours ou en pause */}
        {(trackingLogic.status === "running" || trackingLogic.status === "paused") && (
          <TouchableOpacity
            onPress={trackingLogic.handleStopTracking}
            className="bg-red-600 p-3 rounded-full"
          >
            <Text className="text-white text-xl">⏹️</Text>
          </TouchableOpacity>
        )}
        
        {/* Nouvelle session - après arrêt */}
        {trackingLogic.status === "stopped" && (
          <>
            <TouchableOpacity
              onPress={trackingLogic.handleNewSession}
              className="bg-green-600 p-3 rounded-full"
            >
              <Text className="text-white text-xl">🔄</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleBackToSelection}
              className="bg-gray-600 p-3 rounded-full"
            >
              <Text className="text-white text-xl">⚽</Text>
            </TouchableOpacity>
          </>
        )}
        
        {/* Toujours présent : retour sélection */}
        {trackingLogic.status === "idle" && (
          <TouchableOpacity
            onPress={handleBackToSelection}
            className="bg-gray-600 p-3 rounded-full"
          >
            <Text className="text-white text-xl">⚽</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1">
      <Layout
        footerButtons={getFooterButtons()}
      >
        {!selectedSport ? (
          <ScrollView className="flex-1 bg-white">
            <View className="p-4">
              <Text className="text-2xl font-bold text-center mb-6 text-gray-800">
                🏃‍♀️ Nouvelle session
              </Text>
              <Filter 
                ref={filterRef} 
                onSportSelect={handleSportSelect}
                onCloseFilter={handleSportFilterInteraction}
              />
              
              {/* Section Photos avec historique */}
              <View className="mt-6">
                <PhotosSection 
                  ref={photosSectionRef}
                  isVisible={true} 
                  onInteraction={handlePhotosSectionInteraction}
                />
              </View>
            </View>
          </ScrollView>
        ) : (
          <View className="flex-1">
            {/* Carte GPS ultra-précise en arrière-plan */}
            <EnhancedMapView
              coords={trackingLogic.coords}
              address={trackingLogic.address}
              isVisible={true}
              onToggle={() => {}}
              trackingPath={trackingLogic.trackingPath}
              isTracking={trackingLogic.status === "running"}
              showControls={true}
            />
            
            {/* Barre d'informations flottante complète */}
            <FloatingTrackingControls
              selectedSport={selectedSport}
              trackingLogic={trackingLogic}
              onBackToSelection={handleBackToSelection}
            />
            
            {/* Footer de tracking pour POI et photos */}
            <TrackingFooter
              trackingLogic={trackingLogic}
              isVisible={showTrackingFooter}
              onToggle={() => setShowTrackingFooter(!showTrackingFooter)}
            />
          </View>
        )}
      </Layout>
    </View>
  );
}
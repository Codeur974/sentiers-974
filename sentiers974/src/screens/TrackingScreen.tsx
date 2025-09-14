import { useState, useRef, useEffect } from "react";
import { ScrollView, Text, TouchableOpacity, View, Modal } from "react-native";
import Layout from "../components/Layout";
import { useRecordingStore } from "../store/useRecordingStore";
import EnhancedMapView from "../components/EnhancedMapView";
import {
  FloatingTrackingControls,
} from "../components/tracking";
import PhotosSection, { PhotosSectionRef } from "../components/tracking/PhotosSection";
import TrackingFooter from "../components/tracking/TrackingFooter";
import { useTrackingLogic } from "../hooks";
import { useNavigation } from "@react-navigation/native";
import Filter, { FilterRef } from "../components/Filter";

export default function TrackingScreen({ route }: any) {
  const [selectedSport, setSelectedSport] = useState<any>(route?.params?.selectedSport || null);
  const [showTrackingFooter, setShowTrackingFooter] = useState(false);
  const [sportFilterVisible, setSportFilterVisible] = useState(false);
  const [showSportModal, setShowSportModal] = useState(false);
  const trackingLogic = useTrackingLogic(selectedSport);
  const photosSectionRef = useRef<PhotosSectionRef>(null);
  const filterRef = useRef<FilterRef>(null);
  const navigation = useNavigation();
  const { setRecording, setPaused, resetRecording, setSelectedSport: setStoreSport } = useRecordingStore();

  // Sauvegarder le sport dans le store quand il change
  useEffect(() => {
    if (selectedSport) {
      setStoreSport(selectedSport);
    }
  }, [selectedSport, setStoreSport]);

  // Détecter les changements de paramètres de route
  useEffect(() => {
    if (route?.params?.selectedSport && route.params.selectedSport !== selectedSport) {
      setSelectedSport(route.params.selectedSport);
    }
  }, [route?.params?.selectedSport]);

  // Synchroniser l'état d'enregistrement avec l'indicateur global
  useEffect(() => {
    const isRecording = trackingLogic.status === "running";
    const isPaused = trackingLogic.status === "paused";
    
    setRecording(isRecording);
    setPaused(isPaused);
    
    // Si arrêt complet, reset tout
    if (trackingLogic.status === "stopped" || trackingLogic.status === "idle") {
      resetRecording();
    }
  }, [trackingLogic.status, setRecording, setPaused, resetRecording]);

  const handleBackToSelection = () => {
    trackingLogic.handleBackToSelection();
    setSelectedSport(null);
    resetRecording(); // Reset complet de l'indicateur
  };

  const handleSportSelect = (sport: any) => {
    setSelectedSport(sport);
    setStoreSport(sport); // Sauvegarder dans le store global
  };

  const handlePhotosSectionInteraction = () => {
    // Interaction avec les photos
  };

  // Icônes de tracking dans le footer
  const getFooterButtons = () => {
    if (!selectedSport) {
      // Mode 1: Afficher les boutons de navigation (tous sauf Suivi)
      return (
        <View className="flex-row justify-around items-center w-full">

          {/* Bouton Événements */}
          <View className="items-center flex-1">
            <TouchableOpacity
              onPress={() => navigation.navigate("Sports")}
              className="w-10 h-10 items-center justify-center mb-1"
            >
              <Text className="text-base">🏃</Text>
            </TouchableOpacity>
            <Text className="text-gray-700 text-xs font-medium">
              Événement
            </Text>
          </View>

          {/* Bouton Sentiers */}
          <View className="items-center flex-1">
            <TouchableOpacity
              onPress={() => navigation.navigate("Sentiers")}
              className="w-10 h-10 items-center justify-center mb-1"
            >
              <Text className="text-base">🥾</Text>
            </TouchableOpacity>
            <Text className="text-gray-700 text-xs font-medium">
              Sentiers
            </Text>
          </View>

          {/* Bouton Enregistrer */}
          <View className="items-center flex-1">
            <TouchableOpacity
              onPress={() => setSportFilterVisible(true)}
              className="w-10 h-10 items-center justify-center mb-1"
            >
              <Text className="text-base">📝</Text>
            </TouchableOpacity>
            <Text className="text-gray-700 text-xs font-medium">
              Enregistrer
            </Text>
          </View>
        </View>
      );
    }

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
        showHomeButton={false}
      >
        {!selectedSport ? (
          <ScrollView className="flex-1 bg-white">
            <View className="p-4">
              {/* Section Photos avec historique */}
              <PhotosSection 
                ref={photosSectionRef}
                isVisible={true} 
                onInteraction={handlePhotosSectionInteraction}
              />
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

            {/* Footer avec Accueil, Suivi, Photos et contrôles tracking */}
            <View className="bg-white px-4 py-4 pb-12 border-t border-gray-300 shadow-lg">
              <View className="flex-row justify-around items-center w-full">
                {/* Bouton Accueil */}
                <View className="items-center flex-1">
                  <TouchableOpacity
                    onPress={() => navigation.navigate("Home")}
                    className="w-10 h-10 items-center justify-center mb-1"
                  >
                    <Text className="text-base">🏠</Text>
                  </TouchableOpacity>
                  <Text className="text-gray-700 text-xs font-medium">
                    Accueil
                  </Text>
                </View>

                {/* Bouton Suivi - retour mode 1 */}
                <View className="items-center flex-1">
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedSport(null);
                      resetRecording();
                    }}
                    className="w-10 h-10 items-center justify-center mb-1"
                  >
                    <Text className="text-base">📊</Text>
                  </TouchableOpacity>
                  <Text className="text-gray-700 text-xs font-medium">
                    Suivi
                  </Text>
                </View>

                {/* Bouton Photos - POI et Photos */}
                <View className="items-center flex-1">
                  <TouchableOpacity
                    onPress={() => setShowTrackingFooter(!showTrackingFooter)}
                    className="w-10 h-10 items-center justify-center mb-1"
                  >
                    <Text className="text-base">📸</Text>
                  </TouchableOpacity>
                  <Text className="text-gray-700 text-xs font-medium">
                    Photos
                  </Text>
                </View>

                {/* Split manuel - visible seulement quand activité en cours */}
                {trackingLogic.status === "running" && (
                  <View className="items-center flex-1">
                    <TouchableOpacity
                      onPress={trackingLogic.handleManualSplit}
                      className="w-10 h-10 items-center justify-center mb-1"
                    >
                      <Text className="text-base">🚩</Text>
                    </TouchableOpacity>
                    <Text className="text-gray-700 text-xs font-medium">
                      Split
                    </Text>
                  </View>
                )}

                {/* Contrôle principal de tracking */}
                <View className="items-center flex-1">
                  {trackingLogic.status === "idle" && (
                    <TouchableOpacity
                      onPress={trackingLogic.handleStartTracking}
                      className="w-10 h-10 items-center justify-center mb-1"
                    >
                      <Text className="text-base">▶️</Text>
                    </TouchableOpacity>
                  )}

                  {trackingLogic.status === "running" && (
                    <TouchableOpacity
                      onPress={trackingLogic.handlePauseTracking}
                      className="w-10 h-10 items-center justify-center mb-1"
                    >
                      <Text className="text-base">⏸️</Text>
                    </TouchableOpacity>
                  )}

                  {trackingLogic.status === "paused" && (
                    <TouchableOpacity
                      onPress={trackingLogic.handleResumeTracking}
                      className="w-10 h-10 items-center justify-center mb-1"
                    >
                      <Text className="text-base">▶️</Text>
                    </TouchableOpacity>
                  )}

                  {trackingLogic.status === "stopped" && (
                    <TouchableOpacity
                      onPress={trackingLogic.handleNewSession}
                      className="w-10 h-10 items-center justify-center mb-1"
                    >
                      <Text className="text-base">🔄</Text>
                    </TouchableOpacity>
                  )}

                  <Text className="text-gray-700 text-xs font-medium">
                    {trackingLogic.status === "idle" ? "Démarrer" :
                     trackingLogic.status === "running" ? "Pause" :
                     trackingLogic.status === "paused" ? "Reprendre" :
                     trackingLogic.status === "stopped" ? "Nouveau" : "Tracking"}
                  </Text>
                </View>

                {/* Bouton Stop/Retour */}
                <View className="items-center flex-1">
                  {(trackingLogic.status === "running" || trackingLogic.status === "paused") && (
                    <TouchableOpacity
                      onPress={trackingLogic.handleStopTracking}
                      className="w-10 h-10 items-center justify-center mb-1"
                    >
                      <Text className="text-lg text-red-500">■</Text>
                    </TouchableOpacity>
                  )}

                  {(trackingLogic.status === "idle" || trackingLogic.status === "stopped") && (
                    <TouchableOpacity
                      onPress={() => setShowSportModal(true)}
                      className="w-10 h-10 items-center justify-center mb-1"
                    >
                      <Text className="text-base">🔄</Text>
                    </TouchableOpacity>
                  )}

                  <Text className="text-gray-700 text-xs font-medium">
                    {(trackingLogic.status === "running" || trackingLogic.status === "paused") ? "Arrêter" : "Changer"}
                  </Text>
                </View>
              </View>
            </View>

          </View>
        )}

        {/* Modal pour changer de sport depuis le mode 2 */}
        <Modal
          visible={showSportModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowSportModal(false)}
        >
          <View className="flex-1 justify-end bg-black/50">
            <View className="bg-white rounded-t-3xl max-h-128">
              <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
                <Text className="text-xl font-bold">Changer de sport</Text>
                <TouchableOpacity
                  onPress={() => setShowSportModal(false)}
                  className="p-2"
                >
                  <Text className="text-lg">✕</Text>
                </TouchableOpacity>
              </View>
              <Filter
                ref={filterRef}
                onSportSelect={(sport) => {
                  setShowSportModal(false);
                  setSelectedSport(sport);
                  setStoreSport(sport);
                }}
                onCloseFilter={() => setShowSportModal(false)}
                autoOpen={true}
              />
            </View>
          </View>
        </Modal>
      </Layout>
    </View>
  );
}
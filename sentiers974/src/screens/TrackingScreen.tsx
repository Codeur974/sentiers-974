import { useState, useRef, useEffect } from "react";
import { ScrollView, Text, TouchableOpacity, View, Modal } from "react-native";
import Layout from "../components/ui/Layout";
import { useRecordingStore } from "../store/useRecordingStore";
import EnhancedMapView from "../components/map/EnhancedMapView";
import FooterNavigation from "../components/ui/FooterNavigation";
import {
  FloatingTrackingControls,
} from "../components/tracking";
import PhotosSection, { PhotosSectionRef } from "../components/tracking/PhotosSection";
import TrackingFooter from "../components/tracking/TrackingFooter";
import { useTrackingLogic } from "../hooks";
import { useNavigation } from "@react-navigation/native";
import Filter, { FilterRef } from "../components/ui/Filter";
import CreatePostModal from "../components/social/CreatePostModal";
import { SocialPhoto } from "../types/social";
import { useSocialStore } from "../store/useSocialStore";
import { useAuth } from "../contexts/AuthContext";

export default function TrackingScreen({ route }: any) {
  const { isAuthenticated } = useAuth();
  const [selectedSport, setSelectedSport] = useState<any>(route?.params?.selectedSport || null);
  const [showTrackingFooter, setShowTrackingFooter] = useState(false);
  const [sportFilterVisible, setSportFilterVisible] = useState(false);
  const [showSportModal, setShowSportModal] = useState(false);
  const {
    createPost,
    updatePost,
    createPostModalVisible,
    showCreatePostModal,
    hideCreatePostModal,
    editingPost,
    setEditingPost
  } = useSocialStore();
  const [selectedPhotosForPost, setSelectedPhotosForPost] = useState<SocialPhoto[]>([]);
  const trackingLogic = useTrackingLogic(selectedSport);
  const photosSectionRef = useRef<PhotosSectionRef>(null);
  const filterRef = useRef<FilterRef>(null);
  const navigation = useNavigation();
  const { setRecording, setPaused, resetRecording, setSelectedSport: setStoreSport } = useRecordingStore();

  const [showTrackingUI, setShowTrackingUI] = useState(!!selectedSport);
  const [stayOnSuivi, setStayOnSuivi] = useState(false);
  const hasOpenedSportSelection = useRef(false);

  useEffect(() => {
    // RÃ©hydratation : rÃ©cupÃ©rer le sport actif, mais ne pas forcer l'affichage tracking si on est en mode Suivi
    if (stayOnSuivi) return;
    if (!selectedSport && trackingLogic.activeSport) {
      setSelectedSport(trackingLogic.activeSport);
      setStoreSport(trackingLogic.activeSport);
    }
  }, [selectedSport, trackingLogic.activeSport, setStoreSport, stayOnSuivi]);

  // Si un sport est sÃ©lectionnÃ© manuellement (ou via la modale), forcer l'affichage du tracking
  useEffect(() => {
    if (stayOnSuivi) return;
    if (selectedSport && !showTrackingUI) {
      setShowTrackingUI(true);
    }
  }, [selectedSport, showTrackingUI, stayOnSuivi]);

  // Mettre Ã  jour le header selon l'Ã©tat actuel (sport choisi ou non)
  useEffect(() => {
    const enSession = !!selectedSport && !stayOnSuivi;
    navigation.setOptions({
      title: enSession ? "Session en cours" : "Mon Suivi",
    } as never);
  }, [navigation, selectedSport, stayOnSuivi]);

  // Sauvegarder le sport dans le store quand il change
  useEffect(() => {
    if (selectedSport) {
      setStoreSport(selectedSport);
    }
  }, [selectedSport, setStoreSport]);

  // DÃ©tecter les changements de paramÃ¨tres de route
  useEffect(() => {
    if (route?.params?.selectedSport && route.params.selectedSport !== selectedSport) {
      setSelectedSport(route.params.selectedSport);
    }
    // Ouvrir automatiquement la sÃ©lection de sport si demandÃ© (une seule fois)
    if (route?.params?.openSportSelection && !hasOpenedSportSelection.current) {
      setSportFilterVisible(true);
      hasOpenedSportSelection.current = true;
    }
    // Si showSuiviMode est passé, gérer l'affichage
    if (route?.params?.showSuiviMode === true) {
      // Mode Suivi demandé explicitement
      setStayOnSuivi(true);
      setShowTrackingUI(false);
    } else if (route?.params?.showSuiviMode === false && trackingLogic.activeSport) {
      // Mode Tracking demandé explicitement (depuis RecordingIndicator)
      setStayOnSuivi(false);
      setShowTrackingUI(true);
    }
  }, [route?.params?.selectedSport, route?.params?.openSportSelection, route?.params?.showSuiviMode, trackingLogic.activeSport]);

  // Synchroniser l'Ã©tat d'enregistrement avec l'indicateur global
  useEffect(() => {
    const isRecording = trackingLogic.status === "running";
    const isPaused = trackingLogic.status === "paused";

    setRecording(isRecording);
    setPaused(isPaused);

    // Si arrÃªt complet, reset tout
    if (trackingLogic.status === "stopped" || trackingLogic.status === "idle") {
      resetRecording();
      // Fermer aussi la fenÃªtre de capture des moments quand la session s'arrÃªte
      setShowTrackingFooter(false);
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

  // Fonction appelÃ©e depuis PhotosSection pour crÃ©er un post avec photos sÃ©lectionnÃ©es
  const handleCreatePostFromPhotos = (photos: any[]) => {
    console.log('ðŸ“± TrackingScreen: CrÃ©ation post avec', photos.length, 'photos');

    // Convertir les PhotoItem vers SocialPhoto format
    const socialPhotos: SocialPhoto[] = photos.map((photo, index) => ({
      id: `tracking_${photo.id}_${Date.now()}_${index}`,
      uri: photo.uri,
      caption: photo.note || photo.title || ''
    }));

    setSelectedPhotosForPost(socialPhotos);
    showCreatePostModal();
  };

  // GÃ©rer la soumission du post depuis le modal
  const handleSubmitPost = (postData: any) => {
    if (editingPost) {
      updatePost(editingPost.id, postData);
    } else {
      createPost(postData);
    }
    setSelectedPhotosForPost([]);
  };

  const handlePhotosSectionInteraction = () => {
    // Interaction avec les photos
  };

  // IcÃ´nes de tracking dans le footer
  const getFooterButtons = () => {
    if (!selectedSport) {
      // Mode 1: Afficher les boutons de navigation (tous sauf Suivi)
      return (
        <View className="flex-row justify-around items-center w-full">

          {/* Bouton Accueil */}
          <View className="items-center flex-1">
            <TouchableOpacity
              onPress={() => navigation.navigate("Home")}
              className="w-10 h-10 items-center justify-center mb-1"
              activeOpacity={1}
            >
              <Text className="text-base">ðŸ </Text>
            </TouchableOpacity>
            <Text className="text-gray-700 text-xs font-medium">
              Accueil
            </Text>
          </View>

          {/* Bouton Ã‰vÃ©nements */}
          <View className="items-center flex-1">
            <TouchableOpacity
              onPress={() => navigation.navigate("Sports")}
              className="w-10 h-10 items-center justify-center mb-1"
              activeOpacity={1}
            >
              <Text className="text-base">ðŸƒ</Text>
            </TouchableOpacity>
            <Text className="text-gray-700 text-xs font-medium">
              Ã‰vÃ©nement
            </Text>
          </View>

          {/* Bouton Sentiers */}
          <View className="items-center flex-1">
            <TouchableOpacity
              onPress={() => navigation.navigate("Sentiers")}
              className="w-10 h-10 items-center justify-center mb-1"
              activeOpacity={1}
            >
              <Text className="text-base">ðŸ¥¾</Text>
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
              activeOpacity={1}
            >
              <Text className="text-base">ðŸ“</Text>
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
        {/* DÃ©marrer/Pause/Reprendre */}
        {trackingLogic.status === "idle" && (
          <TouchableOpacity
            onPress={trackingLogic.handleStartTracking}
            className="bg-green-600 p-3 rounded-full"
            activeOpacity={1}
          >
            <Text className="text-white text-xl">â–¶ï¸</Text>
          </TouchableOpacity>
        )}
        
        {trackingLogic.status === "running" && (
          <TouchableOpacity
            onPress={trackingLogic.handlePauseTracking}
            className="bg-orange-600 p-3 rounded-full"
            activeOpacity={1}
          >
            <Text className="text-white text-xl">â¸ï¸</Text>
          </TouchableOpacity>
        )}
        
        {trackingLogic.status === "paused" && (
          <TouchableOpacity
            onPress={trackingLogic.handleResumeTracking}
            className="bg-blue-600 p-3 rounded-full"
            activeOpacity={1}
          >
            <Text className="text-white text-xl">â–¶ï¸</Text>
          </TouchableOpacity>
        )}
        
        {/* Split manuel - affichÃ© seulement en cours */}
        {trackingLogic.status === "running" && (
          <TouchableOpacity
            onPress={trackingLogic.handleManualSplit}
            className="bg-blue-500 p-3 rounded-full"
            activeOpacity={1}
          >
            <Text className="text-white text-xl">â±ï¸</Text>
          </TouchableOpacity>
        )}
        
        {/* Stop - affichÃ© quand en cours ou en pause */}
        {(trackingLogic.status === "running" || trackingLogic.status === "paused") && (
          <TouchableOpacity
            onPress={trackingLogic.handleStopTracking}
            className="bg-red-600 p-3 rounded-full"
            activeOpacity={1}
          >
            <Text className="text-white text-xl">â¹ï¸</Text>
          </TouchableOpacity>
        )}
        
        {/* Nouvelle session - aprÃ¨s arrÃªt */}
        {trackingLogic.status === "stopped" && (
          <>
            <TouchableOpacity
              onPress={trackingLogic.handleNewSession}
              className="bg-green-600 p-3 rounded-full"
              activeOpacity={1}
            >
              <Text className="text-white text-xl">ðŸ”„</Text>
            </TouchableOpacity>

            {trackingLogic.handleExportGPX && (
              <TouchableOpacity
                onPress={() => {
                  console.log('ðŸ"¤ Bouton Export GPX cliquÃ©');
                  trackingLogic.handleExportGPX();
                }}
                className="bg-blue-600 p-3 rounded-full"
                activeOpacity={1}
              >
                <Text className="text-white text-xl">ðŸ“¤</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleBackToSelection}
              className="bg-gray-600 p-3 rounded-full"
              activeOpacity={1}
            >
              <Text className="text-white text-xl">âš½</Text>
            </TouchableOpacity>
          </>
        )}
        
        {/* Toujours prÃ©sent : retour sÃ©lection */}
        {trackingLogic.status === "idle" && (
          <TouchableOpacity
            onPress={handleBackToSelection}
            className="bg-gray-600 p-3 rounded-full"
          >
            <Text className="text-white text-xl">âš½</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Si l'utilisateur n'est pas connectÃ©, afficher uniquement le message de connexion
  if (!isAuthenticated) {
    return (
      <View className="flex-1">
        <Layout
          showHomeButton={false}
          footerButtons={<FooterNavigation currentPage="Tracking" />}
        >
          <View className="flex-1 bg-white justify-center items-center p-4">
            <View className="bg-blue-50 rounded-2xl p-8 items-center max-w-md">
              <Text className="text-6xl mb-4">ðŸ”’</Text>
              <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
                Connexion requise
              </Text>
              <Text className="text-gray-600 text-center mb-6">
                Connectez-vous pour accÃ©der Ã  vos sessions de tracking, votre historique et vos photos sportives.
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Profile" as never)}
                className="bg-blue-500 px-8 py-4 rounded-full"
                activeOpacity={1}
              >
                <Text className="text-white font-semibold text-lg">Se connecter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Layout>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Layout
        showHomeButton={false}
        footerButtons={
          !showTrackingUI ? (
            <FooterNavigation
              currentPage="Tracking"
              forceShowTrackingButton={true}
              onEnregistrer={() => setSportFilterVisible(true)}
            />
          ) : null
        }
      >
        {!showTrackingUI ? (
          <ScrollView className="flex-1 bg-white">
            <View className="p-4">
              {trackingLogic.activeSport && (trackingLogic.status === "running" || trackingLogic.status === "paused") && (
                <TouchableOpacity
                  onPress={() => {
                    setStayOnSuivi(false);
                    setShowTrackingUI(true);
                    // Mettre à jour les route params pour que RecordingIndicator détecte le changement
                    navigation.setParams({ showSuiviMode: false } as never);
                  }}
                  className="bg-blue-100 border border-blue-300 rounded-xl p-4 mb-4"
                  activeOpacity={1}
                >
                  <Text className="text-blue-800 font-semibold text-center">
                    Reprendre le tracking en cours
                  </Text>
                </TouchableOpacity>
              )}
              {/* Section Photos avec historique */}
              <PhotosSection
                ref={photosSectionRef}
                isVisible={true}
                onInteraction={handlePhotosSectionInteraction}
                onCreatePost={handleCreatePostFromPhotos}
              />
            </View>
          </ScrollView>
        ) : (
          <View className="flex-1">
            {/* Carte GPS ultra-prÃ©cise en arriÃ¨re-plan */}
            <EnhancedMapView
              coords={trackingLogic.coords}
              address={trackingLogic.address}
              isVisible={true}
              onToggle={() => {}}
              trackingPath={trackingLogic.trackingPath}
              isTracking={trackingLogic.status === "running"}
              showControls={true}
            />
            
            {/* Barre d'informations flottante complÃ¨te */}
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
                    activeOpacity={1}
                  >
                    <Text className="text-base">🏠</Text>
                  </TouchableOpacity>
                  <Text className="text-gray-700 text-xs font-medium">Accueil</Text>
                </View>

                {/* Bouton Suivi */}
                <View className="items-center flex-1">
                  <TouchableOpacity
                    onPress={() => {
                      setShowTrackingUI(false);
                      setStayOnSuivi(true);
                      // Mettre à jour les route params pour que RecordingIndicator détecte le changement
                      navigation.setParams({ showSuiviMode: true } as never);
                    }}
                    className="w-10 h-10 items-center justify-center mb-1"
                    activeOpacity={1}
                  >
                    <Text className="text-base">📊</Text>
                  </TouchableOpacity>
                  <Text className="text-gray-700 text-xs font-medium">Suivi</Text>
                </View>

                {/* Bouton Photos */}
                <View className="items-center flex-1">
                  <TouchableOpacity
                    onPress={() => setShowTrackingFooter(!showTrackingFooter)}
                    className="w-10 h-10 items-center justify-center mb-1"
                    activeOpacity={1}
                  >
                    <Text className="text-base">📸</Text>
                  </TouchableOpacity>
                  <Text className={`text-xs font-medium ${
                    showTrackingFooter && (!trackingLogic.sessionId || trackingLogic.status === "idle")
                      ? "text-orange-500"
                      : "text-gray-700"
                  }`}>
                    Photos
                  </Text>
                </View>

                {/* Split manuel - visible seulement quand activité en cours */}
                {trackingLogic.status === "running" && (
                  <View className="items-center flex-1">
                    <TouchableOpacity
                      onPress={trackingLogic.handleManualSplit}
                      className="w-10 h-10 items-center justify-center mb-1"
                      activeOpacity={1}
                    >
                      <Text className="text-base">🚩</Text>
                    </TouchableOpacity>
                    <Text className="text-gray-700 text-xs font-medium">
                      Split
                    </Text>
                  </View>
                )}

                {/* Export GPX - visible quand session terminée */}
                {trackingLogic.status === "stopped" && (
                  <View className="items-center flex-1">
                    <TouchableOpacity
                      onPress={trackingLogic.handleExportGPX}
                      className="w-10 h-10 items-center justify-center mb-1"
                      activeOpacity={1}
                    >
                      <Text className="text-base">📤</Text>
                    </TouchableOpacity>
                    <Text className="text-gray-700 text-xs font-medium">
                      Export
                    </Text>
                  </View>
                )}

                {/* Contrôle principal de tracking */}
                <View className="items-center flex-1">
                  {trackingLogic.status === "idle" && (
                    <TouchableOpacity
                      onPress={trackingLogic.handleStartTracking}
                      className="w-10 h-10 items-center justify-center mb-1"
                      activeOpacity={1}
                    >
                      <Text className="text-base">▶️</Text>
                    </TouchableOpacity>
                  )}

                  {trackingLogic.status === "running" && (
                    <TouchableOpacity
                      onPress={trackingLogic.handlePauseTracking}
                      className="w-10 h-10 items-center justify-center mb-1"
                      activeOpacity={1}
                    >
                      <Text className="text-base">⏸️</Text>
                    </TouchableOpacity>
                  )}

                  {trackingLogic.status === "paused" && (
                    <TouchableOpacity
                      onPress={trackingLogic.handleResumeTracking}
                      className="w-10 h-10 items-center justify-center mb-1"
                      activeOpacity={1}
                    >
                      <Text className="text-base">▶️</Text>
                    </TouchableOpacity>
                  )}

                  {trackingLogic.status === "stopped" && (
                    <TouchableOpacity
                      onPress={trackingLogic.handleNewSession}
                      className="w-10 h-10 items-center justify-center mb-1"
                      activeOpacity={1}
                    >
                      <Text className="text-base">🆕</Text>
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
                      activeOpacity={1}
                    >
                      <Text className="text-base text-red-600">⏹️</Text>
                    </TouchableOpacity>
                  )}

                  {(trackingLogic.status === "idle" || trackingLogic.status === "stopped") && (
                    <TouchableOpacity
                      onPress={() => setShowSportModal(true)}
                      className="w-10 h-10 items-center justify-center mb-1"
                      activeOpacity={1}
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


            {/* Footer de tracking pour POI et photos */}
            <TrackingFooter
              trackingLogic={trackingLogic}
              isVisible={showTrackingFooter}
              onToggle={() => setShowTrackingFooter(!showTrackingFooter)}
            />

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
                  activeOpacity={1}
                >
                  <Text className="text-lg">âœ•</Text>
                </TouchableOpacity>
              </View>
              <Filter
                ref={filterRef}
                onSportSelect={async (sport) => {
                  setShowSportModal(false);
                  // Reset complet avant de changer de sport
                  await trackingLogic.handleNewSession();
                  setSelectedSport(sport);
                  setStoreSport(sport);
                  navigation.setParams({ showSuiviMode: false } as never);
                }}
                onCloseFilter={() => setShowSportModal(false)}
                autoOpen={true}
                visible={showSportModal}
              />
            </View>
          </View>
        </Modal>

        {/* Modal pour sÃ©lection de sport depuis le bouton Enregistrer */}
        <Modal
          visible={sportFilterVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setSportFilterVisible(false)}
        >
          <View className="flex-1 justify-end bg-black/50">
              <View className="bg-white rounded-t-3xl max-h-128">
              <Filter
                onSportSelect={(sport) => {
                  setSportFilterVisible(false);
                  setSelectedSport(sport);
                  setStoreSport(sport);
                  // Quitter le mode Suivi et afficher le tracking
                  setStayOnSuivi(false);
                  setShowTrackingUI(true);
                  navigation.setParams({ showSuiviMode: false } as never);
                }}
                onCloseFilter={() => setSportFilterVisible(false)}
                autoOpen={true}
                showCloseButton={true}
                visible={sportFilterVisible}
              />
            </View>
            </View>
          </Modal>

        {/* Modal pour crÃ©er un post social depuis les photos */}
        <CreatePostModal
          visible={createPostModalVisible}
          onClose={hideCreatePostModal}
          onSubmit={handleSubmitPost}
          editPost={editingPost || undefined}
          selectedHistoryPhotos={selectedPhotosForPost}
        />
      </Layout>
    </View>
  );
}



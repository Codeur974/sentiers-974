import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import Layout from '../components/Layout';
import FooterNavigation from '../components/FooterNavigation';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import sentiersService, { SentierReel, SentiersService } from '../services/sentiersService';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Sentiers'>;

export default function SentiersScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState<'randonnee' | 'vtt'>('randonnee');
  const [sentiers, setSentiers] = useState<SentierReel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedZoneSpecifique, setSelectedZoneSpecifique] = useState<string | null>(null);

  useEffect(() => {
    loadSentiers();
  }, []);

  const loadSentiers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Chargement des sentiers réels depuis les APIs officielles...');
      const sentiersData = await sentiersService.getAllSentiers();
      setSentiers(sentiersData);
      
      console.log(`✅ ${sentiersData.length} sentiers chargés avec succès`);
    } catch (err) {
      console.error('❌ Erreur lors du chargement des sentiers:', err);
      setError('Impossible de charger les sentiers. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  const footerButtons = (
    <View className="flex-row justify-around items-center w-full">
      {/* Bouton Accueil - en première position */}
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

      {/* Bouton Enregistrer */}
      <View className="items-center flex-1">
        <TouchableOpacity
          onPress={() => navigation.navigate("Tracking")}
          className="w-10 h-10 items-center justify-center mb-1"
        >
          <Text className="text-base">📝</Text>
        </TouchableOpacity>
        <Text className="text-gray-700 text-xs font-medium">
          Enregistrer
        </Text>
      </View>

      {/* Bouton Suivi */}
      <View className="items-center flex-1">
        <TouchableOpacity
          onPress={() => navigation.navigate("Tracking")}
          className="w-10 h-10 items-center justify-center mb-1"
        >
          <Text className="text-base">📊</Text>
        </TouchableOpacity>
        <Text className="text-gray-700 text-xs font-medium">
          Suivi
        </Text>
      </View>
    </View>
  );

  const getDifficultyColor = (difficulte: string) => {
    switch (difficulte) {
      case 'Facile': return 'bg-green-500';
      case 'Modéré': return 'bg-yellow-500';
      case 'Difficile': return 'bg-orange-500';
      case 'Expert': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };


  const getCityFromCoordinates = (coordinates: [number, number]) => {
    const [lng, lat] = coordinates;
    
    // Nord
    if (lat > -20.95) {
      return lng < 55.45 ? 'Saint-Denis' : 'Sainte-Marie';
    }
    
    // Ouest
    if (lng < 55.25) {
      return lat > -21.35 ? 'Saint-Paul' : 'Saint-Leu';
    }
    
    // Est
    if (lng > 55.65) {
      return lat > -21.25 ? 'Saint-Benoît' : 'Saint-Philippe';
    }
    
    // Sud
    if (lat < -21.25) {
      return lng < 55.45 ? 'Saint-Pierre' : 'Saint-Joseph';
    }
    
    // Centre - tout le reste = Saint-Denis par défaut
    return 'Saint-Denis';
  };

  const getSourceBadge = (source: string, certification: boolean) => {
    if (certification) {
      return (
        <View className="bg-green-100 px-2 py-1 rounded-full ml-2">
          <Text className="text-green-800 text-xs font-bold">✓ OFFICIEL</Text>
        </View>
      );
    }
    
    const colors = {
      'IGN': 'bg-blue-100 text-blue-800',
      'ParcNational': 'bg-green-100 text-green-800',
      'Communaute': 'bg-purple-100 text-purple-800'
    };
    
    return (
      <View className={`px-2 py-1 rounded-full ml-2 ${colors[source as keyof typeof colors]?.split(' ')[0] || 'bg-gray-100'}`}>
        <Text className={`text-xs font-medium ${colors[source as keyof typeof colors]?.split(' ')[1] || 'text-gray-800'}`}>
          {source}
        </Text>
      </View>
    );
  };

  // Utiliser la hiérarchie des régions du service
  const regionsHierarchy = SentiersService.REGIONS_HIERARCHY;

  // Filtre les sentiers selon l'onglet actif, la région et la zone spécifique sélectionnée
  const filteredSentiers = sentiers.filter(sentier => {
    const matchesType = activeTab === 'randonnee' ? sentier.type === 'Randonnée' : sentier.type === 'VTT';
    const matchesRegion = selectedRegion ? sentier.region === selectedRegion : true;
    const matchesZoneSpecifique = selectedZoneSpecifique ? sentier.zone_specifique === selectedZoneSpecifique : true;
    return matchesType && matchesRegion && matchesZoneSpecifique;
  });

  // Fonction pour réinitialiser les filtres
  const resetFilters = () => {
    setSelectedRegion(null);
    setSelectedZoneSpecifique(null);
  };

  // Fonction pour sélectionner une région (et réinitialiser la zone spécifique)
  const selectRegion = (region: string | null) => {
    setSelectedRegion(region);
    setSelectedZoneSpecifique(null);
  };

  if (loading) {
    return (
      <Layout showHomeButton={false}>
        <View className="flex-1 justify-center items-center bg-gray-50">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="mt-4 text-gray-600">Chargement des sentiers officiels...</Text>
          <Text className="mt-2 text-sm text-gray-500">Sources: IGN • Parc National • OpenStreetMap</Text>
        </View>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout showHomeButton={false}>
        <View className="flex-1 justify-center items-center bg-gray-50 px-4">
          <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
            Erreur de chargement
          </Text>
          <Text className="text-gray-600 text-center mb-6">
            {error}
          </Text>
          <TouchableOpacity
            onPress={loadSentiers}
            className="bg-blue-500 px-6 py-3 rounded-full"
          >
            <Text className="text-white font-semibold">Réessayer</Text>
          </TouchableOpacity>
        </View>
      </Layout>
    );
  }

  return (
    <Layout
      footerButtons={<FooterNavigation currentPage="Sentiers" />}
      showHomeButton={false}
    >
      <FlatList
        data={filteredSentiers}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        className="flex-1 bg-gray-50"
        ListHeaderComponent={() => (
          <>
            {/* Tabs */}
            <View className="flex-row bg-white border-b border-gray-200">
              <TouchableOpacity
                onPress={() => setActiveTab('randonnee')}
                className={`flex-1 py-4 items-center ${
                  activeTab === 'randonnee' ? 'border-b-2 border-blue-500' : ''
                }`}
              >
                <Text className={`font-semibold ${
                  activeTab === 'randonnee' ? 'text-blue-500' : 'text-gray-500'
                }`}>
                  🥾 Randonnée
                </Text>
                <Text className="text-xs text-gray-400 mt-1">
                  {sentiers.filter(s => s.type === 'Randonnée').length} sentiers
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => setActiveTab('vtt')}
                className={`flex-1 py-4 items-center ${
                  activeTab === 'vtt' ? 'border-b-2 border-blue-500' : ''
                }`}
              >
                <Text className={`font-semibold ${
                  activeTab === 'vtt' ? 'text-blue-500' : 'text-gray-500'
                }`}>
                  🚴 VTT
                </Text>
                <Text className="text-xs text-gray-400 mt-1">
                  {sentiers.filter(s => s.type === 'VTT').length} parcours
                </Text>
              </TouchableOpacity>
            </View>

            {/* Filtres par régions hiérarchiques */}
            <View className="bg-white border-b border-gray-200">
              <Text className="text-gray-700 font-semibold px-4 pt-4 pb-2">
                📍 Filtrer par région ({filteredSentiers.length} sentiers)
              </Text>
              
              {/* Niveau 1: Régions principales */}
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                className="px-2 pb-2"
              >
                {/* Bouton "Toutes les régions" */}
                <TouchableOpacity
                  onPress={resetFilters}
                  className={`mr-2 px-4 py-2 rounded-full border ${
                    selectedRegion === null 
                      ? 'bg-blue-500 border-blue-500' 
                      : 'bg-white border-gray-300'
                  }`}
                >
                  <Text className={`font-medium text-sm ${
                    selectedRegion === null ? 'text-white' : 'text-gray-700'
                  }`}>
                    🗺️ Toutes
                  </Text>
                </TouchableOpacity>

                {/* Boutons des régions principales */}
                {Object.entries(regionsHierarchy).map(([regionName, regionData]) => {
                  const nbSentiers = sentiers.filter(s => 
                    s.region === regionName && 
                    (activeTab === 'randonnee' ? s.type === 'Randonnée' : s.type === 'VTT')
                  ).length;
                  
                  if (nbSentiers === 0) return null;
                  
                  return (
                    <TouchableOpacity
                      key={regionName}
                      onPress={() => selectRegion(regionName)}
                      className={`mr-2 px-4 py-2 rounded-full border ${
                        selectedRegion === regionName 
                          ? 'bg-blue-500 border-blue-500' 
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <Text className={`font-medium text-sm ${
                        selectedRegion === regionName ? 'text-white' : 'text-gray-700'
                      }`}>
                        {regionData.emoji} {regionName} ({nbSentiers})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Niveau 2: Zones spécifiques (si une région est sélectionnée) */}
              {selectedRegion && regionsHierarchy[selectedRegion] && (
                <>
                  <Text className="text-gray-600 font-medium px-4 pt-2 pb-2">
                    ↳ Zones spécifiques de {selectedRegion}
                  </Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    className="px-2 pb-4"
                  >
                    {/* Bouton "Toute la région" */}
                    <TouchableOpacity
                      onPress={() => setSelectedZoneSpecifique(null)}
                      className={`mr-2 px-3 py-1.5 rounded-full border ${
                        selectedZoneSpecifique === null 
                          ? 'bg-green-500 border-green-500' 
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <Text className={`font-medium text-xs ${
                        selectedZoneSpecifique === null ? 'text-white' : 'text-gray-700'
                      }`}>
                        Toute la région
                      </Text>
                    </TouchableOpacity>

                    {/* Boutons des zones spécifiques */}
                    {regionsHierarchy[selectedRegion].sous_regions.map((zoneSpecifique) => {
                      const nbSentiers = sentiers.filter(s => 
                        s.region === selectedRegion &&
                        s.zone_specifique === zoneSpecifique &&
                        (activeTab === 'randonnee' ? s.type === 'Randonnée' : s.type === 'VTT')
                      ).length;
                      
                      return (
                        <TouchableOpacity
                          key={zoneSpecifique}
                          onPress={() => setSelectedZoneSpecifique(zoneSpecifique)}
                          className={`mr-2 px-3 py-1.5 rounded-full border ${
                            selectedZoneSpecifique === zoneSpecifique 
                              ? 'bg-green-500 border-green-500' 
                              : 'bg-white border-gray-300'
                          }`}
                        >
                          <Text className={`font-medium text-xs ${
                            selectedZoneSpecifique === zoneSpecifique ? 'text-white' : 'text-gray-700'
                          }`}>
                            {zoneSpecifique} {nbSentiers > 0 && `(${nbSentiers})`}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}
            </View>
            <View className="h-4" />
          </>
        )}
        ListEmptyComponent={() => (
          <View className="px-4">
            <View className="bg-white rounded-2xl p-8 items-center">
              <Text className="text-4xl mb-4">
                {activeTab === 'randonnee' ? '🥾' : '🚴'}
              </Text>
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                Aucun sentier {activeTab === 'randonnee' ? 'de randonnée' : 'VTT'} trouvé
                {selectedRegion && ` dans la région "${selectedRegion}"`}
                {selectedZoneSpecifique && ` (${selectedZoneSpecifique})`}
              </Text>
              <Text className="text-gray-600 text-center">
                {selectedRegion || selectedZoneSpecifique
                  ? 'Essayez de modifier vos filtres ou sélectionner "Toutes" pour voir tous les sentiers disponibles.'
                  : 'Les données sont en cours de chargement depuis les sources officielles.'
                }
              </Text>
              {(selectedRegion || selectedZoneSpecifique) && (
                <TouchableOpacity
                  onPress={resetFilters}
                  className="bg-blue-500 px-4 py-2 rounded-full mt-4"
                >
                  <Text className="text-white font-medium">Voir toutes les régions</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        renderItem={({ item: sentier }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('SentierDetail', { sentier })}
            className="bg-white rounded-xl mb-3 mx-4 overflow-hidden shadow-sm border border-gray-100"
          >
            {/* Header avec région/sous-région */}
            <View className="bg-blue-500 px-4 py-2">
              <Text className="text-white font-bold text-sm">
                📍 {sentier.zone_specifique || sentier.region || getCityFromCoordinates(sentier.point_depart.coordonnees)}
              </Text>
            </View>
            
            <View className="p-4">
              {/* Titre et badges */}
              <View className="flex-row items-start justify-between mb-3">
                <Text className="text-lg font-bold text-gray-900 flex-1 mr-3" numberOfLines={2}>
                  {sentier.nom}
                </Text>
                <View className="flex-col items-end space-y-1">
                  <View className={`px-2 py-1 rounded-full ${getDifficultyColor(sentier.difficulte)}`}>
                    <Text className="text-white text-xs font-semibold">
                      {sentier.difficulte}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Statistiques principales - en grille compacte */}
              <View className="flex-row justify-between mb-3 bg-gray-50 rounded-lg p-3">
                <View className="items-center flex-1">
                  <Text className="text-xs text-gray-500">Distance</Text>
                  <Text className="font-bold text-blue-600">{sentier.distance}km</Text>
                </View>
                <View className="items-center flex-1">
                  <Text className="text-xs text-gray-500">Durée</Text>
                  <Text className="font-bold text-green-600">{sentier.duree_formatee}</Text>
                </View>
                <View className="items-center flex-1">
                  <Text className="text-xs text-gray-500">Dénivelé</Text>
                  <Text className="font-bold text-orange-600">+{sentier.denivele_positif}m</Text>
                </View>
              </View>

              {/* Badge de certification */}
              <View className="flex-row items-center justify-between">
                {sentier.certification_officielle && (
                  <View className="bg-green-100 px-2 py-1 rounded-full">
                    <Text className="text-green-800 text-xs font-bold">✓ OFFICIEL</Text>
                  </View>
                )}
                
                {/* Points d'intérêt - affichage compact */}
                {sentier.points_interet && sentier.points_interet.length > 0 && (
                  <View className="flex-row items-center">
                    <Text className="text-xs text-gray-500 mr-1">🎯</Text>
                    <Text className="text-xs text-gray-600">
                      {sentier.points_interet.length} point{sentier.points_interet.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
                
                <Text className="text-blue-500 text-sm font-semibold">Voir détails →</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

    </Layout>
  );
}
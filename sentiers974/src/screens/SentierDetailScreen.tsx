import React from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Linking,
  Alert 
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Layout from '../components/ui/Layout';
import FooterNavigation from '../components/ui/FooterNavigation';
import { RootStackParamList } from '../types/navigation';
import { SentierReel } from '../services/sentiersService';

type SentierDetailRouteProp = RouteProp<RootStackParamList, 'SentierDetail'>;
type SentierDetailNavigationProp = StackNavigationProp<RootStackParamList, 'SentierDetail'>;

export default function SentierDetailScreen() {
  const route = useRoute<SentierDetailRouteProp>();
  const navigation = useNavigation<SentierDetailNavigationProp>();
  const { sentier } = route.params;

  const getDifficultyColor = (difficulte: string) => {
    switch (difficulte) {
      case 'Facile': return 'bg-green-500';
      case 'Modéré': return 'bg-yellow-500';
      case 'Difficile': return 'bg-orange-500';
      case 'Expert': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };


  const openMaps = () => {
    const [lng, lat] = sentier.point_depart.coordonnees;
    const url = `https://maps.google.com/maps?q=${lat},${lng}`;
    Linking.openURL(url);
  };

  const callEmergency = (number: string) => {
    Alert.alert(
      'Appel d\'urgence',
      `Voulez-vous appeler le ${number} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Appeler', onPress: () => Linking.openURL(`tel:${number}`) }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Non renseigné';
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const headerButtons = (
    <TouchableOpacity onPress={openMaps} className="p-2">
      <Text className="text-2xl">🗺️</Text>
    </TouchableOpacity>
  );

  return (
    <Layout
      headerTitle={sentier.nom}
      headerButtons={headerButtons}
      showBackButton={true}
      footerButtons={<FooterNavigation currentPage="SentierDetail" />}
      showHomeButton={false}
    >
      <ScrollView className="flex-1 bg-gray-50">
        {/* Section principale */}
        <View className="bg-white px-6 py-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-blue-600 text-2xl font-bold flex-1 mr-4">
              {sentier.nom}
            </Text>
            <View className={`px-4 py-2 rounded-full ${getDifficultyColor(sentier.difficulte)}`}>
              <Text className="text-white font-bold">
                {sentier.difficulte}
              </Text>
            </View>
          </View>

          {/* Badges de certification et type de parcours */}
          <View className="flex-row items-center mb-4 flex-wrap gap-2">
            {sentier.certification_officielle && (
              <View className="bg-green-500 px-3 py-1 rounded-full">
                <Text className="text-white text-sm font-bold">✓ CERTIFIÉ OFFICIEL</Text>
              </View>
            )}
            <View className="bg-blue-100 px-3 py-1 rounded-full">
              <Text className="text-blue-600 text-sm font-semibold">
                📍 Source: {sentier.source}
              </Text>
            </View>
          </View>

          <Text className="text-blue-600 text-base leading-6 mb-4">
            {sentier.description}
          </Text>

          {/* Statistiques principales */}
          <View className="flex-row justify-between bg-blue-50 rounded-xl p-4 border border-blue-200">
            <View className="items-center">
              <Text className="text-blue-600 text-sm opacity-90">Distance</Text>
              <Text className="text-blue-600 text-xl font-bold">{sentier.distance} km</Text>
            </View>
            <View className="items-center">
              <Text className="text-blue-600 text-sm opacity-90">Durée</Text>
              <Text className="text-blue-600 text-xl font-bold">{sentier.duree_formatee}</Text>
            </View>
            <View className="items-center">
              <Text className="text-blue-600 text-sm opacity-90">Dénivelé</Text>
              <Text className="text-blue-600 text-xl font-bold">+{sentier.denivele_positif}m</Text>
            </View>
          </View>
        </View>

        <View className="px-6 py-6 space-y-6">
          {/* Point de départ */}
          <View className="bg-white rounded-xl p-4 border border-gray-100">
            <Text className="text-lg font-bold text-gray-900 mb-3">📍 Point de départ</Text>
            <Text className="text-base font-semibold text-gray-900">{sentier.point_depart.nom}</Text>
            <Text className="text-gray-600 mb-2">Altitude: {sentier.point_depart.altitude}m</Text>
            
            <View className="flex-row items-center space-x-4 mb-3">
              <View className="flex-row items-center">
                <Text className={`text-sm ${sentier.point_depart.acces_voiture ? 'text-green-600' : 'text-red-600'}`}>
                  🚗 {sentier.point_depart.acces_voiture ? 'Accessible en voiture' : 'Non accessible en voiture'}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className={`text-sm ${sentier.point_depart.parking_disponible ? 'text-green-600' : 'text-red-600'}`}>
                  🅿️ {sentier.point_depart.parking_disponible ? 'Parking disponible' : 'Pas de parking'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={openMaps}
              className="bg-blue-500 py-3 px-4 rounded-lg flex-row items-center justify-center"
            >
              <Text className="text-white font-semibold mr-2">Ouvrir dans Maps</Text>
              <Text className="text-white text-lg">🗺️</Text>
            </TouchableOpacity>
          </View>

          {/* Période idéale */}
          {sentier.periode_ideale?.debut && sentier.periode_ideale?.fin && (
            <View className="bg-white rounded-xl p-4 border border-gray-100">
              <Text className="text-lg font-bold text-gray-900 mb-3">🌤️ Période idéale</Text>
              <Text className="text-base text-gray-700">
                De <Text className="font-semibold">{sentier.periode_ideale.debut}</Text> à{' '}
                <Text className="font-semibold">{sentier.periode_ideale.fin}</Text>
              </Text>
            </View>
          )}

          {/* Balisage */}
          <View className="bg-white rounded-xl p-4 border border-gray-100">
            <Text className="text-lg font-bold text-gray-900 mb-3">🏷️ Balisage</Text>
            <View className="space-y-2">
              <Text className="text-base text-gray-700">
                Type: <Text className="font-semibold">{sentier.balisage.type || 'Non renseigné'}</Text>
              </Text>
              {sentier.balisage.couleur && (
                <Text className="text-base text-gray-700">
                  Couleur: <Text className="font-semibold">{sentier.balisage.couleur}</Text>
                </Text>
              )}
              <Text className="text-base text-gray-700">
                État: <Text className={`font-semibold ${
                  sentier.balisage.etat === 'Excellent' ? 'text-green-600' :
                  sentier.balisage.etat === 'Bon' ? 'text-blue-600' :
                  sentier.balisage.etat === 'Moyen' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {sentier.balisage.etat || 'Non renseigné'}
                </Text>
              </Text>
            </View>
          </View>

          {/* Points d'intérêt */}
          {sentier.points_interet && sentier.points_interet.length > 0 && (
            <View className="bg-white rounded-xl p-4 border border-gray-100">
              <Text className="text-lg font-bold text-gray-900 mb-3">🎯 Points d'intérêt</Text>
              {sentier.points_interet.map((poi, index) => (
                <View key={index} className="flex-row items-center mb-2">
                  <Text className="text-blue-500 mr-2">•</Text>
                  <Text className="text-base text-gray-700">
                    {typeof poi === 'string' ? poi : poi.nom || poi}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Équipements */}
          <View className="bg-white rounded-xl p-4 border border-gray-100">
            <Text className="text-lg font-bold text-gray-900 mb-3">🎒 Équipements</Text>
            
            {sentier.equipements_requis && sentier.equipements_requis.length > 0 && (
              <>
                <Text className="text-base font-semibold text-red-600 mb-2">Requis:</Text>
                {sentier.equipements_requis.map((eq, index) => (
                  <View key={index} className="flex-row items-center mb-1">
                    <Text className="text-red-500 mr-2">•</Text>
                    <Text className="text-base text-gray-700">{eq}</Text>
                  </View>
                ))}
              </>
            )}

            {sentier.equipements_recommandes && sentier.equipements_recommandes.length > 0 && (
              <>
                <Text className="text-base font-semibold text-blue-600 mb-2 mt-4">Recommandés:</Text>
                {sentier.equipements_recommandes.map((eq, index) => (
                  <View key={index} className="flex-row items-center mb-1">
                    <Text className="text-blue-500 mr-2">•</Text>
                    <Text className="text-base text-gray-700">{eq}</Text>
                  </View>
                ))}
              </>
            )}

            {(!sentier.equipements_requis || sentier.equipements_requis.length === 0) && 
             (!sentier.equipements_recommandes || sentier.equipements_recommandes.length === 0) && (
              <Text className="text-gray-500 italic">Informations non disponibles</Text>
            )}
          </View>

          {/* Dangers */}
          {sentier.dangers && sentier.dangers.length > 0 && (
            <View className="bg-red-50 rounded-xl p-4 border border-red-200">
              <Text className="text-lg font-bold text-red-900 mb-3">⚠️ Dangers et précautions</Text>
              {sentier.dangers.map((danger, index) => (
                <View key={index} className="flex-row items-center mb-2">
                  <Text className="text-red-500 mr-2">⚠️</Text>
                  <Text className="text-base text-red-700">{danger}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Restrictions */}
          {sentier.restrictions && sentier.restrictions.length > 0 && (
            <View className="bg-orange-50 rounded-xl p-4 border border-orange-200">
              <Text className="text-lg font-bold text-orange-900 mb-3">🚫 Restrictions</Text>
              {sentier.restrictions.map((restriction, index) => (
                <View key={index} className="flex-row items-center mb-2">
                  <Text className="text-orange-500 mr-2">•</Text>
                  <Text className="text-base text-orange-700">{restriction}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Services à proximité */}
          {sentier.services_proximite && (
            (sentier.services_proximite.hebergements?.length > 0 || 
             sentier.services_proximite.restaurants?.length > 0 ||
             sentier.services_proximite.locations_materiel?.length > 0) && (
              <View className="bg-white rounded-xl p-4 border border-gray-100">
                <Text className="text-lg font-bold text-gray-900 mb-3">🏨 Services à proximité</Text>
                
                {sentier.services_proximite.hebergements?.length > 0 && (
                  <View className="mb-3">
                    <Text className="text-base font-semibold text-gray-700 mb-1">🏠 Hébergements:</Text>
                    {sentier.services_proximite.hebergements.map((h, index) => (
                      <Text key={index} className="text-gray-600 ml-4">• {h}</Text>
                    ))}
                  </View>
                )}

                {sentier.services_proximite.restaurants?.length > 0 && (
                  <View className="mb-3">
                    <Text className="text-base font-semibold text-gray-700 mb-1">🍽️ Restaurants:</Text>
                    {sentier.services_proximite.restaurants.map((r, index) => (
                      <Text key={index} className="text-gray-600 ml-4">• {r}</Text>
                    ))}
                  </View>
                )}

                {sentier.services_proximite.locations_materiel?.length > 0 && (
                  <View>
                    <Text className="text-base font-semibold text-gray-700 mb-1">🏪 Location matériel:</Text>
                    {sentier.services_proximite.locations_materiel.map((l, index) => (
                      <Text key={index} className="text-gray-600 ml-4">• {l}</Text>
                    ))}
                  </View>
                )}
              </View>
            )
          )}

          {/* Contacts d'urgence */}
          <View className="bg-red-50 rounded-xl p-4 border border-red-200">
            <Text className="text-lg font-bold text-red-900 mb-3">🚨 Contacts d'urgence</Text>
            <View className="space-y-3">
              <TouchableOpacity
                onPress={() => callEmergency(sentier.contact_urgence?.secours_montagne || '02 62 93 37 37')}
                className="bg-red-600 py-3 px-4 rounded-lg flex-row items-center justify-center"
              >
                <Text className="text-white font-semibold mr-2">🏔️ Secours montagne</Text>
                <Text className="text-white font-bold">{sentier.contact_urgence?.secours_montagne || '02 62 93 37 37'}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={() => callEmergency(sentier.contact_urgence?.gendarmerie || '17')}
                className="bg-blue-600 py-3 px-4 rounded-lg flex-row items-center justify-center"
              >
                <Text className="text-white font-semibold mr-2">👮 Gendarmerie</Text>
                <Text className="text-white font-bold">{sentier.contact_urgence?.gendarmerie || '17'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Informations techniques */}
          <View className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <Text className="text-lg font-bold text-gray-900 mb-3">ℹ️ Informations techniques</Text>
            <View className="space-y-2">
              <Text className="text-sm text-gray-600">
                Dernière mise à jour: <Text className="font-semibold">{formatDate(sentier.derniere_mise_a_jour)}</Text>
              </Text>
              <Text className="text-sm text-gray-600">
                Source des données: <Text className="font-semibold">{sentier.source}</Text>
              </Text>
              <Text className="text-sm text-gray-600">
                ID du sentier: <Text className="font-mono text-xs">{sentier.id}</Text>
              </Text>
              {sentier.commune_depart && (
                <Text className="text-sm text-gray-600">
                  Commune: <Text className="font-semibold">{sentier.commune_depart}</Text>
                </Text>
              )}
            </View>
          </View>
        </View>

        <View className="h-6" />
      </ScrollView>
    </Layout>
  );
}
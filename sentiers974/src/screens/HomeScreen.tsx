import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import AllEventsSection from "../components/AllEventsSection";
import Layout from "../components/Layout";
import LocationSection from "../components/LocationSection";
import { useLocationStore } from "../store/useLocationStore";
import { useSessionStore } from "../store/useSessionStore";

export default function HomeScreen() {
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Accès aux stores pour réinitialisation
  const { reset: resetLocation } = useLocationStore();
  const { reset: resetSession } = useSessionStore();

  const [isFirstHomeLoad, setIsFirstHomeLoad] = useState(true);

  // Réinitialiser HomeScreen quand on revient dessus (pas au premier chargement)
  useFocusEffect(
    useCallback(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      
      if (isFirstHomeLoad) {
        console.log("🏠 Premier chargement HomeScreen - pas de reset");
        setIsFirstHomeLoad(false);
      } else {
        console.log("🏠 Retour HomeScreen - reset des stores");
        resetLocation();
        resetSession();
      }
    }, [isFirstHomeLoad, resetLocation, resetSession])
  );

  // Boutons du footer
  const footerButtons = (
    <View className="items-center">
      <TouchableOpacity
        onPress={() => navigation.navigate("Tracking")}
        className="w-10 h-10 bg-green-500 rounded-full items-center justify-center mb-2"
      >
        <Text className="text-base">▶️</Text>
      </TouchableOpacity>
      <Text className="text-gray-700 text-sm font-medium">
        Commencer activité
      </Text>
    </View>
  );

  return (
    <Layout footerButtons={footerButtons}>
      <ScrollView ref={scrollViewRef} className="flex-1 bg-gray-50">
        <View className="flex-1 py-4 px-4">
          {/* Section Hero simplifiée */}
          <View className="bg-blue-600 p-6 rounded-2xl mb-6 items-center shadow-lg">
            <Text className="text-4xl font-bold text-white mb-2">
              Sentiers 974
            </Text>
            <Text className="text-white text-center text-lg font-semibold">
              🏝️ Tous les sports de La Réunion
            </Text>
          </View>
          
          {/* Section Localisation */}
          <LocationSection />
          
          {/* Section Tous les événements avec filtres */}
          <AllEventsSection />

          {/* Espacement final */}
          <View className="h-6" />
        </View>
      </ScrollView>
    </Layout>
  );
}

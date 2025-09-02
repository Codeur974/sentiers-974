import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import { ImageBackground, ScrollView, Text, TouchableOpacity, View } from "react-native";
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
      <ScrollView ref={scrollViewRef} className="flex-1">
        {/* Hero section avec photo de La Réunion */}
        <ImageBackground
          source={{
            uri: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3'
          }}
          className="px-4 pt-6 pb-8 mb-4"
          imageStyle={{ borderRadius: 0 }}
        >
          {/* Overlay sombre pour la lisibilité */}
          <View 
            className="absolute inset-0" 
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} 
          />
          
          <View className="items-center relative z-10">
            <Text 
              className="text-5xl font-bold text-white mb-3 text-center"
              style={{ textShadowColor: 'rgba(0, 0, 0, 0.8)', textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 6 }}
            >
              Sentiers 974
            </Text>
            <View className="flex-row items-center px-4 py-2 rounded-full mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
              <Text 
                className="text-white text-xl font-bold"
                style={{ textShadowColor: 'rgba(0, 0, 0, 0.7)', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4 }}
              >
                🏝️ La Réunion, l'île intense
              </Text>
            </View>
            <Text 
              className="text-white text-center text-xl font-bold"
              style={{ textShadowColor: 'rgba(0, 0, 0, 0.7)', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4 }}
            >
              Sports & Aventures
            </Text>
          </View>
        </ImageBackground>
        
        <View className="px-4 bg-slate-50 flex-1">
          {/* Section Localisation avec style moderne */}
          <LocationSection />
          
          {/* Section Tous les événements */}
          <AllEventsSection />

          {/* Espacement final */}
          <View className="h-32" />
        </View>
      </ScrollView>
    </Layout>
  );
}

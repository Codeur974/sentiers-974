import React, { useEffect } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import HomeScreen from "./screens/HomeScreen";
import TrackingScreen from "./screens/TrackingScreen";
import EventsScreen from "./screens/EventsScreen";
import SportsScreen from "./screens/SportsScreen";
import SentiersScreen from "./screens/SentiersScreen";
import SentierDetailScreen from "./screens/SentierDetailScreen";
import { autoUpdateScheduler } from "./services/autoUpdateScheduler";
import { eventsDatabaseService } from "./services/eventsDatabase";

const Stack = createStackNavigator();

export default function App() {
  // Initialiser le système d'automatisation au démarrage
  useEffect(() => {
    const initializeAutomation = async () => {
      try {
        console.log('🚀 Initialisation du système d\'automatisation');
        
        // 1. Initialiser la base de données
        await eventsDatabaseService.initializeDatabase();
        
        // 2. Démarrer le planificateur automatique
        await autoUpdateScheduler.initialize();
        
        console.log('✅ Système d\'automatisation initialisé');
      } catch (error) {
        console.error('❌ Erreur initialisation automatisation:', error);
      }
    };
    
    initializeAutomation();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen 
          name="Home" 
          component={HomeScreen}
          options={({ route }) => ({
            title: "Accueil",
            headerRight: () => (
              <TouchableOpacity 
                className="mr-4 p-2"
                onPress={() => {
                  // Action pour les paramètres
                  console.log("Paramètres");
                }}
              >
                <Text className="text-lg">⚙️</Text>
              </TouchableOpacity>
            )
          })}
        />
        <Stack.Screen 
          name="Sports" 
          component={SportsScreen}
          options={{ title: "Sports & Événements" }}
        />
        <Stack.Screen 
          name="Tracking" 
          component={TrackingScreen}
          options={{ title: "Suivi d'activité" }}
        />
        <Stack.Screen 
          name="Events" 
          component={EventsScreen}
          options={{ title: "Événements sportifs" }}
        />
        <Stack.Screen 
          name="Sentiers" 
          component={SentiersScreen}
          options={{ title: "Sentiers de La Réunion" }}
        />
        <Stack.Screen 
          name="SentierDetail" 
          component={SentierDetailScreen}
          options={{ 
            title: "Détails du sentier",
            headerShown: false // On utilise le header personnalisé du Layout
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

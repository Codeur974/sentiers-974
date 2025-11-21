import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import RecordingIndicator from "./components/ui/RecordingIndicator";
import HomeScreen from "./screens/HomeScreen";
import TrackingScreen from "./screens/TrackingScreen";
import EventsScreen from "./screens/EventsScreen";
import SportsScreen from "./screens/SportsScreen";
import SentiersScreen from "./screens/SentiersScreen";
import SentierDetailScreen from "./screens/SentierDetailScreen";
import CommentsScreen from "./screens/CommentsScreen";
import ProfileScreen from "./screens/ProfileScreen";
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import { autoUpdateScheduler } from "./services/autoUpdateScheduler";
import { eventsDatabaseService } from "./services/eventsDatabase";
import { AuthProvider } from "./contexts/AuthContext";

const Stack = createNativeStackNavigator();

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Home">
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={({ navigation }) => ({
              title: "Accueil",
              headerRight: () => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <RecordingIndicator />
                  <TouchableOpacity
                    className="mr-4 p-2"
                    onPress={() => navigation.navigate('Profile' as never)}
                  >
                    <Text className="text-lg">⚙️</Text>
                  </TouchableOpacity>
                </View>
              )
            })}
          />
          <Stack.Screen
            name="Sports"
            component={SportsScreen}
            options={{
              title: "Sports & Événements",
              headerRight: () => <RecordingIndicator />
            }}
          />
          <Stack.Screen
            name="Tracking"
            component={TrackingScreen}
            options={({ route }) => ({
              title: (route.params as any)?.selectedSport ? "Session en cours" : "Mon Suivi",
              headerRight: () => <RecordingIndicator />
            })}
          />
          <Stack.Screen
            name="Events"
            component={EventsScreen}
            options={{
              title: "Événements sportifs",
              headerRight: () => <RecordingIndicator />
            }}
          />
          <Stack.Screen
            name="Sentiers"
            component={SentiersScreen}
            options={{
              title: "Sentiers de La Réunion",
              headerRight: () => <RecordingIndicator />
            }}
          />
          <Stack.Screen
            name="SentierDetail"
            component={SentierDetailScreen}
            options={{
              title: "Détails du sentier",
              headerShown: false // On utilise le header personnalisé du Layout
            }}
          />
          <Stack.Screen
            name="Comments"
            component={CommentsScreen}
            options={{
              title: "Commentaires",
              headerShown: false // On utilise le header personnalisé du CommentsScreen
            }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              title: "Mon Profil",
              headerRight: () => <RecordingIndicator />
            }}
          />
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{
              title: "Connexion",
              headerRight: () => <RecordingIndicator />
            }}
          />
          <Stack.Screen
            name="Signup"
            component={SignupScreen}
            options={{
              title: "Inscription",
              headerRight: () => <RecordingIndicator />
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useRecordingStore } from "../../store/useRecordingStore";
import { useAuth } from "../../contexts/AuthContext";

interface FooterNavigationProps {
  currentPage: "Home" | "Sports" | "Sentiers" | "Tracking" | "SentierDetail" | "Events";
  onEnregistrer?: () => void;
}

export default function FooterNavigation({ currentPage, onEnregistrer }: FooterNavigationProps) {
  const navigation = useNavigation();
  const { isRecording, selectedSport } = useRecordingStore();
  const { isAuthenticated } = useAuth();

  const buttons = [
    {
      key: "Home",
      label: "Accueil",
      emoji: "🏠",
      onPress: () => {
        if (currentPage === "Home") return; // Éviter les actions inutiles
        navigation.reset({
          index: 0,
          routes: [{ name: "Home" }],
        } as never);
      }
    },
    {
      key: "Sports",
      label: "Événement",
      emoji: "🏃",
      onPress: () => navigation.navigate("Sports" as never)
    },
    {
      key: "Sentiers",
      label: "Sentiers",
      emoji: "🥾",
      onPress: () => navigation.navigate("Sentiers" as never)
    },
    {
      key: "Enregistrer",
      label: "Enregistrer",
      emoji: "📝",
      onPress: onEnregistrer || (() => {
        // Vérifier si l'utilisateur est connecté
        if (!isAuthenticated) {
          // Afficher un message
          Alert.alert(
            "Connexion requise",
            "Vous devez être connecté pour enregistrer une session sportive.",
            [
              { text: "Annuler", style: "cancel" },
              { text: "Se connecter", onPress: () => navigation.navigate("Profile" as never) }
            ]
          );
          return;
        }

        // Si un enregistrement est en cours, rediriger vers l'enregistrement actuel
        if (isRecording && selectedSport) {
          navigation.navigate("Tracking" as never, { selectedSport } as never);
        } else {
          // Sinon ouvrir la sélection de sport
          navigation.navigate("Tracking" as never, { openSportSelection: true } as never);
        }
      })
    },
    {
      key: "Tracking",
      label: "Suivi",
      emoji: "📊",
      onPress: () => (navigation as any).navigate("Tracking", { showSuiviMode: true })
    }
  ];

  // Filtrer le bouton de la page courante et masquer "Suivi" si non connecté
  const visibleButtons = buttons.filter(button => {
    // Masquer uniquement "Suivi" si l'utilisateur n'est pas connecté
    // "Enregistrer" reste visible et redirigera vers connexion
    if (!isAuthenticated && button.key === "Tracking") {
      return false;
    }

    if (currentPage === "Tracking") {
      // Sur la page Tracking, on cache "Suivi" mais on garde "Enregistrer"
      return button.key !== "Tracking";
    }
    return button.key !== currentPage;
  });

  return (
    <View className="flex-row justify-around items-center w-full">
      {visibleButtons.map((button) => {
        return (
          <View key={button.key} className="items-center flex-1">
            <TouchableOpacity
              onPress={button.onPress}
              className="w-10 h-10 items-center justify-center mb-1"
            >
              <Text className="text-base">
                {button.emoji}
              </Text>
            </TouchableOpacity>
            <Text className="text-xs font-medium -mt-1 text-gray-700">
              {button.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
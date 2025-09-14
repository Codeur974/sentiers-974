import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useRecordingStore } from "../store/useRecordingStore";

interface FooterNavigationProps {
  currentPage: "Home" | "Sports" | "Sentiers" | "Tracking" | "SentierDetail" | "Events";
  onEnregistrer?: () => void;
}

export default function FooterNavigation({ currentPage, onEnregistrer }: FooterNavigationProps) {
  const navigation = useNavigation();
  const { isRecording, selectedSport } = useRecordingStore();

  const buttons = [
    {
      key: "Home",
      label: "Accueil",
      emoji: "🏠",
      onPress: () => navigation.navigate("Home" as never)
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
      onPress: () => navigation.navigate("Tracking" as never)
    }
  ];

  // Filtrer le bouton de la page courante
  const visibleButtons = buttons.filter(button => {
    if (currentPage === "Tracking") {
      // Sur la page Tracking, on cache "Suivi" mais on garde "Enregistrer"
      return button.key !== "Tracking";
    }
    return button.key !== currentPage;
  });

  return (
    <View className="flex-row justify-around items-center w-full">
      {visibleButtons.map((button) => (
        <View key={button.key} className="items-center flex-1">
          <TouchableOpacity
            onPress={button.onPress}
            className="w-10 h-10 items-center justify-center mb-1"
          >
            <Text className="text-base">{button.emoji}</Text>
          </TouchableOpacity>
          <Text className="text-gray-700 text-xs font-medium">
            {button.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
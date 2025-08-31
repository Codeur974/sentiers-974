import React from "react";
import { View, Text } from "react-native";

export default function HeroSection() {
  return (
    <View className="items-center mb-8">
      <Text className="text-6xl font-bold text-center text-black mb-4">
        Sentiers
      </Text>
      <Text className="text-6xl font-bold text-center text-green-500 mb-8">
        974
      </Text>
      <Text className="text-lg text-center text-gray-600 px-4">
        Découvre les plus beaux sentiers de La Réunion
      </Text>
    </View>
  );
}
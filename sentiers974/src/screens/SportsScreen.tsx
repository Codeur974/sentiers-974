import { useNavigation } from "@react-navigation/native";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import AllEventsSection from "../components/events/AllEventsSection";
import Layout from "../components/ui/Layout";
import FooterNavigation from "../components/ui/FooterNavigation";

export default function SportsScreen() {
  const navigation = useNavigation();

  // Boutons du footer - tous sauf événement
  const footerButtons = (
    <View className="flex-row justify-around items-center w-full">
      {/* Bouton Sentiers */}
      <View className="items-center flex-1">
        <TouchableOpacity
          onPress={() => navigation.navigate("Sentiers")}
          className="w-10 h-10 items-center justify-center mb-1"
        >
          <Text className="text-base">🥾</Text>
        </TouchableOpacity>
        <Text className="text-gray-700 text-xs font-medium">
          Sentiers
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

  return (
    <Layout
      footerButtons={<FooterNavigation currentPage="Sports" />}
      showHomeButton={false}
    >
      <ScrollView className="flex-1">
        <View className="px-4 bg-slate-50 flex-1 pt-4">
          <AllEventsSection />

          {/* Espacement final */}
          <View className="h-6" />
        </View>
      </ScrollView>
    </Layout>
  );
}
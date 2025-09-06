import { useNavigation } from "@react-navigation/native";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import AllEventsSection from "../components/AllEventsSection";
import Layout from "../components/Layout";

export default function SportsScreen() {
  const navigation = useNavigation();

  // Boutons du footer - bouton tracking
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
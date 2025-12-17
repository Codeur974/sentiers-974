import { ReactNode } from "react";
import { View, Text, TouchableOpacity, StatusBar, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

interface LayoutProps {
  children: ReactNode;
  headerTitle?: string;
  showBackButton?: boolean;
  headerButtons?: ReactNode;
  footerButtons?: ReactNode;
  showHomeButton?: boolean;
}

export default function Layout({
  children,
  headerTitle,
  showBackButton = false,
  headerButtons,
  footerButtons,
  showHomeButton = true,
}: LayoutProps) {
  const navigation = useNavigation();

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
        {/* Status Bar */}
        <StatusBar barStyle="dark-content" />

        {/* Header - conditionnel */}
        {(headerTitle || showBackButton || headerButtons) && (
          <View className="bg-blue-600 px-4 py-2 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              {showBackButton && (
                <TouchableOpacity
                  onPress={() => navigation.goBack()}
                  className="mr-3 p-2"
                >
                  <Text className="text-white text-lg">←</Text>
                </TouchableOpacity>
              )}
              {headerTitle && (
                <Text className="text-white text-lg font-semibold flex-1">
                  {headerTitle}
                </Text>
              )}
            </View>
            {headerButtons && <View className="flex-row">{headerButtons}</View>}
          </View>
        )}

        {/* Contenu principal */}
        <View className="flex-1">{children}</View>

        {/* Footer */}
        {(footerButtons || showHomeButton) && (
          <View className="bg-white px-4 py-2 border-t border-gray-300 shadow-lg">
            <View className="flex-row justify-between items-center">
              {/* Bouton Home (toujours présent sauf HomeScreen) - en première position */}
              {showHomeButton && (
                <TouchableOpacity
                  onPress={() => navigation.navigate("Home")}
                  className="items-center mr-4"
                >
                  <View className="w-10 h-10 items-center justify-center mb-1">
                    <Text className="text-base">🏠</Text>
                  </View>
                  <Text className="text-gray-700 text-xs font-medium">
                    Accueil
                  </Text>
                </TouchableOpacity>
              )}

              {/* Boutons custom de la page */}
              <View className="flex-1">
                {footerButtons}
              </View>
            </View>
          </View>
        )}
    </SafeAreaView>
  );
}

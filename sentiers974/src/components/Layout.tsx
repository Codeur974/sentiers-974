import { ReactNode } from "react";
import { View, Text, TouchableOpacity, SafeAreaView } from "react-native";
import { useNavigation } from "@react-navigation/native";

interface LayoutProps {
  children: ReactNode;
  headerTitle?: string;
  showBackButton?: boolean;
  headerButtons?: ReactNode;
  footerButtons?: ReactNode;
}

export default function Layout({
  children,
  headerTitle,
  showBackButton = false,
  headerButtons,
  footerButtons,
}: LayoutProps) {
  const navigation = useNavigation();

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header - conditionnel */}
      {(headerTitle || showBackButton || headerButtons) && (
        <View className="bg-blue-600 px-4 py-3 flex-row items-center justify-between">
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
          {headerButtons && (
            <View className="flex-row">{headerButtons}</View>
          )}
        </View>
      )}

      {/* Contenu principal */}
      <View className="flex-1">
        {children}
      </View>

      {/* Footer */}
      {footerButtons && (
        <View className="bg-white px-4 py-4 pb-12 border-t border-gray-300 shadow-lg">
          {footerButtons}
        </View>
      )}
    </SafeAreaView>
  );
}
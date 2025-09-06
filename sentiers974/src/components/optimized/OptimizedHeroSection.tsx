import React from 'react';
import { View, Text, TouchableOpacity, ImageBackground } from 'react-native';
import { logger } from '../../utils/logger';

interface HeroSectionProps {
  title: string;
  subtitle?: string;
  backgroundImage?: string;
  primaryAction?: {
    label: string;
    onPress: () => void;
    icon?: string;
  };
  secondaryAction?: {
    label: string;
    onPress: () => void;
    icon?: string;
  };
  stats?: Array<{
    label: string;
    value: string;
    icon?: string;
  }>;
}

/**
 * Version optimisée de HeroSection avec React.memo
 * Évite les re-renders lors des changements de données non liées
 */
const OptimizedHeroSection = React.memo(function HeroSection({
  title,
  subtitle,
  backgroundImage,
  primaryAction,
  secondaryAction,
  stats
}: HeroSectionProps) {
  logger.debug('Render HeroSection', { title, hasStats: !!stats }, 'PERF');

  const renderContent = () => (
    <View className="flex-1 justify-center items-center px-6 py-12">
      {/* Title and subtitle */}
      <View className="mb-8 text-center">
        <Text className="text-4xl font-bold text-white mb-3 text-center">
          {title}
        </Text>
        {subtitle && (
          <Text className="text-xl text-white/90 text-center leading-relaxed">
            {subtitle}
          </Text>
        )}
      </View>

      {/* Stats */}
      {stats && stats.length > 0 && (
        <View className="flex-row justify-center mb-8 bg-white/20 rounded-2xl p-6">
          {stats.map((stat, index) => (
            <View key={index} className={`items-center ${index < stats.length - 1 ? 'mr-8' : ''}`}>
              {stat.icon && (
                <Text className="text-2xl mb-2">{stat.icon}</Text>
              )}
              <Text className="text-2xl font-bold text-white mb-1">
                {stat.value}
              </Text>
              <Text className="text-white/80 text-sm text-center">
                {stat.label}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Action buttons */}
      <View className="flex-row space-x-4">
        {primaryAction && (
          <TouchableOpacity
            className="bg-white/90 px-8 py-4 rounded-2xl shadow-lg"
            onPress={primaryAction.onPress}
          >
            <Text className="text-blue-600 font-bold text-lg text-center">
              {primaryAction.icon && `${primaryAction.icon} `}{primaryAction.label}
            </Text>
          </TouchableOpacity>
        )}
        
        {secondaryAction && (
          <TouchableOpacity
            className="bg-transparent border-2 border-white/50 px-8 py-4 rounded-2xl"
            onPress={secondaryAction.onPress}
          >
            <Text className="text-white font-bold text-lg text-center">
              {secondaryAction.icon && `${secondaryAction.icon} `}{secondaryAction.label}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (backgroundImage) {
    return (
      <ImageBackground
        source={{ uri: backgroundImage }}
        className="h-96 rounded-3xl overflow-hidden mb-8"
        resizeMode="cover"
      >
        <View className="flex-1 bg-gradient-to-b from-blue-600/40 to-blue-800/60">
          {renderContent()}
        </View>
      </ImageBackground>
    );
  }

  return (
    <View className="h-96 rounded-3xl overflow-hidden mb-8 bg-gradient-to-br from-blue-500 to-blue-700">
      {renderContent()}
    </View>
  );
});

export default OptimizedHeroSection;
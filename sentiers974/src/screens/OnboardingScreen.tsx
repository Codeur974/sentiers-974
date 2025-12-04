import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

const ONBOARDING_KEY = 'hasCompletedOnboarding';

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      emoji: '🏃',
      title: 'Bienvenue sur Sentiers 974',
      description: 'Enregistrez vos parcours sportifs avec un tracking GPS précis adapté à la Réunion.'
    },
    {
      emoji: '📍',
      title: 'GPS intelligent',
      description: 'Notre système s\'adapte automatiquement aux conditions GPS (forêt, montagne, ville) pour un tracking fiable.'
    },
    {
      emoji: '📊',
      title: 'Suivez vos progrès',
      description: 'Visualisez vos statistiques, photos et historique de sessions pour suivre votre évolution.'
    },
    {
      emoji: '🎯',
      title: 'Prêt à commencer ?',
      description: 'Choisissez votre sport favori et lancez votre première session !'
    }
  ];

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      onComplete();
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    onComplete();
  };

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <View style={styles.container}>
      {/* Indicateurs de progression */}
      <View style={styles.indicators}>
        {steps.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              index === currentStep && styles.indicatorActive
            ]}
          />
        ))}
      </View>

      {/* Contenu */}
      <View style={styles.content}>
        <Text style={styles.emoji}>{step.emoji}</Text>
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.description}>{step.description}</Text>
      </View>

      {/* Boutons */}
      <View style={styles.buttons}>
        {!isLastStep && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Passer</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
          <Text style={styles.nextText}>
            {isLastStep ? 'Commencer' : 'Suivant'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 50,
  },
  indicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 60,
  },
  indicator: {
    width: 30,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
  },
  indicatorActive: {
    backgroundColor: '#2196F3',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emoji: {
    fontSize: 80,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  skipText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#2196F3',
  },
  nextText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

export const hasCompletedOnboarding = async (): Promise<boolean> => {
  const value = await AsyncStorage.getItem(ONBOARDING_KEY);
  return value === 'true';
};

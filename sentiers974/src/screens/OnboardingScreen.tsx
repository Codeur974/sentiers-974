import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
  onNavigateToSignup?: () => void;
}

const ONBOARDING_KEY = 'hasCompletedOnboarding';

export default function OnboardingScreen({ onComplete, onNavigateToSignup }: OnboardingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      emoji: '🏃',
      title: 'Bienvenue sur Sentiers 974',
      description: 'Enregistrez vos parcours sportifs avec un tracking GPS précis adapté à la Réunion.',
      isSignupStep: false
    },
    {
      emoji: '📍',
      title: 'GPS intelligent',
      description: 'Notre système s\'adapte automatiquement aux conditions GPS (forêt, montagne, ville) pour un tracking fiable.',
      isSignupStep: false
    },
    {
      emoji: '📊',
      title: 'Suivez vos progrès',
      description: 'Visualisez vos statistiques, photos et historique de sessions pour suivre votre évolution.',
      isSignupStep: false
    },
    {
      emoji: '🔐',
      title: 'Sécurisez vos données',
      description: 'Pour sauvegarder vos sessions de tracking, photos et progressions, créez un compte. Vos données personnelles seront protégées et synchronisées.',
      isSignupStep: true
    }
  ];

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Dernière étape : rediriger vers l'inscription
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      if (onNavigateToSignup) {
        onNavigateToSignup();
      } else {
        onComplete();
      }
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    onComplete();
  };

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isSignupStep = step.isSignupStep;

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
        {isSignupStep ? (
          // Boutons de l'étape inscription
          <>
            <TouchableOpacity
              onPress={handleSkip}
              style={styles.laterButton}
              activeOpacity={0.7}
            >
              <Text style={styles.laterText}>Plus tard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNext}
              style={styles.signupButton}
              activeOpacity={0.8}
            >
              <Text style={styles.signupText}>S'inscrire</Text>
            </TouchableOpacity>
          </>
        ) : (
          // Boutons des étapes normales
          <>
            <TouchableOpacity
              onPress={handleSkip}
              style={styles.skipButton}
              activeOpacity={0.7}
            >
              <Text style={styles.skipText}>Passer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNext}
              style={styles.nextButton}
              activeOpacity={0.8}
            >
              <Text style={styles.nextText}>Suivant</Text>
            </TouchableOpacity>
          </>
        )}
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
    borderWidth: 2,
    borderColor: '#999',
    backgroundColor: '#f5f5f5',
  },
  skipText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '700',
  },
  nextButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#2196F3',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  nextText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
  laterButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#999',
    backgroundColor: '#f5f5f5',
  },
  laterText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '700',
  },
  signupButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  signupText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
});

export const hasCompletedOnboarding = async (): Promise<boolean> => {
  const value = await AsyncStorage.getItem(ONBOARDING_KEY);
  return value === 'true';
};

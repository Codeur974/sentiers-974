import React, { useEffect, useState } from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import { useRecordingStore } from '../../store/useRecordingStore';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function RecordingIndicator() {
  const { isRecording, isPaused } = useRecordingStore();
  const [opacity] = useState(new Animated.Value(1));
  const navigation = useNavigation();
  const route = useRoute();

  // Animation pour le badge REC uniquement
  useEffect(() => {
    if (isRecording || isPaused) {
      // Animation clignotante pour le badge REC
      const blinkAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );

      blinkAnimation.start();

      return () => {
        blinkAnimation.stop();
      };
    } else {
      // Réinitialiser l'opacité à 1 quand arrêté
      opacity.setValue(1);
    }
  }, [isRecording, isPaused, opacity]);

  if (!isRecording && !isPaused) return null;

  const handlePress = () => {
    // Forcer l'affichage direct de la session de tracking active
    // showSuiviMode: false pour afficher l'UI de tracking, pas le suivi
    (navigation as any).navigate('Tracking', { showSuiviMode: false });
  };

  const getIndicatorContent = () => {
    if (isPaused) {
      return {
        backgroundColor: '#f59e0b',
        text: '⏸️ PAUSE',
        emoji: '⏸️'
      };
    } else {
      return {
        backgroundColor: '#ef4444',
        text: '🔴 REC',
        emoji: '🔴'
      };
    }
  };

  const indicator = getIndicatorContent();

  // Détecter si on est vraiment sur la session de tracking active
  // Le texte ne doit PAS apparaître seulement si on est sur Tracking ET pas en mode Suivi
  const isOnActiveTrackingSession = route.name === 'Tracking' && (route.params as any)?.showSuiviMode === false;

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={1}>
      <View style={{ alignItems: 'flex-end' }}>
        <Animated.View style={{ opacity }}>
          <View style={{
            backgroundColor: indicator.backgroundColor,
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 6,
            marginRight: 8,
            alignItems: 'center',
          }}>
            <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>
              {indicator.text}
            </Text>
          </View>
        </Animated.View>
        {!isOnActiveTrackingSession && (
          <Text style={{
            fontSize: 11,
            color: '#4b5563',
            marginTop: 3,
            marginRight: 8,
            fontWeight: '600',
          }}>
            Retour à la session ↑
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

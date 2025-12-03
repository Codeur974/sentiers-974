import React, { useEffect, useState } from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import { useRecordingStore } from '../../store/useRecordingStore';
import { useNavigation } from '@react-navigation/native';

export default function RecordingIndicator() {
  const { isRecording, isPaused } = useRecordingStore();
  const [opacity] = useState(new Animated.Value(1));
  const navigation = useNavigation();

  useEffect(() => {
    if (isRecording && !isPaused) {
      // Animation clignotante pour enregistrement en cours
      const blinkAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      blinkAnimation.start();
      
      return () => blinkAnimation.stop();
    } else {
      opacity.setValue(1);
    }
  }, [isRecording, isPaused, opacity]);

  if (!isRecording && !isPaused) return null;

  const handlePress = () => {
    // Ne pas passer selectedSport pour éviter la re-création des hooks GPS
    // TrackingScreen récupérera le sport actif via trackingLogic.activeSport
    (navigation as any).navigate('Tracking');
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

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={1}>
      <Animated.View style={{ opacity }}>
        <View style={{
          backgroundColor: indicator.backgroundColor,
          borderRadius: 12,
          paddingHorizontal: 8,
          paddingVertical: 4,
          marginRight: 8,
        }}>
          <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
            {indicator.text}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}
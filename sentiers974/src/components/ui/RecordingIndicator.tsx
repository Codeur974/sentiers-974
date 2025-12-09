import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Animated, Pressable } from 'react-native';
import { useRecordingStore } from '../../store/useRecordingStore';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function RecordingIndicator() {
  const { isRecording, isPaused } = useRecordingStore();
  const [opacity] = useState(new Animated.Value(1));
  const blinkAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    if (isRecording || isPaused) {
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

      blinkAnimationRef.current = blinkAnimation;
      blinkAnimation.start();

      return () => {
        blinkAnimation.stop();
        blinkAnimationRef.current = null;
        opacity.setValue(1);
      };
    }

    opacity.setValue(1);
    return () => {};
  }, [isRecording, isPaused, opacity]);

  if (!isRecording && !isPaused) return null;

  const handlePress = () => {
    (navigation as any).navigate('Tracking', { showSuiviMode: false });
  };

  const getIndicatorContent = () => {
    if (isPaused) {
      return {
        backgroundColor: '#f59e0b',
        text: '🟠 PAUSE',
        emoji: '🟠'
      };
    }

    return {
      backgroundColor: '#ef4444',
      text: '🔴 REC',
      emoji: '🔴'
    };
  };

  const indicator = getIndicatorContent();
  const isOnActiveTrackingSession =
    route.name === 'Tracking' && (route.params as any)?.showSuiviMode === false;

  return (
    <Pressable
      onPress={handlePress}
      android_ripple={{ color: 'transparent' }}
      style={{ alignItems: 'flex-end' }}
    >
      <Animated.View style={{ opacity }}>
        <View
          style={{
            backgroundColor: indicator.backgroundColor,
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 6,
            marginRight: 8,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white', fontSize: 13, fontWeight: '700' }}>
            {indicator.text}
          </Text>
        </View>
      </Animated.View>
      {!isOnActiveTrackingSession && (
        <Text
          style={{
            fontSize: 11,
            color: '#4b5563',
            marginTop: 3,
            marginRight: 8,
            fontWeight: '600',
          }}
        >
          Retour à la session 👇
        </Text>
      )}
    </Pressable>
  );
}

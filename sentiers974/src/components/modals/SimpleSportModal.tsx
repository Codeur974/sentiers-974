import React from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';

interface SimpleSportModalProps {
  visible: boolean;
  onClose: () => void;
  onSportSelect: (sport: any) => void;
}

export default function SimpleSportModal({ visible, onClose, onSportSelect }: SimpleSportModalProps) {
  console.log('SimpleSportModal rendered, visible:', visible);
  
  const sports = [
    { nom: "Course", emoji: "🏃‍♀️" },
    { nom: "VTT", emoji: "🚵‍♀️" },
    { nom: "Randonnée", emoji: "🥾" },
  ];

  const handleSportSelect = (sport: any) => {
    console.log('Sport selected:', sport);
    onSportSelect(sport);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
      }}>
        <View style={{
          backgroundColor: 'white',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: '80%',
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#e0e0e0',
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
              ⚽ Choisir un sport
            </Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
              <Text style={{ fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Sports List */}
          <ScrollView style={{ padding: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 16 }}>
              Sports disponibles ({sports.length}) :
            </Text>
            {sports.map((sport, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleSportSelect(sport)}
                style={{
                  padding: 16,
                  marginBottom: 8,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#ddd',
                }}
              >
                <Text style={{ fontSize: 18 }}>
                  {sport.emoji} {sport.nom}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
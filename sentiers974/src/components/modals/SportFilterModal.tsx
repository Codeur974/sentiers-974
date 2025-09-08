import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';

interface SportFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onSportSelect: (sport: any) => void;
}

// Sports data
const sports = [
    {
      nom: "Course",
      emoji: "🏃‍♀️",
      categorie: "terrestre",
      difficulte: "facile",
      description: "Course à pied sur route ou piste",
      caloriesParMinute: 12
    },
    {
      nom: "Trail",
      emoji: "🏃‍♂️",
      categorie: "terrestre",
      difficulte: "difficile",
      description: "Course en nature sur sentiers de montagne",
      caloriesParMinute: 15
    },
    {
      nom: "Marche",
      emoji: "🚶‍♀️",
      categorie: "terrestre",
      difficulte: "facile",
      description: "Marche tranquille en ville ou nature",
      caloriesParMinute: 4
    },
    {
      nom: "Randonnée",
      emoji: "🥾",
      categorie: "terrestre",
      difficulte: "moyen",
      description: "Marche en montagne sur sentiers balisés",
      caloriesParMinute: 7
    },
    {
      nom: "VTT",
      emoji: "🚵‍♀️",
      categorie: "terrestre",
      difficulte: "moyen",
      description: "Vélo tout-terrain sur sentiers",
      caloriesParMinute: 10
    },
    {
      nom: "Vélo",
      emoji: "🚴‍♀️",
      categorie: "terrestre",
      difficulte: "facile",
      description: "Cyclisme sur route ou piste cyclable",
      caloriesParMinute: 8
    },
    {
      nom: "Natation",
      emoji: "🏊‍♀️",
      categorie: "aquatique",
      difficulte: "moyen",
      description: "Nage en piscine, mer ou bassin naturel",
      caloriesParMinute: 11
    },
    {
      nom: "Surf",
      emoji: "🏄‍♀️",
      categorie: "aquatique",
      difficulte: "difficile",
      description: "Surf sur les vagues de l'océan Indien",
      caloriesParMinute: 9
    },
    {
      nom: "SUP",
      emoji: "🏄‍♂️",
      categorie: "aquatique",
      difficulte: "facile",
      description: "Stand Up Paddle en lagon ou mer",
      caloriesParMinute: 6
    },
    {
      nom: "Kayak",
      emoji: "🛶",
      categorie: "aquatique",
      difficulte: "moyen",
      description: "Kayak en mer, rivière ou lagon",
      caloriesParMinute: 5
    },
    {
      nom: "Escalade",
      emoji: "🧗‍♀️",
      categorie: "terrestre",
      difficulte: "difficile",
      description: "Escalade sur falaises ou murs artificiels",
      caloriesParMinute: 8
    }
  ];

export default function SportFilterModal({ visible, onClose, onSportSelect }: SportFilterModalProps) {
  const [selectedSport, setSelectedSport] = useState<any | null>(null);
  
  console.log('SportFilterModal rendered, visible:', visible, 'sports count:', sports.length);

  const handleSportSelect = (sport: any) => {
    setSelectedSport(sport);
    onSportSelect(sport);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              ⚽ Choisir un sport
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Sports List */}
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>
              Choisissez votre sport ({sports.length})
            </Text>
            {sports.map((sport, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handleSportSelect(sport)}
                style={styles.sportItem}
              >
                <View style={styles.sportRow}>
                  <View style={styles.sportLeft}>
                    <Text style={styles.sportEmoji}>{sport.emoji}</Text>
                    <View style={styles.sportInfo}>
                      <Text style={styles.sportName}>
                        {sport.nom}
                      </Text>
                      <Text style={styles.sportDescription} numberOfLines={2}>
                        {sport.description}
                      </Text>
                      <View style={styles.sportTags}>
                        <Text
                          style={[
                            styles.difficultyTag,
                            {
                              backgroundColor: 
                                sport.difficulte === "facile" ? "#dcfce7" :
                                sport.difficulte === "moyen" ? "#fef3c7" : "#fee2e2",
                              color:
                                sport.difficulte === "facile" ? "#166534" :
                                sport.difficulte === "moyen" ? "#b45309" : "#dc2626"
                            }
                          ]}
                        >
                          {sport.difficulte === "facile" ? "🟢" :
                           sport.difficulte === "moyen" ? "🟡" : "🔴"}{" "}
                          {sport.difficulte}
                        </Text>
                        <Text style={styles.categoryTag}>
                          {sport.categorie === "terrestre" ? "🏔️" : "🌊"}{" "}
                          {sport.categorie}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.sportRight}>
                    <Text style={styles.caloriesText}>
                      {sport.caloriesParMinute} cal/min
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    color: '#6b7280',
    fontSize: 18,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1f2937',
  },
  sportItem: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sportEmoji: {
    fontSize: 24,
    marginRight: 16,
  },
  sportInfo: {
    flex: 1,
  },
  sportName: {
    fontWeight: '600',
    color: '#1f2937',
    fontSize: 18,
  },
  sportDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  sportTags: {
    flexDirection: 'row',
    marginTop: 8,
  },
  difficultyTag: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  categoryTag: {
    fontSize: 12,
    backgroundColor: '#f3f4f6',
    color: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sportRight: {
    alignItems: 'flex-end',
  },
  caloriesText: {
    fontSize: 12,
    color: '#6b7280',
  },
});
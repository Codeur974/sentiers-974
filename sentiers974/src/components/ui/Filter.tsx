import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { useState, useImperativeHandle, useEffect, forwardRef } from "react";

interface FilterProps {
  onSportSelect?: (sport: any) => void;
  onCloseFilter?: () => void;
  autoOpen?: boolean;
  showCloseButton?: boolean;
  visible?: boolean;
}

export interface FilterRef {
  closeSportsFilter: () => void;
}

const Filter = forwardRef<FilterRef, FilterProps>(({ onSportSelect, onCloseFilter, autoOpen = false, showCloseButton = false, visible }, ref) => {
  const [sportSelected, setSportSelected] = useState<any | null>(null);
  const [showSports, setShowSports] = useState(autoOpen);

  // Exposer la fonction pour fermer le filtre
  useImperativeHandle(ref, () => ({
    closeSportsFilter: () => setShowSports(false)
  }));

  useEffect(() => {
    if (visible && autoOpen) {
      setShowSports(true);
    }
  }, [visible, autoOpen]);

  // Sports data intégré directement pour éviter les problèmes d'import JSON
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

  const handleSportSelect = (sport: any) => {
    setSportSelected(sport);
    setShowSports(false); // Fermer la liste après sélection
    onSportSelect?.(sport);
  };

  return (
    <View className="p-4">
      {/* Bouton pour afficher les sports - masqué si autoOpen */}
      {!autoOpen && (
        <TouchableOpacity
          className="bg-blue-600 p-4 rounded-xl mb-4"
          onPress={() => {
            const willShow = !showSports;
            setShowSports(willShow);
            // Si on ouvre le filtre, fermer les sections photos
            if (willShow) {
              onCloseFilter?.();
            }
          }}
        >
          <Text className="text-white font-semibold text-center text-lg">
            {showSports ? "🔽 Masquer les sports" : "⚽ Choisir un sport"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Sport sélectionné */}
      {sportSelected && (
        <View className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
          <Text className="text-blue-800 font-semibold">
            Sport sélectionné: {sportSelected.emoji} {sportSelected.nom}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setSportSelected(null);
              onSportSelect?.(null);
            }}
            className="mt-2"
          >
            <Text className="text-blue-600 text-sm">❌ Désélectionner</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Liste des sports */}
      {showSports && (
        <ScrollView 
          className="max-h-80"
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={true}
        >
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-gray-800">
              Choisissez votre sport ({sports.length})
            </Text>
            {showCloseButton && (
              <TouchableOpacity
                onPress={onCloseFilter}
                className="p-1"
              >
                <Text className="text-lg">✕</Text>
              </TouchableOpacity>
            )}
          </View>
          {sports.map((sport, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handleSportSelect(sport)}
              className={`p-3 mb-2 rounded-xl border ${
                sportSelected?.nom === sport.nom
                  ? "bg-blue-100 border-blue-300"
                  : "bg-white border-gray-200"
              }`}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <Text className="text-2xl mr-3">{sport.emoji}</Text>
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-800">
                      {sport.nom}
                    </Text>
                    <Text className="text-sm text-gray-600" numberOfLines={2}>
                      {sport.description}
                    </Text>
                    <View className="flex-row mt-1">
                      <Text
                        className={`text-xs px-2 py-1 rounded-full mr-2 ${
                          sport.difficulte === "facile"
                            ? "bg-green-100 text-green-700"
                            : sport.difficulte === "moyen"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {sport.difficulte === "facile"
                          ? "🟢"
                          : sport.difficulte === "moyen"
                          ? "🟡"
                          : "🔴"}{" "}
                        {sport.difficulte}
                      </Text>
                      <Text className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                        {sport.categorie === "terrestre" ? "🏔️" : "🌊"}{" "}
                        {sport.categorie}
                      </Text>
                    </View>
                  </View>
                </View>
                <Text className="text-xs text-gray-500">
                  {sport.caloriesParMinute} cal/min
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
});

Filter.displayName = 'Filter';

export default Filter;

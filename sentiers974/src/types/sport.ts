type SportNom =
  | "Course"
  | "Trail"
  | "Marche"
  | "Randonnée"
  | "VTT"
  | "Vélo"
  | "Natation"
  | "Surf"
  | "SUP"
  | "Kayak"
  | "Escalade";

export type Sport = {
  nom: SportNom;
  emoji: string;
};
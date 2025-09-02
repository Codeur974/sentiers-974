export interface SportEvent {
  id: string;
  title: string;
  sport: string;
  emoji: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  location: string;
  description: string;
  difficulty: 'facile' | 'moyen' | 'difficile';
  distance?: string;
  elevation?: string;
  organizer: string;
  registration: string;
  price: string;
  image?: string;
  website?: string;
}
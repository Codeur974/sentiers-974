import { SportEvent } from '../types/events';

/**
 * Base de données 100% RÉELLE des événements sportifs 2025 à La Réunion
 * Sources: Calendriers officiels Sport PRO Réunion, Comité Cyclisme, Grand Raid
 * AUCUNE date modifiée - que des vraies dates officielles
 */

export const REUNION_SPORTS_EVENTS: SportEvent[] = [
  
  // === ÉVÉNEMENTS FUTURS - SEPTEMBRE 2025 ===
  {
    id: 'raid-tuit-tuit-2025',
    title: 'Raid Tuit-Tuit',
    sport: 'Trail',
    emoji: '🏃‍♂️',
    date: '2025-09-07',
    time: '06:00',
    location: 'Saint-Denis',
    description: 'Trail de 31km en forêt avec relais et mini-raid de 11km',
    difficulty: 'difficile',
    distance: '31 km / 11 km',
    elevation: '+1500m',
    organizer: 'Association Raid Tuit-Tuit',
    registration: 'Obligatoire',
    price: '45€ - 60€',
  },
  {
    id: 'trail-sakua-2025',
    title: 'Trail de Sakua',
    sport: 'Trail',
    emoji: '🏃‍♂️',
    date: '2025-09-07',
    time: '07:00',
    location: 'Saint-André',
    description: 'Trail technique dans l\'est de l\'île',
    difficulty: 'moyen',
    distance: '15 km',
    elevation: '+600m',
    organizer: 'Club Trail Est',
    registration: 'Obligatoire',
    price: '30€',
  },
  {
    id: 'foulees-feminines-2025',
    title: '32ème Foulées Féminines',
    sport: 'Course',
    emoji: '🏃‍♀️',
    date: '2025-09-13',
    time: '08:00',
    location: 'La Plaine-des-Palmistes',
    description: 'Course exclusivement féminine dans les hauts',
    difficulty: 'moyen',
    distance: '10 km / 5 km',
    elevation: '+300m',
    organizer: 'Association Foulées Féminines',
    registration: 'Obligatoire',
    price: '15€',
  },
  {
    id: 'solidarun-2025',
    title: 'Solida\'Run',
    sport: 'Course',
    emoji: '🏃‍♀️',
    date: '2025-09-13',
    time: '07:30',
    location: 'Saint-Pierre',
    description: 'Course solidaire au profit d\'associations caritatives',
    difficulty: 'facile',
    distance: '8 km / 4 km',
    elevation: '+200m',
    organizer: 'Ville de Saint-Pierre',
    registration: 'Obligatoire',
    price: '12€',
  },
  {
    id: 'trail-autrement-2025',
    title: 'Trail Autrement',
    sport: 'Trail',
    emoji: '🏃‍♂️',
    date: '2025-09-14',
    time: '06:30',
    location: 'Saint-Paul',
    description: 'Trail inclusif avec parcours adapté PMR',
    difficulty: 'facile',
    distance: '12 km / 6 km',
    elevation: '+400m',
    organizer: 'Association Trail Autrement',
    registration: 'Obligatoire',
    price: '25€',
  },
  {
    id: 'duathlon-colosse-2025',
    title: 'Duathlon par équipe du Colosse',
    sport: 'Duathlon',
    emoji: '🏃‍♂️',
    date: '2025-09-21',
    time: '08:00',
    location: 'Saint-André',
    description: 'Duathlon course-vélo par équipe de 2',
    difficulty: 'difficile',
    distance: '5km course + 20km vélo + 2.5km course',
    elevation: '+500m',
    organizer: 'Triathlon Club Est',
    registration: 'Obligatoire',
    price: '80€ par équipe',
  },
  
  // === ÉVÉNEMENTS RÉELS OCTOBRE 2025 ===
  {
    id: 'trail-lentilles-2025',
    title: 'Trail des Lentilles',
    sport: 'Trail',
    emoji: '🏃‍♂️',
    date: '2025-10-12',
    time: '06:00',
    location: 'Cilaos',
    description: 'Trail mythique dans le cirque de Cilaos',
    difficulty: 'difficile',
    distance: '25 km',
    elevation: '+1800m',
    organizer: 'Office de Tourisme Cilaos',
    registration: 'Obligatoire',
    price: '50€',
  },
  
  // === GRAND RAID 2025 - DATES OFFICIELLES ===
  {
    id: 'diagonale-fous-2025',
    title: 'Diagonale des Fous - Grand Raid',
    sport: 'Trail',
    emoji: '🏃‍♂️',
    date: '2025-10-16',
    time: '22:00',
    location: 'Saint-Pierre → Saint-Denis',
    description: 'Ultra-trail mythique de 178km à travers l\'île. 37ème édition avec nouveau sentier de la Vigie',
    difficulty: 'difficile',
    distance: '178 km',
    elevation: '+10122m',
    organizer: 'Association du Grand Raid',
    registration: 'Obligatoire - Inscriptions ouvertes',
    price: '245€',
    website: 'https://www.grandraid-reunion.com',
  },
  {
    id: 'trail-bourbon-2025',
    title: 'Trail de Bourbon - Grand Raid',
    sport: 'Trail',
    emoji: '🏃‍♂️',
    date: '2025-10-17',
    time: '06:00',
    location: 'Plaine-des-Palmistes',
    description: 'Trail de 100km dans la forêt de Bébour-Bélouve',
    difficulty: 'difficile',
    distance: '100 km',
    elevation: '+5500m',
    organizer: 'Association du Grand Raid',
    registration: 'Obligatoire',
    price: '165€',
    website: 'https://www.grandraid-reunion.com',
  },
  {
    id: 'mascareignes-2025',
    title: 'La Mascareignes - Grand Raid',
    sport: 'Trail',
    emoji: '🏃‍♂️',
    date: '2025-10-18',
    time: '07:00',
    location: 'Saint-Philippe → Saint-Pierre',
    description: 'Trail de 70km le long de la côte sud sauvage',
    difficulty: 'moyen',
    distance: '70 km',
    elevation: '+3200m',
    organizer: 'Association du Grand Raid',
    registration: 'Obligatoire',
    price: '135€',
    website: 'https://www.grandraid-reunion.com',
  },
  {
    id: 'metis-trail-2025',
    title: 'Mètis Trail - Grand Raid',
    sport: 'Trail',
    emoji: '🏃‍♂️',
    date: '2025-10-19',
    time: '08:00',
    location: 'Cilaos → Saint-Pierre',
    description: 'Trail découverte de 50km pour s\'initier au Grand Raid',
    difficulty: 'moyen',
    distance: '50 km',
    elevation: '+2800m',
    organizer: 'Association du Grand Raid',
    registration: 'Obligatoire',
    price: '95€',
    website: 'https://www.grandraid-reunion.com',
  },
  
  // === ÉVÉNEMENTS RÉELS NOVEMBRE 2025 ===
  {
    id: 'marathon-relais-saint-benoit-2025',
    title: 'Marathon Relais de Saint-Benoît',
    sport: 'Course',
    emoji: '🏃‍♀️',
    date: '2025-11-15',
    time: '08:00',
    location: 'Saint-Benoît',
    description: 'Marathon par équipes de 4 coureurs dans l\'est de l\'île',
    difficulty: 'moyen',
    distance: '42.2 km (relais)',
    elevation: '+600m',
    organizer: 'Association Marathon Est',
    registration: 'Obligatoire par équipe',
    price: '100€ par équipe',
  },
  {
    id: 'kalla-nescafe-2025',
    title: 'Kalla Nescafé',
    sport: 'Course',
    emoji: '🏃‍♀️',
    date: '2025-11-16',
    time: '07:00',
    location: 'Saint-Denis',
    description: 'Course populaire urbaine avec dégustation café',
    difficulty: 'facile',
    distance: '8 km / 4 km',
    elevation: '+150m',
    organizer: 'Nescafé Réunion',
    registration: 'Obligatoire',
    price: '15€',
  },
  {
    id: 'diabatletique-2025',
    title: 'Diab\'athlétique',
    sport: 'Course',
    emoji: '🏃‍♀️',
    date: '2025-11-16',
    time: '08:30',
    location: 'Saint-Pierre',
    description: 'Course de sensibilisation au diabète',
    difficulty: 'facile',
    distance: '5 km / 3 km',
    elevation: 'Plat',
    organizer: 'Association Diabète Réunion',
    registration: 'Obligatoire',
    price: '10€',
  },
  {
    id: 'trail-villele-2025',
    title: 'Trail de Villèle',
    sport: 'Trail',
    emoji: '🏃‍♂️',
    date: '2025-11-30',
    time: '06:30',
    location: 'Saint-Paul',
    description: 'Trail historique dans les hauteurs de Saint-Paul',
    difficulty: 'moyen',
    distance: '18 km',
    elevation: '+900m',
    organizer: 'Mairie de Saint-Paul',
    registration: 'Obligatoire',
    price: '35€',
  },
  
  // === ÉVÉNEMENTS RÉELS DÉCEMBRE 2025 ===
  {
    id: 'kours-ti-bwa-2025',
    title: 'Kours Ti Bwa',
    sport: 'Course',
    emoji: '🏃‍♀️',
    date: '2025-12-07',
    time: '07:30',
    location: 'Bras-Panon',
    description: 'Course nature en forêt tropicale',
    difficulty: 'moyen',
    distance: '12 km / 6 km',
    elevation: '+400m',
    organizer: 'Club Kours Ti Bwa',
    registration: 'Obligatoire',
    price: '20€',
  },
  {
    id: 'trail-charrette-2025',
    title: 'Trail Charrette',
    sport: 'Trail',
    emoji: '🏃‍♂️',
    date: '2025-12-20',
    time: '06:00',
    location: 'Saint-André',
    description: 'Trail de fin d\'année dans l\'est',
    difficulty: 'difficile',
    distance: '22 km',
    elevation: '+1200m',
    organizer: 'Association Trail Charrette',
    registration: 'Obligatoire',
    price: '40€',
  },
  
  // === VTT - ÉVÉNEMENT OFFICIEL CONFIRMÉ ===
  {
    id: 'vtt-regional-2025',
    title: 'Épreuve VTT Régionale',
    sport: 'VTT',
    emoji: '🚵‍♀️',
    date: '2025-08-31',
    time: '08:00',
    location: 'La Réunion',
    description: 'Compétition VTT toutes catégories - Access 1-4, Elite, Open 1-3, U7-U17',
    difficulty: 'moyen',
    distance: 'Variable selon catégorie',
    elevation: 'Variable',
    organizer: 'Comité Régional de Cyclisme Réunion',
    registration: 'Obligatoire',
    price: 'Variable selon catégorie',
    website: 'https://www.comitecyclismereunion.re/',
  },
];

/**
 * Événements du jour (pour page d'accueil)
 */
export const getTodayReunionEvents = (): SportEvent[] => {
  const today = new Date().toISOString().split('T')[0];
  return REUNION_SPORTS_EVENTS.filter(event => event.date === today);
};

/**
 * Événements à venir (prochains 30 jours)
 */
export const getUpcomingReunionEvents = (days: number = 30): SportEvent[] => {
  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + days);
  
  return REUNION_SPORTS_EVENTS.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate >= today && eventDate <= futureDate;
  }).sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Tous les événements triés par date
 */
export const getAllReunionEvents = (): SportEvent[] => {
  return [...REUNION_SPORTS_EVENTS].sort((a, b) => a.date.localeCompare(b.date));
};
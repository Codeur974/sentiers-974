const mongoose = require('mongoose');

const SentierSchema = new mongoose.Schema({
  // Identifiants
  randopitons_id: { type: String, unique: true, required: true },
  url: { type: String, required: true },
  
  // Informations de base
  nom: { type: String, required: true },
  difficulte: { 
    type: String, 
    enum: ['Facile', 'Modéré', 'Difficile', 'Très difficile', 'Expert'],
    required: true 
  },
  type: { 
    type: String, 
    enum: ['Randonnée', 'VTT', 'Trail'],
    default: 'Randonnée' 
  },
  
  // Localisation et région
  region: {
    type: String,
    enum: [
      'Cirque de Cilaos',
      'Cirque de Mafate', 
      'Cirque de Salazie',
      'Est',
      'Nord',
      'Ouest',
      'Sud',
      'Volcan'
    ],
    required: true
  },
  commune_depart: { type: String }, // Commune de départ
  zone_specifique: { type: String }, // Sous-zone plus précise
  
  // Caractéristiques physiques
  distance: { type: Number, required: true }, // en km
  duree: { 
    heures: { type: Number, required: true },
    minutes: { type: Number, default: 0 }
  },
  denivele_positif: { type: Number, required: true }, // en mètres
  denivele_negatif: { type: Number },
  altitude_min: { type: Number },
  altitude_max: { type: Number },
  
  // Descriptions et contenus détaillés
  description_courte: { type: String },
  description_complete: { type: String }, // Description détaillée de la page
  itineraire_detaille: { type: String }, // Itinéraire étape par étape
  conseils_pratiques: { type: String },
  acces_detaille: { type: String }, // Comment accéder au point de départ
  
  // Points géographiques
  point_depart: {
    nom: { type: String, required: true },
    coordonnees: {
      longitude: { type: Number, required: true },
      latitude: { type: Number, required: true }
    },
    altitude: { type: Number },
    acces_voiture: { type: Boolean, default: true },
    parking_disponible: { type: Boolean, default: true },
    description_acces: { type: String }
  },
  point_arrivee: {
    nom: { type: String },
    coordonnees: {
      longitude: { type: Number },
      latitude: { type: Number }
    },
    altitude: { type: Number }
  },
  
  // Points d'intérêt sur le parcours
  points_interet: [{
    nom: { type: String, required: true },
    description: { type: String },
    coordonnees: {
      longitude: { type: Number },
      latitude: { type: Number }
    },
    photos: [{ type: String }] // URLs des photos
  }],
  
  // Équipements et préparation
  equipements_obligatoires: [{ type: String }],
  equipements_recommandes: [{ type: String }],
  niveau_technique_requis: { type: String },
  
  // Sécurité et précautions
  dangers: [{ type: String }],
  precautions: [{ type: String }],
  restrictions: [{ type: String }],
  interdictions: [{ type: String }],
  
  // Conditions et météo
  periode_ideale: {
    debut: { type: String }, // mois de début
    fin: { type: String }    // mois de fin
  },
  conditions_meteo: { type: String },
  saison_deconseille: [{ type: String }],
  
  // Services et commodités
  services_proximite: {
    hebergements: [{ type: String }],
    restaurants: [{ type: String }],
    locations_materiel: [{ type: String }],
    guides_locaux: [{ type: String }]
  },
  
  // Contacts d'urgence
  contacts_urgence: {
    secours_montagne: { type: String, default: '02 62 93 37 37' },
    gendarmerie: { type: String, default: '17' },
    pompiers: { type: String, default: '18' }
  },
  
  // Balisage et navigation
  balisage: {
    couleur: { type: String },
    type: { type: String },
    etat: { 
      type: String, 
      enum: ['Excellent', 'Bon', 'Moyen', 'Dégradé', 'Inexistant'],
      default: 'Bon' 
    },
    description: { type: String }
  },
  
  // Données techniques
  trace_gpx: { type: String }, // URL vers fichier GPX
  cartes_ign: [{ type: String }], // Références des cartes IGN
  
  // Médias
  photos: [{
    url: { type: String },
    description: { type: String },
    auteur: { type: String }
  }],
  
  // Métadonnées
  source: { 
    type: String, 
    default: 'Randopitons'
  },
  certification_officielle: { type: Boolean, default: false },
  derniere_mise_a_jour_site: { type: Date },
  derniere_verification: { type: Date },
  
  // Données de scraping
  scraped_at: { type: Date, default: Date.now },
  raw_data: { type: mongoose.Schema.Types.Mixed }, // Données brutes pour debugging
  
  // Statistiques et évaluations
  popularite: { type: Number, default: 0 },
  evaluations: [{
    note: { type: Number, min: 1, max: 5 },
    commentaire: { type: String },
    auteur: { type: String },
    date: { type: Date }
  }]
}, {
  timestamps: true,
  collection: 'sentiers'
});

// Index pour les recherches
SentierSchema.index({ nom: 'text', description_complete: 'text' });
SentierSchema.index({ difficulte: 1, distance: 1 });
SentierSchema.index({ region: 1 });
SentierSchema.index({ commune_depart: 1 });
SentierSchema.index({ type: 1 });
SentierSchema.index({ 'point_depart.coordonnees.longitude': 1, 'point_depart.coordonnees.latitude': 1 });

// Méthodes virtuelles
SentierSchema.virtual('duree_formatee').get(function() {
  const h = this.duree.heures;
  const m = this.duree.minutes;
  return m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
});

SentierSchema.virtual('coordonnees').get(function() {
  return [this.point_depart.coordonnees.longitude, this.point_depart.coordonnees.latitude];
});

// Méthodes d'instance
SentierSchema.methods.toClientFormat = function() {
  return {
    id: this.randopitons_id,
    nom: this.nom,
    difficulte: this.difficulte,
    distance: this.distance,
    duree_heures: this.duree.heures + (this.duree.minutes / 60),
    duree_formatee: this.duree.minutes > 0 ? `${this.duree.heures}h${this.duree.minutes.toString().padStart(2, '0')}` : `${this.duree.heures}h`,
    denivele_positif: this.denivele_positif,
    denivele_negatif: this.denivele_negatif,
    type: this.type,
    region: this.region,
    zone_specifique: this.zone_specifique,
    commune_depart: this.commune_depart,
    description: this.description_complete || this.description_courte,
    points_interet: this.points_interet.map(p => p.nom),
    point_depart: {
      nom: this.point_depart.nom,
      coordonnees: [this.point_depart.coordonnees.longitude, this.point_depart.coordonnees.latitude],
      altitude: this.point_depart.altitude,
      acces_voiture: this.point_depart.acces_voiture,
      parking_disponible: this.point_depart.parking_disponible
    },
    equipements_requis: this.equipements_obligatoires,
    equipements_recommandes: this.equipements_recommandes,
    periode_ideale: this.periode_ideale,
    restrictions: this.restrictions,
    dangers: this.dangers,
    services_proximite: this.services_proximite,
    contact_urgence: {
      secours_montagne: this.contacts_urgence.secours_montagne,
      gendarmerie: this.contacts_urgence.gendarmerie
    },
    derniere_mise_a_jour: this.derniere_mise_a_jour_site,
    source: this.source,
    certification_officielle: this.certification_officielle,
    balisage: this.balisage
  };
};

module.exports = mongoose.model('Sentier', SentierSchema);
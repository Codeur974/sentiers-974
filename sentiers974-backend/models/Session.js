const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  // Identifiant unique de la session
  sessionId: { type: String, required: true, unique: true },

  // Informations utilisateur
  // ⚠️ PEUT ÊTRE :
  // - ObjectId (référence vers User pour compte connecté)
  // - String (deviceId pour utilisateur anonyme)
  userId: {
    type: mongoose.Schema.Types.Mixed, // Accepte ObjectId OU String
    required: true,
    default: 'anonymous'
  },
  
  // Sport pratiqué
  sport: {
    nom: { type: String, required: true },
    emoji: { type: String }
  },
  
  // Données de performance
  distance: { type: Number, default: 0 }, // en mètres
  duration: { type: Number, default: 0 }, // en millisecondes
  calories: { type: Number, default: 0 },
  avgSpeed: { type: Number, default: 0 }, // km/h
  maxSpeed: { type: Number, default: 0 }, // km/h
  steps: { type: Number, default: 0 },
  
  // Données GPS et trajet
  startCoordinates: {
    latitude: { type: Number },
    longitude: { type: Number },
    accuracy: { type: Number }
  },
  endCoordinates: {
    latitude: { type: Number },
    longitude: { type: Number },
    accuracy: { type: Number }
  },
  trackingPath: [{
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    timestamp: { type: Number, required: true },
    accuracy: { type: Number },
    altitude: { type: Number },
    speed: { type: Number }
  }],
  
  // Points d'intérêt créés pendant la session
  pois: [{
    id: { type: String, required: true },
    title: { type: String, required: true },
    note: { type: String },
    coordinates: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true }
    },
    photo: { type: String }, // URL ou path de la photo
    timestamp: { type: Number, required: true }
  }],
  
  // Photos prises pendant la session
  photos: [{
    id: { type: String, required: true },
    uri: { type: String, required: true },
    coordinates: {
      latitude: { type: Number },
      longitude: { type: Number }
    },
    timestamp: { type: Number, required: true },
    caption: { type: String }
  }],
  
  // Statut de la session
  status: {
    type: String,
    enum: ['active', 'running', 'paused', 'completed', 'stopped', 'interrupted'],
    default: 'completed'
  },
  
  // Métadonnées
  deviceInfo: {
    platform: { type: String },
    version: { type: String }
  },
  
  // Localisation de départ (ville/région)
  startLocation: {
    address: { type: String },
    region: { type: String },
    commune: { type: String }
  }
  
}, {
  timestamps: true, // Ajoute automatiquement createdAt et updatedAt
  collection: 'sessions'
});

// Index pour les recherches (sessionId déjà unique automatiquement)
SessionSchema.index({ userId: 1 });
SessionSchema.index({ 'sport.nom': 1 });
SessionSchema.index({ createdAt: -1 });
SessionSchema.index({ startLocation: 1 });

// Méthodes virtuelles
SessionSchema.virtual('distanceKm').get(function() {
  return (this.distance / 1000).toFixed(2);
});

SessionSchema.virtual('durationFormatted').get(function() {
  const hours = Math.floor(this.duration / (1000 * 60 * 60));
  const minutes = Math.floor((this.duration % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((this.duration % (1000 * 60)) / 1000);
  
  if (hours > 0) {
    return `${hours}h${minutes.toString().padStart(2, '0')}min`;
  } else if (minutes > 0) {
    return `${minutes}min${seconds.toString().padStart(2, '0')}s`;
  } else {
    return `${seconds}s`;
  }
});

// Méthode pour format client
SessionSchema.methods.toClientFormat = function() {
  const poisWithPhotos = (this.pois || []).filter((p) => p.photo);
  const photosFromPois = poisWithPhotos.map((p) => ({
    id: p.id,
    uri: p.photo,
    url: p.photo,
    timestamp: p.timestamp,
    title: p.title,
  }));

  // Dédupliquer photos (session.photos + photos issues des POI) pour éviter les doublons
  const photosArray = [];
  const seen = new Set();
  [...(this.photos || []), ...photosFromPois].forEach((ph) => {
    const key = ph.id || ph.url || ph.uri;
    if (key && !seen.has(key)) {
      seen.add(key);
      photosArray.push(ph);
    }
  });

  return {
    id: this.sessionId,
    sport: this.sport,
    distance: this.distance,
    distanceKm: this.distanceKm,
    duration: this.duration,
    durationFormatted: this.durationFormatted,
    calories: this.calories,
    avgSpeed: this.avgSpeed,
    maxSpeed: this.maxSpeed,
    steps: this.steps,
    poisCount: this.pois ? this.pois.length : 0,
    photosCount: photosArray.length,
    photos: photosArray, // Inclure les photos pour l'historique
    status: this.status,
    startLocation: this.startLocation,
    date: this.createdAt,
    trackingPathLength: this.trackingPath ? this.trackingPath.length : 0
  };
};

module.exports = mongoose.model('Session', SessionSchema);

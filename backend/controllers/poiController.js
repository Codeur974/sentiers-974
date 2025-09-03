const PointOfInterest = require("../models/pointOfInterest");
const Activity = require("../models/activity");
const mongoose = require("mongoose");

// Créer un nouveau POI
exports.createPOI = async (req, res) => {
  try {
    const {
      activity,
      title,
      note,
      location,
      tracking,
      photo
    } = req.body;

    // Utiliser l'activityId fourni (sessionId) ou créer un ObjectId si nécessaire
    console.log('📥 Activity reçu:', activity, 'Type:', typeof activity);
    let activityId;
    if (typeof activity === 'string') {
      // Si c'est une chaîne, on la garde telle quelle pour pouvoir la retrouver
      activityId = activity;
      console.log('🎯 Utilisation du sessionId comme activityId:', activityId);
    } else {
      activityId = activity || new mongoose.Types.ObjectId();
      console.log('🆔 Génération d\'un nouvel ObjectId:', activityId);
    }
      
    const userId = new mongoose.Types.ObjectId();

    const poi = new PointOfInterest({
      activity: activityId,
      user: userId,
      title,
      note,
      location,
      tracking,
      photo
    });

    const savedPOI = await poi.save();
    
    // Ajouter l'URL complète de la photo si elle existe
    if (savedPOI.photo && savedPOI.photo.filename) {
      savedPOI.photo.url = `http://${req.get('host')}/uploads/${savedPOI.photo.filename}`;
    }
    
    console.log(`✅ POI créé: ${savedPOI.title}`);
    res.status(201).json({
      success: true,
      data: savedPOI
    });
  } catch (error) {
    console.error('❌ Erreur création POI:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du POI',
      error: error.message
    });
  }
};

// Obtenir tous les POI d'une activité
exports.getActivityPOIs = async (req, res) => {
  try {
    const { activityId } = req.params;
    
    const pois = await PointOfInterest.find({ activity: activityId })
      .sort({ createdAt: -1 });
    
    // Ajouter les URLs complètes des photos
    const poisWithUrls = pois.map(poi => {
      const poiObj = poi.toObject();
      if (poiObj.photo && poiObj.photo.filename) {
        poiObj.photo.url = `http://${req.get('host')}/uploads/${poiObj.photo.filename}`;
      }
      return poiObj;
    });
    
    console.log(`📍 ${pois.length} POI trouvés pour l'activité ${activityId}`);
    res.json({
      success: true,
      data: poisWithUrls
    });
  } catch (error) {
    console.error('❌ Erreur récupération POI:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des POI',
      error: error.message
    });
  }
};

// Supprimer un POI
exports.deletePOI = async (req, res) => {
  try {
    const { id } = req.params;
    
    const poi = await PointOfInterest.findByIdAndDelete(id);
    
    if (!poi) {
      return res.status(404).json({
        success: false,
        message: 'POI non trouvé'
      });
    }
    
    console.log(`🗑️ POI supprimé: ${poi.title}`);
    res.json({
      success: true,
      message: 'POI supprimé avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur suppression POI:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du POI',
      error: error.message
    });
  }
};

// Obtenir tous les POI de l'utilisateur
exports.getUserPOIs = async (req, res) => {
  try {
    // Pour l'instant, userId fictif
    const userId = "temp_user_id";
    
    const pois = await PointOfInterest.find({ user: userId })
      .populate('activity', 'title activityType date')
      .sort({ createdAt: -1 });
    
    console.log(`📍 ${pois.length} POI trouvés pour l'utilisateur`);
    res.json({
      success: true,
      data: pois
    });
  } catch (error) {
    console.error('❌ Erreur récupération POI utilisateur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des POI',
      error: error.message
    });
  }
};
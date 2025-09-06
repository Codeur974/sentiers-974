const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const Sentier = require('./models/Sentier');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: true, // Autoriser toutes les origines pour le dev
  credentials: true
}));
app.use(express.json());

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connecté'))
.catch(err => console.error('❌ Erreur MongoDB:', err));

// Routes API

/**
 * GET /api/sentiers
 * Récupère tous les sentiers avec filtres optionnels
 * Query params:
 * - region: Filtrer par région
 * - difficulte: Filtrer par difficulté
 * - type: Filtrer par type (Randonnée, VTT, Trail)
 * - commune: Filtrer par commune de départ
 * - distance_min, distance_max: Filtrer par distance
 * - duree_min, duree_max: Filtrer par durée (en heures)
 * - search: Recherche textuelle
 * - limit: Nombre max de résultats (défaut: 50)
 * - page: Page pour pagination (défaut: 1)
 */
app.get('/api/sentiers', async (req, res) => {
  try {
    const {
      region,
      zone_specifique,
      difficulte,
      type,
      commune,
      distance_min,
      distance_max,
      duree_min,
      duree_max,
      search,
      limit = 200,
      page = 1
    } = req.query;

    // Construction de la requête
    let query = {};
    
    if (region) query.region = region;
    if (zone_specifique) query.zone_specifique = zone_specifique;
    if (difficulte) query.difficulte = difficulte;
    if (type) query.type = type;
    if (commune) query.commune_depart = new RegExp(commune, 'i');
    
    if (distance_min || distance_max) {
      query.distance = {};
      if (distance_min) query.distance.$gte = parseFloat(distance_min);
      if (distance_max) query.distance.$lte = parseFloat(distance_max);
    }
    
    if (duree_min || duree_max) {
      const dureeMinHours = duree_min ? parseFloat(duree_min) : 0;
      const dureeMaxHours = duree_max ? parseFloat(duree_max) : 24;
      
      query.$expr = {
        $and: [
          { $gte: [{ $add: ['$duree.heures', { $divide: ['$duree.minutes', 60] }] }, dureeMinHours] },
          { $lte: [{ $add: ['$duree.heures', { $divide: ['$duree.minutes', 60] }] }, dureeMaxHours] }
        ]
      };
    }
    
    if (search) {
      query.$text = { $search: search };
    }

    // Pagination
    const limitNum = Math.min(parseInt(limit), 1000); // Max 1000 résultats
    const skip = (parseInt(page) - 1) * limitNum;

    // Exécution de la requête
    const sentiers = await Sentier.find(query)
      .limit(limitNum)
      .skip(skip)
      .sort({ randopitons_id: 1 });

    const total = await Sentier.countDocuments(query);

    res.json({
      success: true,
      data: sentiers.map(s => s.toClientFormat()),
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Erreur /api/sentiers:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

/**
 * GET /api/sentiers/:id
 * Récupère un sentier spécifique par son ID
 */
app.get('/api/sentiers/:id', async (req, res) => {
  try {
    const sentier = await Sentier.findOne({ randopitons_id: req.params.id });
    
    if (!sentier) {
      return res.status(404).json({
        success: false,
        error: 'Sentier non trouvé'
      });
    }

    res.json({
      success: true,
      data: {
        ...sentier.toClientFormat(),
        // Données détaillées supplémentaires pour la vue détaillée
        itineraire_detaille: sentier.itineraire_detaille,
        conseils_pratiques: sentier.conseils_pratiques,
        acces_detaille: sentier.acces_detaille,
        altitude_min: sentier.altitude_min,
        altitude_max: sentier.altitude_max,
        photos: sentier.photos,
        evaluations: sentier.evaluations,
        trace_gpx: sentier.trace_gpx
      }
    });

  } catch (error) {
    console.error('Erreur /api/sentiers/:id:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

/**
 * GET /api/regions
 * Récupère la liste des régions avec le nombre de sentiers
 */
app.get('/api/regions', async (req, res) => {
  try {
    const regions = await Sentier.aggregate([
      {
        $group: {
          _id: '$region',
          count: { $sum: 1 },
          types: { $addToSet: '$type' },
          difficulties: { $addToSet: '$difficulte' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      success: true,
      data: regions.map(r => ({
        nom: r._id,
        nombre_sentiers: r.count,
        types_disponibles: r.types,
        difficultes_disponibles: r.difficulties
      }))
    });

  } catch (error) {
    console.error('Erreur /api/regions:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

/**
 * GET /api/regions/hierarchie
 * Récupère la hiérarchie complète régions > sous-régions comme sur Randopitons.re
 */
app.get('/api/regions/hierarchie', async (req, res) => {
  try {
    const hierarchie = await Sentier.aggregate([
      {
        $group: {
          _id: {
            region: '$region',
            zone_specifique: '$zone_specifique'
          },
          count: { $sum: 1 },
          types: { $addToSet: '$type' },
          difficulties: { $addToSet: '$difficulte' }
        }
      },
      {
        $group: {
          _id: '$_id.region',
          total_sentiers: { $sum: '$count' },
          sous_regions: {
            $push: {
              nom: '$_id.zone_specifique',
              nombre_sentiers: '$count',
              types_disponibles: '$types',
              difficultes_disponibles: '$difficulties'
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      success: true,
      data: hierarchie.map(region => ({
        region: region._id,
        nombre_total_sentiers: region.total_sentiers,
        sous_regions: region.sous_regions
          .filter(sr => sr.nom) // Exclure les null/undefined
          .sort((a, b) => b.nombre_sentiers - a.nombre_sentiers) // Tri par nombre de sentiers
      }))
    });

  } catch (error) {
    console.error('Erreur /api/regions/hierarchie:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

/**
 * GET /api/regions/:region/sous-regions
 * Récupère les sous-régions d'une région spécifique
 */
app.get('/api/regions/:region/sous-regions', async (req, res) => {
  try {
    const { region } = req.params;
    
    const sousRegions = await Sentier.aggregate([
      {
        $match: { 
          region: region,
          zone_specifique: { $ne: null, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$zone_specifique',
          count: { $sum: 1 },
          types: { $addToSet: '$type' },
          difficulties: { $addToSet: '$difficulte' },
          exemples: { 
            $push: {
              nom: '$nom',
              difficulte: '$difficulte',
              distance: '$distance'
            }
          }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    res.json({
      success: true,
      region: region,
      data: sousRegions.map(sr => ({
        nom: sr._id,
        nombre_sentiers: sr.count,
        types_disponibles: sr.types,
        difficultes_disponibles: sr.difficulties,
        exemples_sentiers: sr.exemples.slice(0, 3) // 3 exemples max
      }))
    });

  } catch (error) {
    console.error('Erreur /api/regions/:region/sous-regions:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

/**
 * GET /api/communes
 * Récupère la liste des communes avec le nombre de sentiers
 */
app.get('/api/communes', async (req, res) => {
  try {
    const communes = await Sentier.aggregate([
      {
        $match: { commune_depart: { $ne: null } }
      },
      {
        $group: {
          _id: '$commune_depart',
          count: { $sum: 1 },
          regions: { $addToSet: '$region' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      success: true,
      data: communes.map(c => ({
        nom: c._id,
        nombre_sentiers: c.count,
        regions: c.regions
      }))
    });

  } catch (error) {
    console.error('Erreur /api/communes:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

/**
 * GET /api/stats
 * Récupère les statistiques générales
 */
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await Sentier.aggregate([
      {
        $group: {
          _id: null,
          total_sentiers: { $sum: 1 },
          distance_totale: { $sum: '$distance' },
          distance_moyenne: { $avg: '$distance' },
          denivele_moyen: { $avg: '$denivele_positif' },
          regions: { $addToSet: '$region' },
          types: { $addToSet: '$type' },
          difficultes: { $addToSet: '$difficulte' }
        }
      }
    ]);

    const regionStats = await Sentier.aggregate([
      {
        $group: {
          _id: '$region',
          count: { $sum: 1 }
        }
      }
    ]);

    const typeStats = await Sentier.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    const difficulteStats = await Sentier.aggregate([
      {
        $group: {
          _id: '$difficulte',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        generale: stats[0],
        par_region: regionStats,
        par_type: typeStats,
        par_difficulte: difficulteStats
      }
    });

  } catch (error) {
    console.error('Erreur /api/stats:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

/**
 * GET /api/search
 * Recherche avancée de sentiers
 */
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const sentiers = await Sentier.find({
      $or: [
        { nom: new RegExp(q, 'i') },
        { description_complete: new RegExp(q, 'i') },
        { commune_depart: new RegExp(q, 'i') },
        { region: new RegExp(q, 'i') },
        { 'points_interet.nom': new RegExp(q, 'i') }
      ]
    })
    .limit(20)
    .sort({ randopitons_id: 1 });

    res.json({
      success: true,
      data: sentiers.map(s => ({
        id: s.randopitons_id,
        nom: s.nom,
        region: s.region,
        commune: s.commune_depart,
        distance: s.distance,
        difficulte: s.difficulte
      }))
    });

  } catch (error) {
    console.error('Erreur /api/search:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

// Route de santé
app.get('/api/health', async (req, res) => {
  try {
    const count = await Sentier.countDocuments();
    res.json({
      success: true,
      status: 'healthy',
      mongodb: 'connected',
      sentiers_count: count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'error',
      mongodb: 'disconnected'
    });
  }
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route non trouvée'
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 API Sentiers démarrée sur le port ${PORT}`);
  console.log(`📍 Endpoints disponibles:`);
  console.log(`   GET /api/sentiers - Liste des sentiers avec filtres (+ zone_specifique)`);
  console.log(`   GET /api/sentiers/:id - Détails d'un sentier`);
  console.log(`   GET /api/regions - Liste des régions`);
  console.log(`   GET /api/regions/hierarchie - Hiérarchie régions > sous-régions`);
  console.log(`   GET /api/regions/:region/sous-regions - Sous-régions d'une région`);
  console.log(`   GET /api/communes - Liste des communes`);
  console.log(`   GET /api/stats - Statistiques`);
  console.log(`   GET /api/search?q=... - Recherche`);
  console.log(`   GET /api/health - État de santé`);
});
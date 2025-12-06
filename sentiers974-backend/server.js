const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");
const cloudinary = require("cloudinary").v2;
const multer = require("multer");
const Sentier = require("./models/Sentier");
const Session = require("./models/Session");
const Post = require("./models/Post");
const Comment = require("./models/Comment");
require("dotenv").config();

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configuration Multer pour upload mémoire (pas de fichier sur disque)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

const app = express();
const PORT = process.env.PORT || 3001;

// Derrière un proxy (Render) pour que express-rate-limit lise X-Forwarded-For
app.set("trust proxy", 1);

// 🛡️ Rate Limiting - Protection anti-spam

// 🔒 Rate Limiting - Protection anti-spam
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives max par IP
  message: {
    success: false,
    error: "Trop de tentatives, réessayez dans 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requêtes max par minute par IP
  message: { success: false, error: "Trop de requêtes, ralentissez" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.ALLOWED_ORIGINS?.split(",") || []
        : true,
    credentials: true,
  })
);
app.use(express.json({ limit: "50mb" })); // Augmenter limite pour upload photos
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Servir les pages statiques (mentions légales)
app.use(express.static(path.join(__dirname, "public")));

// Alias lisibles pour les pages légales
app.get("/privacy-policy", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "privacy-policy.html"));
});

app.get("/terms-of-service", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "terms-of-service.html"));
});

// Page de reset password (lien mail)
app.get("/reset-password", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "reset-password.html"));
});

// Appliquer rate limiting général sur toutes les routes API
app.use("/api/", apiLimiter);

// Connexion MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connecté"))
  .catch((err) => console.error("❌ Erreur MongoDB:", err));

// Routes API

// 🔐 Routes d'authentification (avec rate limiting strict)
const authRoutes = require("./routes/auth");
app.use("/api/auth", authLimiter, authRoutes);

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
app.get("/api/sentiers", async (req, res) => {
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
      page = 1,
    } = req.query;

    // Construction de la requête
    let query = {};

    if (region) query.region = region;
    if (zone_specifique) query.zone_specifique = zone_specifique;
    if (difficulte) query.difficulte = difficulte;
    if (type) query.type = type;
    if (commune) query.commune_depart = new RegExp(commune, "i");

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
          {
            $gte: [
              { $add: ["$duree.heures", { $divide: ["$duree.minutes", 60] }] },
              dureeMinHours,
            ],
          },
          {
            $lte: [
              { $add: ["$duree.heures", { $divide: ["$duree.minutes", 60] }] },
              dureeMaxHours,
            ],
          },
        ],
      };
    }

    if (search) {
      query.$text = { $search: search };
    }

    // Pagination
    const limitNum = Math.min(parseInt(limit), 1000); // Max 1000 résultats
    const skip = (parseInt(page) - 1) * limitNum;

    // Exécution de la requête avec .lean() pour réduire l'utilisation mémoire
    // .lean() retourne des objets JavaScript simples au lieu d'objets Mongoose lourds
    // .select() ne charge que les champs nécessaires depuis MongoDB
    const sentiers = await Sentier.find(query)
      .select(
        "randopitons_id nom difficulte distance duree denivele_positif denivele_negatif type region zone_specifique commune_depart description_courte description_complete points_interet point_depart equipements_obligatoires equipements_recommandes periode_ideale restrictions dangers services_proximite contacts_urgence derniere_mise_a_jour_site source certification_officielle balisage"
      )
      .lean() // IMPORTANT: Réduit l'utilisation mémoire de ~70%
      .limit(limitNum)
      .skip(skip)
      .sort({ randopitons_id: 1 });

    const total = await Sentier.countDocuments(query);

    // Transformation manuelle (au lieu de .toClientFormat()) pour les objets lean
    const sentiersFormatted = sentiers.map((s) => ({
      id: s.randopitons_id,
      nom: s.nom,
      difficulte: s.difficulte,
      distance: s.distance,
      duree_heures: s.duree.heures + s.duree.minutes / 60,
      duree_formatee:
        s.duree.minutes > 0
          ? `${s.duree.heures}h${s.duree.minutes.toString().padStart(2, "0")}`
          : `${s.duree.heures}h`,
      denivele_positif: s.denivele_positif,
      denivele_negatif: s.denivele_negatif,
      type: s.type,
      region: s.region,
      zone_specifique: s.zone_specifique,
      commune_depart: s.commune_depart,
      description: s.description_complete || s.description_courte,
      points_interet: (s.points_interet || []).map((p) => p.nom),
      point_depart: {
        nom: s.point_depart.nom,
        coordonnees: [
          s.point_depart.coordonnees.longitude,
          s.point_depart.coordonnees.latitude,
        ],
        altitude: s.point_depart.altitude,
        acces_voiture: s.point_depart.acces_voiture,
        parking_disponible: s.point_depart.parking_disponible,
      },
      equipements_requis: s.equipements_obligatoires || [],
      equipements_recommandes: s.equipements_recommandes || [],
      periode_ideale: s.periode_ideale || { debut: "avril", fin: "novembre" },
      restrictions: s.restrictions || [],
      dangers: s.dangers || [],
      services_proximite: s.services_proximite || {
        hebergements: [],
        restaurants: [],
        locations_materiel: [],
      },
      contact_urgence: {
        secours_montagne:
          s.contacts_urgence?.secours_montagne || "02 62 93 37 37",
        gendarmerie: s.contacts_urgence?.gendarmerie || "17",
      },
      derniere_mise_a_jour: s.derniere_mise_a_jour_site,
      source: s.source,
      certification_officielle: s.certification_officielle,
      balisage: s.balisage || { type: "Sentier balisé", etat: "Bon" },
    }));

    res.json({
      success: true,
      data: sentiersFormatted,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Erreur /api/sentiers:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

/**
 * GET /api/sentiers/:id
 * Récupère un sentier spécifique par son ID
 */
app.get("/api/sentiers/:id", async (req, res) => {
  try {
    const sentier = await Sentier.findOne({ randopitons_id: req.params.id });

    if (!sentier) {
      return res.status(404).json({
        success: false,
        error: "Sentier non trouvé",
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
        trace_gpx: sentier.trace_gpx,
      },
    });
  } catch (error) {
    console.error("Erreur /api/sentiers/:id:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

/**
 * GET /api/regions
 * Récupère la liste des régions avec le nombre de sentiers
 */
app.get("/api/regions", async (req, res) => {
  try {
    const regions = await Sentier.aggregate([
      {
        $group: {
          _id: "$region",
          count: { $sum: 1 },
          types: { $addToSet: "$type" },
          difficulties: { $addToSet: "$difficulte" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.json({
      success: true,
      data: regions.map((r) => ({
        nom: r._id,
        nombre_sentiers: r.count,
        types_disponibles: r.types,
        difficultes_disponibles: r.difficulties,
      })),
    });
  } catch (error) {
    console.error("Erreur /api/regions:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

/**
 * GET /api/regions/hierarchie
 * Récupère la hiérarchie complète régions > sous-régions comme sur Randopitons.re
 */
app.get("/api/regions/hierarchie", async (req, res) => {
  try {
    const hierarchie = await Sentier.aggregate([
      {
        $group: {
          _id: {
            region: "$region",
            zone_specifique: "$zone_specifique",
          },
          count: { $sum: 1 },
          types: { $addToSet: "$type" },
          difficulties: { $addToSet: "$difficulte" },
        },
      },
      {
        $group: {
          _id: "$_id.region",
          total_sentiers: { $sum: "$count" },
          sous_regions: {
            $push: {
              nom: "$_id.zone_specifique",
              nombre_sentiers: "$count",
              types_disponibles: "$types",
              difficultes_disponibles: "$difficulties",
            },
          },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.json({
      success: true,
      data: hierarchie.map((region) => ({
        region: region._id,
        nombre_total_sentiers: region.total_sentiers,
        sous_regions: region.sous_regions
          .filter((sr) => sr.nom) // Exclure les null/undefined
          .sort((a, b) => b.nombre_sentiers - a.nombre_sentiers), // Tri par nombre de sentiers
      })),
    });
  } catch (error) {
    console.error("Erreur /api/regions/hierarchie:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

/**
 * GET /api/regions/:region/sous-regions
 * Récupère les sous-régions d'une région spécifique
 */
app.get("/api/regions/:region/sous-regions", async (req, res) => {
  try {
    const { region } = req.params;

    const sousRegions = await Sentier.aggregate([
      {
        $match: {
          region: region,
          zone_specifique: { $ne: null, $ne: "" },
        },
      },
      {
        $group: {
          _id: "$zone_specifique",
          count: { $sum: 1 },
          types: { $addToSet: "$type" },
          difficulties: { $addToSet: "$difficulte" },
          exemples: {
            $push: {
              nom: "$nom",
              difficulte: "$difficulte",
              distance: "$distance",
            },
          },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    res.json({
      success: true,
      region: region,
      data: sousRegions.map((sr) => ({
        nom: sr._id,
        nombre_sentiers: sr.count,
        types_disponibles: sr.types,
        difficultes_disponibles: sr.difficulties,
        exemples_sentiers: sr.exemples.slice(0, 3), // 3 exemples max
      })),
    });
  } catch (error) {
    console.error("Erreur /api/regions/:region/sous-regions:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

/**
 * GET /api/communes
 * Récupère la liste des communes avec le nombre de sentiers
 */
app.get("/api/communes", async (req, res) => {
  try {
    const communes = await Sentier.aggregate([
      {
        $match: { commune_depart: { $ne: null } },
      },
      {
        $group: {
          _id: "$commune_depart",
          count: { $sum: 1 },
          regions: { $addToSet: "$region" },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    res.json({
      success: true,
      data: communes.map((c) => ({
        nom: c._id,
        nombre_sentiers: c.count,
        regions: c.regions,
      })),
    });
  } catch (error) {
    console.error("Erreur /api/communes:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

/**
 * GET /api/stats
 * Récupère les statistiques générales
 */
app.get("/api/stats", async (req, res) => {
  try {
    const stats = await Sentier.aggregate([
      {
        $group: {
          _id: null,
          total_sentiers: { $sum: 1 },
          distance_totale: { $sum: "$distance" },
          distance_moyenne: { $avg: "$distance" },
          denivele_moyen: { $avg: "$denivele_positif" },
          regions: { $addToSet: "$region" },
          types: { $addToSet: "$type" },
          difficultes: { $addToSet: "$difficulte" },
        },
      },
    ]);

    const regionStats = await Sentier.aggregate([
      {
        $group: {
          _id: "$region",
          count: { $sum: 1 },
        },
      },
    ]);

    const typeStats = await Sentier.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
    ]);

    const difficulteStats = await Sentier.aggregate([
      {
        $group: {
          _id: "$difficulte",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        generale: stats[0],
        par_region: regionStats,
        par_type: typeStats,
        par_difficulte: difficulteStats,
      },
    });
  } catch (error) {
    console.error("Erreur /api/stats:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

/**
 * GET /api/search
 * Recherche avancée de sentiers
 */
app.get("/api/search", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const sentiers = await Sentier.find({
      $or: [
        { nom: new RegExp(q, "i") },
        { description_complete: new RegExp(q, "i") },
        { commune_depart: new RegExp(q, "i") },
        { region: new RegExp(q, "i") },
        { "points_interet.nom": new RegExp(q, "i") },
      ],
    })
      .limit(20)
      .sort({ randopitons_id: 1 });

    res.json({
      success: true,
      data: sentiers.map((s) => ({
        id: s.randopitons_id,
        nom: s.nom,
        region: s.region,
        commune: s.commune_depart,
        distance: s.distance,
        difficulte: s.difficulte,
      })),
    });
  } catch (error) {
    console.error("Erreur /api/search:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

/**
 * POST /api/sessions
 * Créer une nouvelle session de tracking
 */
app.post("/api/sessions", async (req, res) => {
  try {
    const sessionData = req.body;

    // Validation basique
    if (!sessionData.sport?.nom) {
      return res.status(400).json({
        success: false,
        error: "sport.nom est requis",
      });
    }

    // Utiliser l'ID fourni par l'app, ou générer un nouveau si manquant
    if (!sessionData.sessionId) {
      const { ObjectId } = require("mongodb");
      sessionData.sessionId = `session_${Date.now()}_${new ObjectId().toString()}`;
      console.log(
        "🆔 Nouveau sessionId généré côté serveur:",
        sessionData.sessionId
      );
    } else {
      console.log(
        "🆔 SessionId fourni par l'app conservé:",
        sessionData.sessionId
      );
    }

    // Vérifier si la session existe déjà (update si existe, create sinon)
    const existingSession = await Session.findOne({
      sessionId: sessionData.sessionId,
    });

    let session;
    if (existingSession) {
      // Mise à jour de la session existante
      Object.assign(existingSession, sessionData);
      await existingSession.save();
      session = existingSession;
      console.log("🔄 Session mise à jour:", session.sessionId);
    } else {
      // Création d'une nouvelle session
      session = new Session(sessionData);
      await session.save();
      console.log("✅ Session créée:", session.sessionId);
    }

    res.status(existingSession ? 200 : 201).json({
      success: true,
      data: session.toClientFormat(),
    });
  } catch (error) {
    console.error("❌ Erreur sauvegarde session:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur lors de la sauvegarde",
    });
  }
});

/**
 * GET /api/sessions
 * Récupérer les sessions d'un utilisateur
 * Query params:
 * - userId: ID utilisateur (défaut: 'anonymous')
 * - limit: Nombre max de sessions (défaut: 50)
 * - sport: Filtrer par sport
 * - dateFrom, dateTo: Filtrer par période
 */
app.get("/api/sessions", async (req, res) => {
  try {
    const {
      userId = "anonymous",
      limit = 50,
      sport,
      dateFrom,
      dateTo,
    } = req.query;

    // Construction de la requête
    let query = { userId };

    if (sport) query["sport.nom"] = sport;

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    // Récupérer les sessions
    const sessions = await Session.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: sessions.map((s) => s.toClientFormat()),
      count: sessions.length,
    });
  } catch (error) {
    console.error("❌ Erreur récupération sessions:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

/**
 * GET /api/sessions/:sessionId
 * Récupérer une session spécifique avec tous les détails
 */
app.get("/api/sessions/:sessionId", async (req, res) => {
  try {
    const session = await Session.findOne({ sessionId: req.params.sessionId });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Session non trouvée",
      });
    }

    res.json({
      success: true,
      data: {
        ...session.toClientFormat(),
        // Données complètes pour la vue détaillée
        trackingPath: session.trackingPath,
        pois: session.pois,
        photos: session.photos,
        startCoordinates: session.startCoordinates,
        endCoordinates: session.endCoordinates,
      },
    });
  } catch (error) {
    console.error("❌ Erreur récupération session:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

/**
 * DELETE /api/sessions/:sessionId
 * Supprimer une session
 */
app.delete("/api/sessions/:sessionId", async (req, res) => {
  try {
    const result = await Session.deleteOne({ sessionId: req.params.sessionId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Session non trouvée",
      });
    }

    res.json({
      success: true,
      message: "Session supprimée",
    });
  } catch (error) {
    console.error("❌ Erreur suppression session:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

/**
 * POST /api/sessions/:sessionId/photos
 * Ajouter une photo à une session
 */
app.post("/api/sessions/:sessionId/photos", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const photoData = req.body;

    // Validation selon le schéma Session
    if (!photoData.uri || !photoData.caption) {
      return res.status(400).json({
        success: false,
        error: "uri et caption requis",
      });
    }

    // Ajouter la photo à la session
    const result = await Session.updateOne(
      { sessionId },
      { $push: { photos: photoData } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Session non trouvée",
      });
    }

    console.log(`✅ Photo ajoutée à session ${sessionId}:`, photoData.caption);

    res.json({
      success: true,
      data: photoData,
    });
  } catch (error) {
    console.error("❌ Erreur ajout photo session:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

/**
 * DELETE /api/sessions/:sessionId/photos/:photoId
 * Supprimer une photo d'une session
 */
app.delete("/api/sessions/:sessionId/photos/:photoId", async (req, res) => {
  try {
    const { sessionId, photoId } = req.params;

    // Supprimer la photo de la session
    const result = await Session.updateOne(
      { sessionId },
      { $pull: { photos: { id: photoId } } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Session non trouvée",
      });
    }

    console.log(`✅ Photo supprimée de session ${sessionId}: ${photoId}`);

    res.json({
      success: true,
      message: "Photo supprimée",
    });
  } catch (error) {
    console.error("❌ Erreur suppression photo session:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

/**
 * GET /api/sessions/stats/daily
 * Récupérer les statistiques quotidiennes
 */
app.get("/api/sessions/stats/daily", async (req, res) => {
  try {
    const { userId = "anonymous", date } = req.query;

    let startDate, endDate;
    if (date) {
      startDate = new Date(date);
      endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
    } else {
      // Aujourd'hui par défaut
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }

    const stats = await Session.aggregate([
      {
        $match: {
          userId: userId,
          createdAt: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalDistance: { $sum: "$distance" },
          totalDuration: { $sum: "$duration" },
          totalCalories: { $sum: "$calories" },
          totalSteps: { $sum: "$steps" },
          avgSpeed: { $avg: "$avgSpeed" },
          maxSpeed: { $max: "$maxSpeed" },
          sports: { $addToSet: "$sport.nom" },
          sessions: {
            $push: {
              id: "$sessionId",
              sport: "$sport.nom",
              distance: "$distance",
              duration: "$duration",
              avgSpeed: "$avgSpeed",
              maxSpeed: "$maxSpeed",
              steps: "$steps",
              createdAt: "$createdAt",
            },
          },
        },
      },
    ]);

    res.json({
      success: true,
      date: startDate.toISOString().split("T")[0],
      data:
        stats.length > 0
          ? stats[0]
          : {
              totalSessions: 0,
              totalDistance: 0,
              totalDuration: 0,
              totalCalories: 0,
              totalSteps: 0,
              avgSpeed: 0,
              maxSpeed: 0,
              sports: [],
              sessions: [],
            },
    });
  } catch (error) {
    console.error("❌ Erreur stats quotidiennes:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

// Routes POI (Points of Interest)

// Routes POI supprimées - Photos maintenant dans sessions.photos[]

// Routes Posts Sociaux

/**
 * GET /api/posts
 * Récupérer tous les posts avec pagination
 * Query params:
 * - page: Page (défaut: 1)
 * - limit: Nombre par page (défaut: 20)
 * - userId: Filtrer par utilisateur
 * - sport: Filtrer par sport
 */
app.get("/api/posts", async (req, res) => {
  try {
    const { page = 1, limit = 20, userId, sport } = req.query;

    let query = {};
    if (userId) query.userId = userId;
    if (sport) query.sport = sport;

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Récupérer les commentaires pour chaque post
    const postsWithComments = await Promise.all(
      posts.map(async (post) => {
        const comments = await Comment.find({ postId: post._id }).sort({
          createdAt: 1,
        });

        return {
          id: post._id,
          userId: post.userId,
          userName: post.userName,
          userAvatar: post.userAvatar,
          userLocation: post.userLocation,
          photos: post.photos,
          caption: post.caption,
          likes: post.likes,
          sport: post.sport,
          location: post.location,
          createdAt: post.createdAt.getTime(),
          comments: comments.map((comment) => ({
            id: comment._id,
            userId: comment.userId,
            userName: comment.userName,
            userAvatar: comment.userAvatar,
            text: comment.text,
            createdAt: comment.createdAt.getTime(),
          })),
        };
      })
    );

    res.json({
      success: true,
      data: postsWithComments,
      count: postsWithComments.length,
    });
  } catch (error) {
    console.error("❌ Erreur récupération posts:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

/**
 * POST /api/posts
 * Créer un nouveau post
 */
app.post("/api/posts", async (req, res) => {
  try {
    const postData = req.body;

    // Validation
    if (!postData.userId || !postData.userName || !postData.caption) {
      return res.status(400).json({
        success: false,
        error: "userId, userName et caption sont requis",
      });
    }

    const newPost = new Post({
      ...postData,
      likes: postData.likes || [],
      createdAt: new Date(),
    });

    await newPost.save();

    res.json({
      success: true,
      data: {
        id: newPost._id,
        userId: newPost.userId,
        userName: newPost.userName,
        userAvatar: newPost.userAvatar,
        userLocation: newPost.userLocation,
        photos: newPost.photos,
        caption: newPost.caption,
        likes: newPost.likes,
        sport: newPost.sport,
        location: newPost.location,
        createdAt: newPost.createdAt.getTime(),
        comments: [],
      },
    });
  } catch (error) {
    console.error("❌ Erreur création post:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

/**
 * PUT /api/posts/:id
 * Modifier un post
 */
app.put("/api/posts/:id", async (req, res) => {
  try {
    const postId = req.params.id;
    const updateData = req.body;

    // Exclure les champs qui ne doivent pas être modifiés
    delete updateData._id;
    delete updateData.userId;
    delete updateData.createdAt;

    updateData.updatedAt = new Date();

    const updatedPost = await Post.findByIdAndUpdate(postId, updateData, {
      new: true,
    });

    if (!updatedPost) {
      return res.status(404).json({
        success: false,
        error: "Post non trouvé",
      });
    }

    res.json({
      success: true,
      data: {
        id: updatedPost._id,
        userId: updatedPost.userId,
        userName: updatedPost.userName,
        userAvatar: updatedPost.userAvatar,
        userLocation: updatedPost.userLocation,
        photos: updatedPost.photos,
        caption: updatedPost.caption,
        likes: updatedPost.likes,
        sport: updatedPost.sport,
        location: updatedPost.location,
        createdAt: updatedPost.createdAt.getTime(),
        updatedAt: updatedPost.updatedAt.getTime(),
      },
    });
  } catch (error) {
    console.error("❌ Erreur modification post:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

/**
 * DELETE /api/posts/:id
 * Supprimer un post et tous ses commentaires
 */
app.delete("/api/posts/:id", async (req, res) => {
  try {
    const postId = req.params.id;

    // Supprimer le post
    const deletedPost = await Post.findByIdAndDelete(postId);

    if (!deletedPost) {
      return res.status(404).json({
        success: false,
        error: "Post non trouvé",
      });
    }

    // Supprimer tous les commentaires associés
    await Comment.deleteMany({ postId: postId });

    res.json({
      success: true,
      message: "Post et commentaires supprimés",
    });
  } catch (error) {
    console.error("❌ Erreur suppression post:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

/**
 * POST /api/posts/:id/like
 * Liker/Unliker un post
 */
app.post("/api/posts/:id/like", async (req, res) => {
  try {
    const postId = req.params.id;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "userId requis",
      });
    }

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post non trouvé",
      });
    }

    const isLiked = post.likes.includes(userId);

    if (isLiked) {
      // Unlike
      post.likes = post.likes.filter((id) => id !== userId);
    } else {
      // Like
      post.likes.push(userId);
    }

    await post.save();

    res.json({
      success: true,
      data: {
        liked: !isLiked,
        likesCount: post.likes.length,
      },
    });
  } catch (error) {
    console.error("❌ Erreur like post:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

/**
 * POST /api/posts/:id/comments
 * Ajouter un commentaire à un post
 */
app.post("/api/posts/:id/comments", async (req, res) => {
  try {
    const postId = req.params.id;
    const { userId, userName, userAvatar, text, photos } = req.body;

    // Validation
    if (!userId || !userName || !text) {
      return res.status(400).json({
        success: false,
        error: "userId, userName et text sont requis",
      });
    }

    // Vérifier que le post existe
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post non trouvé",
      });
    }

    const newComment = new Comment({
      postId,
      userId,
      userName,
      userAvatar,
      text: text.trim(),
      photos: photos || [],
      createdAt: new Date(),
    });

    await newComment.save();

    res.json({
      success: true,
      data: {
        id: newComment._id,
        userId: newComment.userId,
        userName: newComment.userName,
        userAvatar: newComment.userAvatar,
        text: newComment.text,
        photos: newComment.photos,
        createdAt: newComment.createdAt.getTime(),
      },
    });
  } catch (error) {
    console.error("❌ Erreur ajout commentaire:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

/**
 * GET /api/posts/:id/comments
 * Récupérer les commentaires d'un post
 */
app.get("/api/posts/:id/comments", async (req, res) => {
  try {
    const postId = req.params.id;

    const comments = await Comment.find({ postId }).sort({ createdAt: 1 });

    res.json({
      success: true,
      data: comments.map((comment) => ({
        id: comment._id,
        userId: comment.userId,
        userName: comment.userName,
        userAvatar: comment.userAvatar,
        text: comment.text,
        createdAt: comment.createdAt.getTime(),
      })),
      count: comments.length,
    });
  } catch (error) {
    console.error("❌ Erreur récupération commentaires:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

// ============================================
// ROUTE UPLOAD CLOUDINARY
// ============================================

/**
 * POST /api/upload
 * Upload une image vers Cloudinary
 * Accepte base64 ou multipart/form-data
 */
app.post("/api/upload", upload.single("photo"), async (req, res) => {
  try {
    let imageData;

    // Support base64 (depuis mobile)
    if (req.body.base64) {
      imageData = req.body.base64;
    }
    // Support fichier multipart
    else if (req.file) {
      imageData = `data:${req.file.mimetype};base64,${req.file.buffer.toString(
        "base64"
      )}`;
    } else {
      return res.status(400).json({
        success: false,
        error: "Aucune image fournie",
      });
    }

    // Upload vers Cloudinary
    const result = await cloudinary.uploader.upload(imageData, {
      folder: "sentiers974",
      resource_type: "auto",
      transformation: [
        { width: 1200, height: 1200, crop: "limit" },
        { quality: "auto:good" },
        { fetch_format: "auto" },
      ],
    });

    res.json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      },
    });
  } catch (error) {
    console.error("❌ Erreur upload Cloudinary:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de l'upload de l'image",
    });
  }
});

/**
 * POST /api/upload/multiple
 * Upload multiple images vers Cloudinary
 */
app.post(
  "/api/upload/multiple",
  upload.array("photos", 10),
  async (req, res) => {
    try {
      const uploadPromises = [];

      // Support base64 array
      if (req.body.images && Array.isArray(req.body.images)) {
        for (const base64Image of req.body.images) {
          uploadPromises.push(
            cloudinary.uploader.upload(base64Image, {
              folder: "sentiers974",
              resource_type: "auto",
              transformation: [
                { width: 1200, height: 1200, crop: "limit" },
                { quality: "auto:good" },
                { fetch_format: "auto" },
              ],
            })
          );
        }
      }
      // Support fichiers multipart
      else if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const base64Image = `data:${
            file.mimetype
          };base64,${file.buffer.toString("base64")}`;
          uploadPromises.push(
            cloudinary.uploader.upload(base64Image, {
              folder: "sentiers974",
              resource_type: "auto",
              transformation: [
                { width: 1200, height: 1200, crop: "limit" },
                { quality: "auto:good" },
                { fetch_format: "auto" },
              ],
            })
          );
        }
      } else {
        return res.status(400).json({
          success: false,
          error: "Aucune image fournie",
        });
      }

      const results = await Promise.all(uploadPromises);

      res.json({
        success: true,
        data: results.map((result) => ({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
        })),
      });
    } catch (error) {
      console.error("❌ Erreur upload multiple Cloudinary:", error);
      res.status(500).json({
        success: false,
        error: "Erreur lors de l'upload des images",
      });
    }
  }
);

// Route de santé
app.get("/api/health", async (req, res) => {
  try {
    const sentiersCount = await Sentier.countDocuments();
    const sessionsCount = await Session.countDocuments();
    const postsCount = await Post.countDocuments();
    const commentsCount = await Comment.countDocuments();

    res.json({
      success: true,
      status: "healthy",
      mongodb: "connected",
      sentiers_count: sentiersCount,
      sessions_count: sessionsCount,
      posts_count: postsCount,
      comments_count: commentsCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "error",
      mongodb: "disconnected",
    });
  }
});

/**
 * PUT /api/comments/:id
 * Modifier un commentaire
 */
app.put("/api/comments/:id", async (req, res) => {
  try {
    const commentId = req.params.id;
    const { text, photos } = req.body;

    // Validation
    if (!text) {
      return res.status(400).json({
        success: false,
        error: "Le texte est requis",
      });
    }

    // Trouver et modifier le commentaire
    const comment = await Comment.findByIdAndUpdate(
      commentId,
      {
        text: text.trim(),
        photos: photos || [],
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: "Commentaire non trouvé",
      });
    }

    res.json({
      success: true,
      data: {
        id: comment._id,
        userId: comment.userId,
        userName: comment.userName,
        userAvatar: comment.userAvatar,
        text: comment.text,
        photos: comment.photos,
        createdAt: comment.createdAt.getTime(),
        updatedAt: comment.updatedAt.getTime(),
      },
    });
  } catch (error) {
    console.error("❌ Erreur modification commentaire:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

/**
 * DELETE /api/comments/:id
 * Supprimer un commentaire
 */
app.delete("/api/comments/:id", async (req, res) => {
  try {
    const commentId = req.params.id;

    // Supprimer le commentaire
    const comment = await Comment.findByIdAndDelete(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: "Commentaire non trouvé",
      });
    }

    res.json({
      success: true,
      data: { message: "Commentaire supprimé avec succès" },
    });
  } catch (error) {
    console.error("❌ Erreur suppression commentaire:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

// Gestion des erreurs 404 (uniquement pour les routes API)
app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    error: "Route API non trouvée",
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 API Sentiers démarrée sur le port ${PORT}`);
  console.log(`📍 Endpoints disponibles:`);
  console.log(`   🔐 AUTH:`);
  console.log(`      POST /api/auth/signup - Inscription`);
  console.log(`      POST /api/auth/login - Connexion`);
  console.log(`      GET /api/auth/me - Profil utilisateur (protégé)`);
  console.log(`      DELETE /api/auth/account - Supprimer compte (protégé)`);
  console.log(
    `   GET /api/sentiers - Liste des sentiers avec filtres (+ zone_specifique)`
  );
  console.log(`   GET /api/sentiers/:id - Détails d'un sentier`);
  console.log(`   GET /api/regions - Liste des régions`);
  console.log(
    `   GET /api/regions/hierarchie - Hiérarchie régions > sous-régions`
  );
  console.log(
    `   GET /api/regions/:region/sous-regions - Sous-régions d'une région`
  );
  console.log(`   GET /api/communes - Liste des communes`);
  console.log(`   GET /api/stats - Statistiques`);
  console.log(`   GET /api/search?q=... - Recherche`);
  console.log(`   POST /api/sessions - Créer une session de tracking`);
  console.log(`   GET /api/sessions - Liste des sessions avec filtres`);
  console.log(`   GET /api/sessions/:id - Détails d'une session`);
  console.log(`   DELETE /api/sessions/:id - Supprimer une session`);
  console.log(`   GET /api/sessions/stats/daily - Statistiques quotidiennes`);
  console.log(`   GET /api/health - État de santé`);
});

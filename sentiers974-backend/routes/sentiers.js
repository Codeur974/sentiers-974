const express = require("express");
const Sentier = require("../models/Sentier");
const { escapeRegex } = require("../utils/regex");

const router = express.Router();

const buildSafeRegex = (value) => new RegExp(escapeRegex(value), "i");

router.get("/sentiers", async (req, res) => {
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

    const query = {};

    if (region) query.region = region;
    if (zone_specifique) query.zone_specifique = zone_specifique;
    if (difficulte) query.difficulte = difficulte;
    if (type) query.type = type;
    if (commune) query.commune_depart = buildSafeRegex(commune);

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

    const limitNum = Math.min(parseInt(limit, 10), 1000);
    const skip = (parseInt(page, 10) - 1) * limitNum;

    const sentiers = await Sentier.find(query)
      .select(
        "randopitons_id nom difficulte distance duree denivele_positif denivele_negatif type region zone_specifique commune_depart description_courte description_complete points_interet point_depart equipements_obligatoires equipements_recommandes periode_ideale restrictions dangers services_proximite contacts_urgence derniere_mise_a_jour_site source certification_officielle balisage"
      )
      .lean()
      .limit(limitNum)
      .skip(skip)
      .sort({ randopitons_id: 1 });

    const total = await Sentier.countDocuments(query);

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
      balisage: s.balisage || { type: "Sentier balise", etat: "Bon" },
    }));

    res.json({
      success: true,
      data: sentiersFormatted,
      pagination: {
        page: parseInt(page, 10),
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

router.get("/sentiers/:id", async (req, res) => {
  try {
    const sentier = await Sentier.findOne({ randopitons_id: req.params.id });

    if (!sentier) {
      return res.status(404).json({
        success: false,
        error: "Sentier non trouve",
      });
    }

    res.json({
      success: true,
      data: {
        ...sentier.toClientFormat(),
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

router.get("/regions", async (_req, res) => {
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

router.get("/regions/hierarchie", async (_req, res) => {
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
          .filter((sr) => sr.nom)
          .sort((a, b) => b.nombre_sentiers - a.nombre_sentiers),
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

router.get("/regions/:region/sous-regions", async (req, res) => {
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
        exemples_sentiers: sr.exemples.slice(0, 3),
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

router.get("/communes", async (_req, res) => {
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

router.get("/stats", async (_req, res) => {
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

router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const safe = escapeRegex(q);

    const sentiers = await Sentier.find({
      $or: [
        { nom: new RegExp(safe, "i") },
        { description_complete: new RegExp(safe, "i") },
        { commune_depart: new RegExp(safe, "i") },
        { region: new RegExp(safe, "i") },
        { "points_interet.nom": new RegExp(safe, "i") },
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

module.exports = router;

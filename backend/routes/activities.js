const express = require("express");
const router = express.Router();
const {
  createActivity,
  getUserActivities,
  getActivity,
  deleteActivity,
  getUserStats,
} = require("../controllers/activitiesController");
const auth = require("../middlewares/authMiddleware");

// Toutes les routes nécessitent une authentification - DÉSACTIVÉ POUR TEST
// router.use(auth);

// Créer une nouvelle activité
router.post("/", createActivity);

// Obtenir toutes les activités de l'utilisateur
router.get("/", getUserActivities);

// Obtenir les statistiques de l'utilisateur
router.get("/stats", getUserStats);

// Obtenir une activité spécifique
router.get("/:id", getActivity);

// Supprimer une activité
router.delete("/:id", deleteActivity);

module.exports = router;

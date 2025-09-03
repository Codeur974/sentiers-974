const express = require("express");
const router = express.Router();
const {
  createPOI,
  getActivityPOIs,
  deletePOI,
  getUserPOIs,
} = require("../controllers/poiController");
const auth = require("../middlewares/authMiddleware");

// Désactiver l'auth pour les tests
// router.use(auth);

// Créer un nouveau POI
router.post("/", createPOI);

// Obtenir tous les POI de l'utilisateur
router.get("/", getUserPOIs);

// Obtenir les POI d'une activité spécifique
router.get("/activity/:activityId", getActivityPOIs);

// Supprimer un POI
router.delete("/:id", deletePOI);

module.exports = router;
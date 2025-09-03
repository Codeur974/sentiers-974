const express = require("express");
const router = express.Router();
const { register, login } = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");

// Route d'inscription
router.post("/register", register);

// Route de connexion
router.post("/login", login);

// Route de vérification de token
router.get("/verify", authMiddleware, async (req, res) => {
  try {
    // Le middleware authMiddleware a déjà vérifié le token
    // et ajouté req.user
    res.json({
      message: "Token valide",
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la vérification:", error);
    res.status(401).json({ message: "Token invalide" });
  }
});

module.exports = router;

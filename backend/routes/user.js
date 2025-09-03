const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");
const User = require("../models/user");

// Route pour obtenir le profil utilisateur
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch (error) {
    console.error("Erreur lors de la récupération du profil:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Route pour mettre à jour le profil
router.put("/profile", auth, async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, email },
      { new: true }
    ).select("-password");

    res.json(user);
  } catch (error) {
    console.error("Erreur lors de la mise à jour du profil:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

module.exports = router;

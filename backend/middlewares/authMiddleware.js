const jwt = require("jsonwebtoken");
const User = require("../models/user");

const auth = async (req, res, next) => {
  try {
    // Récupérer le token depuis le header Authorization
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res
        .status(401)
        .json({ message: "Token d'authentification manquant" });
    }

    // Vérifier le token avec une valeur par défaut pour JWT_SECRET
    const jwtSecret =
      process.env.JWT_SECRET ||
      "votre_secret_jwt_tres_securise_pour_sentiers974";
    const decoded = jwt.verify(token, jwtSecret);

    // Vérifier si l'utilisateur existe toujours
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({ message: "Token invalide" });
    }

    // Ajouter l'utilisateur à la requête
    req.user = user;
    req.user.id = user._id; // Pour compatibilité avec le controller
    next();
  } catch (error) {
    console.error("Erreur d'authentification:", error);
    res.status(401).json({ message: "Token invalide" });
  }
};

module.exports = auth;

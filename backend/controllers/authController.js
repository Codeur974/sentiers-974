const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

// Inscription d'un nouvel utilisateur
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Cet email est déjà utilisé" });
    }

    // Hasher le mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Créer le nouvel utilisateur
    const user = new User({
      name,
      email,
      password: hashedPassword,
    });

    await user.save();

    // Générer le token JWT avec une valeur par défaut
    const jwtSecret =
      process.env.JWT_SECRET ||
      "votre_secret_jwt_tres_securise_pour_sentiers974";
    const token = jwt.sign({ userId: user._id }, jwtSecret, {
      expiresIn: "7d",
    });

    res.status(201).json({
      message: "Utilisateur créé avec succès",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

// Connexion utilisateur
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Email ou mot de passe incorrect" });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(400)
        .json({ message: "Email ou mot de passe incorrect" });
    }

    // Générer le token JWT avec une valeur par défaut
    const jwtSecret =
      process.env.JWT_SECRET ||
      "votre_secret_jwt_tres_securise_pour_sentiers974";
    const token = jwt.sign({ userId: user._id }, jwtSecret, {
      expiresIn: "7d",
    });

    res.json({
      message: "Connexion réussie",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

module.exports = {
  register,
  login,
};

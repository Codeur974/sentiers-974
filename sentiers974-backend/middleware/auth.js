const jwt = require('jsonwebtoken');

// ⚠️ SECRET : À mettre dans .env pour la production
// On utilisera une vraie clé secrète longue et aléatoire
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_IN_PRODUCTION_USE_LONG_RANDOM_STRING';

/**
 * 🔑 GÉNÉRER UN TOKEN JWT
 * Appelé lors de l'inscription ou connexion
 *
 * @param {string} userId - L'ID MongoDB du user
 * @returns {string} Token JWT signé, valide 30 jours
 */
exports.generateToken = (userId) => {
  return jwt.sign(
    { userId },              // Payload : contient l'ID du user
    JWT_SECRET,              // Clé secrète pour signer le token
    { expiresIn: '30d' }     // Token expire après 30 jours
  );
};

/**
 * 🛡️ MIDDLEWARE : Vérifier le token JWT
 * Protège les routes qui nécessitent une authentification
 *
 * Usage:
 *   app.get('/api/sessions', verifyToken, getSessionsHandler);
 *
 * Si le token est valide, ajoute req.userId pour les routes suivantes
 * Sinon, renvoie une erreur 401 Unauthorized
 */
exports.verifyToken = (req, res, next) => {
  // 1. Récupérer le header Authorization
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Token manquant. Veuillez vous connecter.'
    });
  }

  // 2. Format attendu : "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      error: 'Format token invalide. Utilisez: Bearer <token>'
    });
  }

  const token = parts[1];

  try {
    // 3. Vérifier la signature et la validité du token
    const decoded = jwt.verify(token, JWT_SECRET);

    // 4. Ajouter userId à la requête pour les routes suivantes
    req.userId = decoded.userId;

    // 5. Continuer vers la route suivante
    next();

  } catch (error) {
    // Token expiré, invalide, ou falsifié
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token expiré. Veuillez vous reconnecter.'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'Token invalide.'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Erreur authentification.'
    });
  }
};
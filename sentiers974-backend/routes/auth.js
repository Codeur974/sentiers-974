const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Session = require('../models/Session');
const { generateToken, verifyToken } = require('../middleware/auth');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Helper d'envoi d'email de reset (SMTP configurable via env)
const sendResetEmail = async (toEmail, token) => {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_SECURE,
    FROM_EMAIL,
    RESET_URL_BASE
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP non configuré (manque host/port/user/pass)');
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT, 10),
    secure: SMTP_SECURE === 'true', // true pour 465, false pour STARTTLS
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });

  const baseUrl = RESET_URL_BASE || 'https://sentiers974.onrender.com';
  const resetLink = `${baseUrl.replace(/\/$/, '')}/reset?token=${token}`;

  await transporter.sendMail({
    from: FROM_EMAIL || SMTP_USER,
    to: toEmail,
    subject: 'Réinitialisation de votre mot de passe - Sentiers 974',
    html: `
      <p>Bonjour,</p>
      <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
      <p>Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe (valide 1h) :</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
      <p>— Équipe Sentiers 974</p>
      <p style="font-size:12px;color:#666">Token: ${token}</p>
    `
  });
};

/**
 * 📝 INSCRIPTION (Signup)
 * POST /api/auth/signup
 *
 * Body attendu:
 * {
 *   "email": "user@example.com",
 *   "password": "motdepasse123",
 *   "name": "Jean Dupont",
 *   "deviceId": "device-abc-123" (optionnel, pour migration)
 * }
 *
 * ✅ Si deviceId fourni : migre les sessions anonymes vers ce nouveau compte
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, deviceId } = req.body;

    // 1️⃣ Validation basique
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email et mot de passe requis'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Le mot de passe doit contenir au moins 8 caractères'
      });
    }

    // 2️⃣ Vérifier si l'email existe déjà
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Email déjà utilisé'
      });
    }

    // 3️⃣ Créer le nouvel utilisateur
    // ⚠️ Le password sera automatiquement hashé par le hook pre('save')
    const user = new User({
      email: email.toLowerCase(),
      password, // Sera hashé automatiquement
      name,
      deviceId,
      lastLogin: new Date()
    });

    await user.save();

    // 4️⃣ MIGRATION : Si deviceId fourni, récupérer les sessions anonymes
    if (deviceId) {
      try {
        const migratedCount = await Session.updateMany(
          { userId: deviceId }, // Anciennes sessions avec deviceId
          { userId: user._id }   // Associer au nouveau compte user
        );
        console.log(`✅ ${migratedCount.modifiedCount} sessions migrées pour ${email}`);
      } catch (migrationError) {
        console.error('⚠️ Erreur migration sessions:', migrationError);
        // On continue quand même, migration non-critique
      }
    }

    // 5️⃣ Générer le token JWT
    const token = generateToken(user._id);

    // 6️⃣ Retourner le user (sans password) + token
    res.status(201).json({
      success: true,
      message: 'Compte créé avec succès',
      user: user.toClientFormat(),
      token
    });

  } catch (error) {
    console.error('❌ Erreur signup:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création du compte'
    });
  }
});

/**
 * 🔑 CONNEXION (Login)
 * POST /api/auth/login
 *
 * Body attendu:
 * {
 *   "email": "user@example.com",
 *   "password": "motdepasse123"
 * }
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1️⃣ Validation basique
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email et mot de passe requis'
      });
    }

    // 2️⃣ Trouver l'utilisateur
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
      });
    }

    // 3️⃣ Vérifier le mot de passe
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Email ou mot de passe incorrect'
      });
    }

    // 4️⃣ Mettre à jour lastLogin
    user.lastLogin = new Date();
    await user.save();

    // 5️⃣ Générer le token JWT
    const token = generateToken(user._id);

    // 6️⃣ Retourner le user (sans password) + token
    res.json({
      success: true,
      message: 'Connexion réussie',
      user: user.toClientFormat(),
      token
    });

  } catch (error) {
    console.error('❌ Erreur login:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la connexion'
    });
  }
});

/**
 * 👤 PROFIL UTILISATEUR
 * GET /api/auth/me
 *
 * 🛡️ Route protégée : nécessite un token valide
 * Header requis: Authorization: Bearer <token>
 *
 * Permet de récupérer les infos du user connecté
 * (Utile au démarrage de l'app pour vérifier si le token est encore valide)
 */
router.get('/me', verifyToken, async (req, res) => {
  try {
    // req.userId a été ajouté par le middleware verifyToken
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur introuvable'
      });
    }

    res.json({
      success: true,
      user: user.toClientFormat()
    });

  } catch (error) {
    console.error('❌ Erreur récupération profil:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur serveur'
    });
  }
});

/**
 * 🗑️ SUPPRESSION COMPTE (RGPD)
 * DELETE /api/auth/account
 *
 * 🛡️ Route protégée : nécessite un token valide
 * Header requis: Authorization: Bearer <token>
 *
 * ⚠️ SUPPRIME DÉFINITIVEMENT :
 * - Le compte utilisateur
 * - TOUTES ses sessions enregistrées
 * - TOUTES ses données GPS
 *
 * Conformité RGPD : Droit à l'oubli
 */
router.delete('/account', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    // 1️⃣ Supprimer toutes les sessions du user
    const deletedSessions = await Session.deleteMany({ userId });
    console.log(`🗑️ ${deletedSessions.deletedCount} sessions supprimées pour user ${userId}`);

    // 2️⃣ Supprimer le compte user
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur introuvable'
      });
    }

    res.json({
      success: true,
      message: 'Compte supprimé avec succès',
      deletedSessions: deletedSessions.deletedCount
    });

  } catch (error) {
    console.error('❌ Erreur suppression compte:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du compte'
    });
  }
});

/**
 * 🔑 DEMANDE DE RÉINITIALISATION MOT DE PASSE
 * POST /api/auth/reset/request
 *
 * Body: { "email": "user@example.com" }
 * Réponse: message générique + (token retourné en dev uniquement)
 */
router.post('/reset/request', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email requis'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Toujours répondre 200 pour ne pas révéler l’existence du compte
    if (!user) {
      return res.json({
        success: true,
        message: 'Si un compte existe pour cet email, un lien de réinitialisation a été généré'
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 60 * 60 * 1000; // 1h

    user.passwordResetToken = token;
    user.passwordResetExpires = new Date(expires);
    await user.save();

    // Envoyer l'email (si SMTP configuré)
    try {
      await sendResetEmail(email, token);
    } catch (mailError) {
      console.error('🚨 Erreur envoi email reset:', mailError);
      return res.status(500).json({
        success: false,
        error: 'Impossible d\'envoyer l\'email de réinitialisation'
      });
    }

    const response = {
      success: true,
      message: 'Si un compte existe pour cet email, un lien de réinitialisation a été envoyé'
    };

    // En non-prod, renvoyer le token pour debug
    if (process.env.NODE_ENV !== 'production') {
      response.resetToken = token;
      console.log(`🔑 Token reset généré pour ${email}: ${token}`);
    }

    res.json(response);
  } catch (error) {
    console.error('🚨 Erreur demande reset password:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la demande de réinitialisation'
    });
  }
});

/**
 * ✅ CONFIRMATION RÉINITIALISATION MOT DE PASSE
 * POST /api/auth/reset/confirm
 *
 * Body: { "token": "<token>", "password": "nouveauMotDePasse" }
 */
router.post('/reset/confirm', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        error: 'Token et mot de passe requis'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Le mot de passe doit contenir au moins 8 caractères'
      });
    }

    const user = await User.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: 'Token invalide ou expiré'
      });
    }

    user.password = password; // sera hashé par le hook pre('save')
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès'
    });
  } catch (error) {
    console.error('🚨 Erreur confirmation reset password:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la réinitialisation du mot de passe'
    });
  }
});

module.exports = router;

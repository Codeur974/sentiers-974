require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 4001;

app.use(express.json());

app.use(
  cors({
    origin: function (origin, callback) {
      // Permettre les requêtes sans origin (mobile apps)
      if (!origin) return callback(null, true);
      
      // Liste des origins autorisées
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:4001", // API elle-même
        "http://localhost:8081", // Metro bundler Expo
        "http://192.168.1.12:8081", // Metro bundler Expo sur IP mobile
        "https://senties974.vercel.app",
      ];
      
      // Vérifier si l'origin correspond aux patterns autorisés
      if (allowedOrigins.includes(origin) || 
          origin.startsWith('http://192.168.') ||
          origin.startsWith('http://10.') ||
          origin.startsWith('http://172.')) {
        return callback(null, true);
      }
      
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Servir les fichiers statiques (photos)
app.use("/uploads", express.static("uploads"));

// Routes
app.get("/", (req, res) => {
  res.send("API Backend Sentiers974 fonctionne !");
});

// Configuration multer AVANT MongoDB
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
    cb(null, 'poi_' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'));
    }
  }
});

// Route upload AVANT MongoDB
app.post('/api/upload/photo', upload.single('photo'), (req, res) => {
  try {
    console.log('🔄 Requête upload reçue:', {
      method: req.method,
      url: req.url,
      contentType: req.get('content-type'),
      origin: req.get('origin'),
      hasFile: !!req.file
    });
    
    if (!req.file) {
      console.log('❌ Aucun fichier fourni dans la requête');
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni'
      });
    }

    const photoUrl = `http://${req.get('host')}/uploads/${req.file.filename}`;
    
    console.log('📷 Photo uploadée avec succès:', {
      filename: req.file.filename,
      size: req.file.size,
      url: photoUrl
    });
    
    res.json({
      success: true,
      data: {
        filename: req.file.filename,
        url: photoUrl,
        size: req.file.size,
        mimeType: req.file.mimetype
      }
    });
  } catch (error) {
    console.error('❌ Erreur upload photo:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload',
      error: error.message
    });
  }
});

app.get('/api/upload/test-simple', (req, res) => {
  res.json({ success: true, message: 'Route upload accessible!' });
});

console.log('✅ Routes upload créées AVANT MongoDB');

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URL || process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB connecté avec succès");
    
    // Route de test simple pour les activités
    app.get("/api/test", (req, res) => {
      console.log("🔍 Route test appelée");
      res.json({ success: true, message: "Backend connection works!", data: [] });
    });

    // Route directe pour les activités (bypass du controller)
    app.get("/api/activities-direct", async (req, res) => {
      try {
        console.log("🔍 Route activities-direct appelée");
        const Activity = require("./models/activity");
        const activities = await Activity.find({}).sort({ date: -1 }).limit(10);
        console.log(`📊 Trouvé ${activities.length} activités`);
        res.json({ success: true, data: activities });
      } catch (error) {
        console.error("Erreur activities-direct:", error);
        res.json({ success: false, message: "Erreur", error: error.message });
      }
    });
    
    // Routes définies après connexion MongoDB
    console.log('📝 Chargement des routes...');
    app.use("/api/auth", require("./routes/auth"));
    app.use("/api/activities", require("./routes/activities"));
    app.use("/api/user", require("./routes/user"));
    app.use("/api/poi", require("./routes/poi"));
    
    // Démarrer le serveur sur toutes les interfaces pour accepter les connexions du téléphone
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Serveur démarré sur http://0.0.0.0:${PORT}`);
      console.log(`📱 Accessible depuis votre téléphone sur http://192.168.1.12:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Échec de connexion à MongoDB:", err);
    
    // Démarrer le serveur même sans MongoDB pour les tests
    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur http://localhost:${PORT} (sans MongoDB)`);
    });
  });

// Gestion d'erreurs globale
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Erreur serveur" });
});
console.log("URI détectée :", process.env.MONGODB_URI);

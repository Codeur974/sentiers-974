const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Route de test
router.get('/test', (req, res) => {
  res.json({ message: 'Routes upload fonctionnent!' });
});

// Configuration multer pour l'upload de fichiers
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Générer un nom unique
    const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1E9);
    cb(null, 'poi_' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max
  },
  fileFilter: (req, file, cb) => {
    // Accepter seulement les images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seules les images sont autorisées'));
    }
  }
});

// Route d'upload pour les photos
router.post('/photo', upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier fourni'
      });
    }

    const photoUrl = `http://${req.get('host')}/uploads/${req.file.filename}`;
    
    console.log('📷 Photo uploadée:', req.file.filename);
    
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

module.exports = router;
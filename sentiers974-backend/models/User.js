const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email invalide']
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  name: {
    type: String,
    trim: true
  },
  deviceId: {
    type: String,
    unique: true,
    sparse: true // Permet null/undefined, utilisé pour migration depuis compte anonyme
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
});

// 🔐 HOOK AUTOMATIQUE : Hash le password avant sauvegarde
// ⚠️ PROTECTION DOUBLE HASHAGE : Ne hash QUE si le password a changé
userSchema.pre('save', async function(next) {
  // Si le password n'a pas été modifié, on skip le hashage
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10); // Génère un "sel" aléatoire
    this.password = await bcrypt.hash(this.password, salt); // Hash le password
    next();
  } catch (error) {
    next(error);
  }
});

// 🔑 MÉTHODE : Comparer password lors de la connexion
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 📤 MÉTHODE : Format pour renvoyer au client (sans password)
userSchema.methods.toClientFormat = function() {
  return {
    id: this._id,
    email: this.email,
    name: this.name,
    createdAt: this.createdAt,
    lastLogin: this.lastLogin
  };
};

module.exports = mongoose.model('User', userSchema);

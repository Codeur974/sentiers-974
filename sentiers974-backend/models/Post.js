const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userAvatar: {
    type: String,
    default: null
  },
  userLocation: {
    type: String,
    default: null
  },
  photos: [{
    id: String,
    uri: String,
    caption: String
  }],
  caption: {
    type: String,
    required: true
  },
  likes: [{
    type: String  // Array of user IDs
  }],
  sport: {
    type: String,
    default: null
  },
  location: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index pour optimiser les requêtes
postSchema.index({ userId: 1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ sport: 1 });
postSchema.index({ location: 1 });

module.exports = mongoose.model('Post', postSchema);
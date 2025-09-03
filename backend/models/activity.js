const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    activityType: {
      type: String,
      enum: [
        "course",
        "randonnee",
        "velo",
        "natation",
        "trail",
        "vtt",
        "surf",
        "kitesurf",
      ],
      default: "course",
    },
    gpsData: [
      {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        timestamp: { type: Number },
        elevation: { type: Number },
        speed: { type: Number },
      },
    ],
    distance: {
      type: Number,
      default: 0,
    },
    duration: {
      type: Number, // en secondes
      default: 0,
    },
    elevation: {
      gain: { type: Number, default: 0 },
      loss: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
      min: { type: Number, default: 0 },
    },
    location: {
      region: { type: String }, // Saint-Denis, Saint-Paul, etc.
      trail: { type: String }, // Nom du sentier si applicable
      difficulty: {
        type: String,
        enum: ["facile", "moyen", "difficile", "expert"],
      },
    },
    weather: {
      temperature: { type: Number },
      humidity: { type: Number },
      conditions: { type: String },
    },
    notes: {
      type: String,
      trim: true,
    },
    photos: [
      {
        url: { type: String },
        caption: { type: String },
      },
    ],
    date: {
      type: Date,
      default: Date.now,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index pour améliorer les performances
activitySchema.index({ user: 1, date: -1 });
activitySchema.index({ activityType: 1 });
activitySchema.index({ "location.region": 1 });

module.exports = mongoose.model("Activity", activitySchema);

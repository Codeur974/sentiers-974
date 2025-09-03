const mongoose = require("mongoose");

const pointOfInterestSchema = new mongoose.Schema(
  {
    activity: {
      type: mongoose.Schema.Types.Mixed, // Permet ObjectId ou String
      required: true,
    },
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
    note: {
      type: String,
      trim: true,
    },
    location: {
      latitude: {
        type: Number,
        required: true,
      },
      longitude: {
        type: Number,
        required: true,
      },
      altitude: {
        type: Number,
      },
    },
    tracking: {
      distance: {
        type: Number, // Distance parcourue quand POI créé (km)
        required: true,
      },
      time: {
        type: Number, // Temps écoulé quand POI créé (ms)
        required: true,
      },
    },
    photo: {
      url: { type: String },
      filename: { type: String },
      size: { type: Number },
      mimeType: { type: String },
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index pour améliorer les performances
pointOfInterestSchema.index({ activity: 1, date: -1 });
pointOfInterestSchema.index({ user: 1 });
pointOfInterestSchema.index({ "location.latitude": 1, "location.longitude": 1 });

module.exports = mongoose.model("PointOfInterest", pointOfInterestSchema);
const express = require("express");
const mongoose = require("mongoose");
const Session = require("../models/Session");
const cloudinary = require("../config/cloudinary");
const upload = require("../middleware/upload");
const { verifyToken } = require("../middleware/auth");
const { buildUserFilter } = require("../utils/user-filter");

const router = express.Router();

const allowedSessionFields = [
  "sessionId",
  "sport",
  "distance",
  "duration",
  "calories",
  "avgSpeed",
  "maxSpeed",
  "steps",
  "trackingPath",
  "pois",
  "photos",
  "startCoordinates",
  "endCoordinates",
  "status",
  "deviceInfo",
  "startLocation",
];

const sanitizeSessionPayload = (payload = {}) => {
  const safe = {};
  allowedSessionFields.forEach((field) => {
    if (payload[field] !== undefined) {
      safe[field] = payload[field];
    }
  });

  if (safe.sport && typeof safe.sport === "string") {
    safe.sport = { nom: safe.sport };
  }

  return safe;
};

const applySessionUpdates = (session, data) => {
  Object.entries(data).forEach(([key, value]) => {
    session[key] = value;
  });
};

const buildOwnershipFilter = (sessionId, userId) => ({
  sessionId,
  ...buildUserFilter(userId),
});

router.post("/sessions", verifyToken, async (req, res) => {
  try {
    const sessionData = sanitizeSessionPayload(req.body);
    sessionData.userId = req.userId;

    if (!sessionData.sport?.nom) {
      return res.status(400).json({
        success: false,
        error: "sport.nom est requis",
      });
    }

    if (!sessionData.sessionId) {
      sessionData.sessionId = `session_${Date.now()}_${new mongoose.Types.ObjectId().toString()}`;
    }

    const filter = buildOwnershipFilter(sessionData.sessionId, req.userId);
    const existingSession = await Session.findOne(filter);

    let session;
    if (existingSession) {
      applySessionUpdates(existingSession, sessionData);
      await existingSession.save();
      session = existingSession;
    } else {
      session = new Session(sessionData);
      await session.save();
    }

    res.status(existingSession ? 200 : 201).json({
      success: true,
      data: session.toClientFormat(),
    });
  } catch (error) {
    console.error("Erreur sauvegarde session:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur lors de la sauvegarde",
    });
  }
});

router.get("/sessions", verifyToken, async (req, res) => {
  try {
    const { limit = 50, sport, dateFrom, dateTo } = req.query;

    const query = {
      ...buildUserFilter(req.userId),
    };

    if (sport) query["sport.nom"] = sport;

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const sessions = await Session.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10));

    res.json({
      success: true,
      data: sessions.map((s) => s.toClientFormat()),
      count: sessions.length,
    });
  } catch (error) {
    console.error("Erreur recuperation sessions:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

router.get("/sessions/:sessionId", verifyToken, async (req, res) => {
  try {
    const session = await Session.findOne(
      buildOwnershipFilter(req.params.sessionId, req.userId)
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Session non trouvee",
      });
    }

    res.json({
      success: true,
      data: {
        ...session.toClientFormat(),
        trackingPath: session.trackingPath,
        pois: session.pois,
        photos: session.photos,
        startCoordinates: session.startCoordinates,
        endCoordinates: session.endCoordinates,
      },
    });
  } catch (error) {
    console.error("Erreur recuperation session:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

router.delete("/sessions/:sessionId", verifyToken, async (req, res) => {
  try {
    const result = await Session.deleteOne(
      buildOwnershipFilter(req.params.sessionId, req.userId)
    );

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Session non trouvee",
      });
    }

    res.json({
      success: true,
      message: "Session supprimee",
    });
  } catch (error) {
    console.error("Erreur suppression session:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

router.post("/sessions/:sessionId/photos", verifyToken, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const photoData = req.body;

    if (!photoData.uri || !photoData.caption) {
      return res.status(400).json({
        success: false,
        error: "uri et caption requis",
      });
    }

    const result = await Session.updateOne(
      buildOwnershipFilter(sessionId, req.userId),
      { $push: { photos: photoData } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Session non trouvee",
      });
    }

    res.json({
      success: true,
      data: photoData,
    });
  } catch (error) {
    console.error("Erreur ajout photo session:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

router.delete(
  "/sessions/:sessionId/photos/:photoId",
  verifyToken,
  async (req, res) => {
    try {
      const { sessionId, photoId } = req.params;

      const result = await Session.updateOne(
        buildOwnershipFilter(sessionId, req.userId),
        { $pull: { photos: { id: photoId } } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({
          success: false,
          error: "Session non trouvee",
        });
      }

      res.json({
        success: true,
        message: "Photo supprimee",
      });
    } catch (error) {
      console.error("Erreur suppression photo session:", error);
      res.status(500).json({
        success: false,
        error: "Erreur serveur",
      });
    }
  }
);

router.post(
  "/sessions/:sessionId/poi",
  verifyToken,
  upload.single("photo"),
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { title, note, latitude, longitude, distance, time } = req.body;
      const photoPayload =
        req.body.photoUri || req.body.photoUrl || req.body.uri || req.body.photo;

      if (!title || !latitude || !longitude) {
        return res.status(400).json({
          success: false,
          error: "title, latitude et longitude sont requis",
        });
      }

      const session = await Session.findOne(
        buildOwnershipFilter(sessionId, req.userId)
      );
      if (!session) {
        return res.status(404).json({
          success: false,
          error: "Session non trouvee",
        });
      }

      let photoUrl = null;
      if (req.file) {
        try {
          const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString(
            "base64"
          )}`;
          const uploadResult = await cloudinary.uploader.upload(base64Image, {
            folder: "sentiers974/poi",
            resource_type: "image",
            transformation: [
              { width: 1600, height: 1600, crop: "limit" },
              { quality: "auto:good" },
              { fetch_format: "auto" },
            ],
          });
          photoUrl = uploadResult.secure_url;
        } catch (err) {
          console.warn("Upload photo POI echoue, continue sans photo:", err);
        }
      }

      if (!photoUrl && photoPayload) {
        try {
          if (typeof photoPayload === "string" && photoPayload.startsWith("http")) {
            photoUrl = photoPayload;
          } else {
            const normalized =
              typeof photoPayload === "string" && photoPayload.startsWith("data:")
                ? photoPayload
                : `data:image/jpeg;base64,${photoPayload}`;
            const uploadResult = await cloudinary.uploader.upload(normalized, {
              folder: "sentiers974/poi",
              resource_type: "image",
              transformation: [
                { width: 1600, height: 1600, crop: "limit" },
                { quality: "auto:good" },
                { fetch_format: "auto" },
              ],
            });
            photoUrl = uploadResult.secure_url;
          }
        } catch (err) {
          console.warn(
            "Upload photo POI (string/base64) echoue, continue sans photo:",
            err
          );
          photoUrl = photoPayload;
        }
      }

      const poiId =
        req.body.id && typeof req.body.id === "string"
          ? req.body.id
          : `poi_${Date.now()}_${new mongoose.Types.ObjectId().toString()}`;
      const timestampValue = time ? parseInt(time, 10) : Date.now();
      const safeTimestamp =
        !timestampValue || Number.isNaN(timestampValue) || timestampValue <= 0
          ? Date.now()
          : timestampValue < 1e12
          ? timestampValue * 1000
          : timestampValue;

      const poi = {
        id: poiId,
        title: title.trim(),
        note: note ? note.trim() : undefined,
        coordinates: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
        },
        photo: photoUrl,
        distance: distance ? Number(distance) : undefined,
        timestamp: safeTimestamp,
        createdAt: safeTimestamp,
      };

      session.pois = session.pois || [];
      session.pois.push(poi);

      session.photos = session.photos || [];
      if (photoUrl) {
        session.photos.push({
          id: poi.id,
          url: photoUrl,
          uri: photoUrl,
          title: title.trim(),
          createdAt: safeTimestamp,
          timestamp: safeTimestamp,
        });
      }
      await session.save();

      res.status(201).json({
        success: true,
        data: {
          id: poi.id,
          sessionId,
          title: poi.title,
          note: poi.note,
          coordinates: poi.coordinates,
          photoUrl: poi.photo,
          photoUri: poi.photo,
          uri: poi.photo,
          timestamp: poi.timestamp,
          distance: poi.distance,
        },
      });
    } catch (error) {
      console.error("Erreur ajout POI:", error);
      res.status(500).json({
        success: false,
        error: "Erreur serveur lors de l'ajout du POI",
      });
    }
  }
);

router.get("/pointofinterests", verifyToken, async (req, res) => {
  try {
    const pois = await Session.aggregate([
      { $match: { pois: { $exists: true, $ne: [] }, ...buildUserFilter(req.userId) } },
      { $unwind: "$pois" },
      {
        $project: {
          _id: 0,
          id: "$pois.id",
          sessionId: "$sessionId",
          title: "$pois.title",
          note: "$pois.note",
          coordinates: "$pois.coordinates",
          photo: "$pois.photo",
          photoUri: "$pois.photo",
          uri: "$pois.photo",
          timestamp: "$pois.timestamp",
        },
      },
      { $sort: { timestamp: -1 } },
      { $limit: 1000 },
    ]);

    res.json(pois || []);
  } catch (error) {
    console.error("Erreur recuperation POI:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur lors de la recuperation des POI",
    });
  }
});

router.delete("/pointofinterests/:poiId", verifyToken, async (req, res) => {
  try {
    const { poiId } = req.params;

    const result = await Session.updateOne(
      { "pois.id": poiId, ...buildUserFilter(req.userId) },
      { $pull: { pois: { id: poiId } } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "POI non trouve",
      });
    }

    res.json({
      success: true,
      message: "POI supprime",
    });
  } catch (error) {
    console.error("Erreur suppression POI:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur lors de la suppression du POI",
    });
  }
});

router.get("/sessions/stats/daily", verifyToken, async (req, res) => {
  try {
    const { date } = req.query;

    let startDate;
    let endDate;
    if (date) {
      startDate = new Date(date);
      endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
    } else {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }

    const stats = await Session.aggregate([
      {
        $match: {
          ...buildUserFilter(req.userId),
          createdAt: { $gte: startDate, $lt: endDate },
        },
      },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalDistance: { $sum: "$distance" },
          totalDuration: { $sum: "$duration" },
          totalCalories: { $sum: "$calories" },
          totalSteps: { $sum: "$steps" },
          avgSpeed: { $avg: "$avgSpeed" },
          maxSpeed: { $max: "$maxSpeed" },
          sports: { $addToSet: "$sport.nom" },
          sessions: {
            $push: {
              id: "$sessionId",
              sport: "$sport.nom",
              distance: "$distance",
              duration: "$duration",
              avgSpeed: "$avgSpeed",
              maxSpeed: "$maxSpeed",
              steps: "$steps",
              createdAt: "$createdAt",
            },
          },
        },
      },
    ]);

    res.json({
      success: true,
      date: startDate.toISOString().split("T")[0],
      data:
        stats.length > 0
          ? stats[0]
          : {
              totalSessions: 0,
              totalDistance: 0,
              totalDuration: 0,
              totalCalories: 0,
              totalSteps: 0,
              avgSpeed: 0,
              maxSpeed: 0,
              sports: [],
              sessions: [],
            },
    });
  } catch (error) {
    console.error("Erreur stats quotidiennes:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

module.exports = router;

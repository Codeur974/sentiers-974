require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const path = require("path");

const authRoutes = require("./routes/auth");
const sentiersRoutes = require("./routes/sentiers");
const sessionRoutes = require("./routes/sessions");
const postRoutes = require("./routes/posts");
const uploadRoutes = require("./routes/uploads");
const healthRoutes = require("./routes/health");

const app = express();
const PORT = process.env.PORT || 3001;

// Derriere un proxy pour express-rate-limit
app.set("trust proxy", 1);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: "Trop de tentatives, reessayez dans 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { success: false, error: "Trop de requetes, ralentissez" },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.ALLOWED_ORIGINS?.split(",") || []
        : true,
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Pages statiques (mentions legales / reset password)
app.use(express.static(path.join(__dirname, "public")));
app.get("/privacy-policy", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "privacy-policy.html"));
});
app.get("/terms-of-service", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "terms-of-service.html"));
});
app.get("/reset-password", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "reset-password.html"));
});

// Rate limiting general sur toutes les routes API
app.use("/api/", apiLimiter);

// Log minimal des requetes
app.use((req, _res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl}`);
  next();
});

// Connexion MongoDB
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connecte"))
  .catch((err) => console.error("Erreur MongoDB:", err));

// Routes API
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api", sentiersRoutes);
app.use("/api", sessionRoutes);
app.use("/api", postRoutes);
app.use("/api", uploadRoutes);
app.use("/api", healthRoutes);

// 404 API
app.use("/api/*", (_req, res) => {
  res.status(404).json({
    success: false,
    error: "Route API non trouvee",
  });
});

// Demarrage
app.listen(PORT, () => {
  console.log(`API Sentiers demarree sur le port ${PORT}`);
});

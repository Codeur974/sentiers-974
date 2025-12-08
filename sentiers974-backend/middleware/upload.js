const multer = require("multer");

// In-memory storage with conservative limit to avoid OOM via oversized payloads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

module.exports = upload;

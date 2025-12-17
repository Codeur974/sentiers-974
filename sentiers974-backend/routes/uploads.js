const express = require("express");
const cloudinary = require("../config/cloudinary");
const upload = require("../middleware/upload");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

const isImageMime = (mime = "") => mime.toLowerCase().startsWith("image/");
const isBase64Image = (data = "") =>
  typeof data === "string" && data.trim().toLowerCase().startsWith("data:image/");

router.post("/upload", verifyToken, upload.single("photo"), async (req, res) => {
  try {
    let imageData;

    if (req.body.base64) {
      if (!isBase64Image(req.body.base64)) {
        return res.status(400).json({
          success: false,
          error: "Format base64 non image",
        });
      }
      imageData = req.body.base64;
    } else if (req.file) {
      if (!isImageMime(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: "Seuls les fichiers image sont autorises",
        });
      }
      imageData = `data:${req.file.mimetype};base64,${req.file.buffer.toString(
        "base64"
      )}`;
    } else {
      return res.status(400).json({
        success: false,
        error: "Aucune image fournie",
      });
    }

    const result = await cloudinary.uploader.upload(imageData, {
      folder: "sentiers974",
      resource_type: "auto",
      transformation: [
        { width: 1200, height: 1200, crop: "limit" },
        { quality: "auto:good" },
        { fetch_format: "auto" },
      ],
    });

    res.json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      },
    });
  } catch (error) {
    console.error("Erreur upload Cloudinary:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de l'upload de l'image",
    });
  }
});

router.post(
  "/upload/multiple",
  verifyToken,
  upload.array("photos", 10),
  async (req, res) => {
    try {
      const uploadPromises = [];

      if (req.body.images && Array.isArray(req.body.images)) {
        for (const base64Image of req.body.images) {
          if (!isBase64Image(base64Image)) {
            return res.status(400).json({
              success: false,
              error: "Format base64 non image dans la liste",
            });
          }
          uploadPromises.push(
            cloudinary.uploader.upload(base64Image, {
              folder: "sentiers974",
              resource_type: "auto",
              transformation: [
                { width: 1200, height: 1200, crop: "limit" },
                { quality: "auto:good" },
                { fetch_format: "auto" },
              ],
            })
          );
        }
      } else if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          if (!isImageMime(file.mimetype)) {
            return res.status(400).json({
              success: false,
              error: "Seuls les fichiers image sont autorises",
            });
          }
          const base64Image = `data:${
            file.mimetype
          };base64,${file.buffer.toString("base64")}`;
          uploadPromises.push(
            cloudinary.uploader.upload(base64Image, {
              folder: "sentiers974",
              resource_type: "auto",
              transformation: [
                { width: 1200, height: 1200, crop: "limit" },
                { quality: "auto:good" },
                { fetch_format: "auto" },
              ],
            })
          );
        }
      } else {
        return res.status(400).json({
          success: false,
          error: "Aucune image fournie",
        });
      }

      const results = await Promise.all(uploadPromises);

      res.json({
        success: true,
        data: results.map((result) => ({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
        })),
      });
    } catch (error) {
      console.error("Erreur upload multiple Cloudinary:", error);
      res.status(500).json({
        success: false,
        error: "Erreur lors de l'upload des images",
      });
    }
  }
);

module.exports = router;

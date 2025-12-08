const express = require("express");
const Sentier = require("../models/Sentier");
const Session = require("../models/Session");
const Post = require("../models/Post");
const Comment = require("../models/Comment");

const router = express.Router();

router.get("/health", async (_req, res) => {
  try {
    const sentiersCount = await Sentier.countDocuments();
    const sessionsCount = await Session.countDocuments();
    const postsCount = await Post.countDocuments();
    const commentsCount = await Comment.countDocuments();

    res.json({
      success: true,
      status: "healthy",
      mongodb: "connected",
      sentiers_count: sentiersCount,
      sessions_count: sessionsCount,
      posts_count: postsCount,
      comments_count: commentsCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: "error",
      mongodb: "disconnected",
    });
  }
});

module.exports = router;

const express = require("express");
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

router.get("/posts", async (req, res) => {
  try {
    const { page = 1, limit = 20, userId, sport } = req.query;

    const query = {};
    if (userId) query.userId = userId;
    if (sport) query.sport = sport;

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit, 10))
      .skip((parseInt(page, 10) - 1) * parseInt(limit, 10));

    const postsWithComments = await Promise.all(
      posts.map(async (post) => {
        const comments = await Comment.find({ postId: post._id }).sort({
          createdAt: 1,
        });

        return {
          id: post._id,
          userId: post.userId,
          userName: post.userName,
          userAvatar: post.userAvatar,
          userLocation: post.userLocation,
          photos: post.photos,
          caption: post.caption,
          likes: post.likes,
          sport: post.sport,
          location: post.location,
          createdAt: post.createdAt.getTime(),
          comments: comments.map((comment) => ({
            id: comment._id,
            userId: comment.userId,
            userName: comment.userName,
            userAvatar: comment.userAvatar,
            text: comment.text,
            createdAt: comment.createdAt.getTime(),
          })),
        };
      })
    );

    res.json({
      success: true,
      data: postsWithComments,
      count: postsWithComments.length,
    });
  } catch (error) {
    console.error("Erreur recuperation posts:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

router.post("/posts", verifyToken, async (req, res) => {
  try {
    const { userName, userAvatar, userLocation, photos, caption, sport, location } =
      req.body;

    if (!userName || !caption) {
      return res.status(400).json({
        success: false,
        error: "userName et caption sont requis",
      });
    }

    const newPost = new Post({
      userId: req.userId,
      userName,
      userAvatar,
      userLocation,
      photos,
      caption,
      sport,
      location,
      likes: [],
      createdAt: new Date(),
    });

    await newPost.save();

    res.status(201).json({
      success: true,
      data: {
        id: newPost._id,
        userId: newPost.userId,
        userName: newPost.userName,
        userAvatar: newPost.userAvatar,
        userLocation: newPost.userLocation,
        photos: newPost.photos,
        caption: newPost.caption,
        likes: newPost.likes,
        sport: newPost.sport,
        location: newPost.location,
        createdAt: newPost.createdAt.getTime(),
        comments: [],
      },
    });
  } catch (error) {
    console.error("Erreur creation post:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

router.put("/posts/:id", verifyToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const updateData = req.body;

    delete updateData._id;
    delete updateData.userId;
    delete updateData.createdAt;

    updateData.updatedAt = new Date();

    const updatedPost = await Post.findOneAndUpdate(
      { _id: postId, userId: req.userId },
      updateData,
      { new: true }
    );

    if (!updatedPost) {
      return res.status(404).json({
        success: false,
        error: "Post non trouve ou non autorise",
      });
    }

    res.json({
      success: true,
      data: {
        id: updatedPost._id,
        userId: updatedPost.userId,
        userName: updatedPost.userName,
        userAvatar: updatedPost.userAvatar,
        userLocation: updatedPost.userLocation,
        photos: updatedPost.photos,
        caption: updatedPost.caption,
        likes: updatedPost.likes,
        sport: updatedPost.sport,
        location: updatedPost.location,
        createdAt: updatedPost.createdAt.getTime(),
        updatedAt: updatedPost.updatedAt.getTime(),
      },
    });
  } catch (error) {
    console.error("Erreur modification post:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

router.delete("/posts/:id", verifyToken, async (req, res) => {
  try {
    const postId = req.params.id;

    const deletedPost = await Post.findOneAndDelete({
      _id: postId,
      userId: req.userId,
    });

    if (!deletedPost) {
      return res.status(404).json({
        success: false,
        error: "Post non trouve ou non autorise",
      });
    }

    await Comment.deleteMany({ postId: postId });

    res.json({
      success: true,
      message: "Post et commentaires supprimes",
    });
  } catch (error) {
    console.error("Erreur suppression post:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

router.post("/posts/:id/like", verifyToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.userId;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post non trouve",
      });
    }

    const isLiked = post.likes.includes(userId);

    if (isLiked) {
      post.likes = post.likes.filter((id) => id !== userId);
    } else {
      post.likes.push(userId);
    }

    await post.save();

    res.json({
      success: true,
      data: {
        liked: !isLiked,
        likesCount: post.likes.length,
      },
    });
  } catch (error) {
    console.error("Erreur like post:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

router.post("/posts/:id/comments", verifyToken, async (req, res) => {
  try {
    const postId = req.params.id;
    const { userName, userAvatar, text, photos } = req.body;

    if (!userName || !text) {
      return res.status(400).json({
        success: false,
        error: "userName et text sont requis",
      });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post non trouve",
      });
    }

    const newComment = new Comment({
      postId,
      userId: req.userId,
      userName,
      userAvatar,
      text: text.trim(),
      photos: photos || [],
      createdAt: new Date(),
    });

    await newComment.save();

    res.status(201).json({
      success: true,
      data: {
        id: newComment._id,
        userId: newComment.userId,
        userName: newComment.userName,
        userAvatar: newComment.userAvatar,
        text: newComment.text,
        photos: newComment.photos,
        createdAt: newComment.createdAt.getTime(),
      },
    });
  } catch (error) {
    console.error("Erreur ajout commentaire:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

router.get("/posts/:id/comments", async (req, res) => {
  try {
    const postId = req.params.id;

    const comments = await Comment.find({ postId }).sort({ createdAt: 1 });

    res.json({
      success: true,
      data: comments.map((comment) => ({
        id: comment._id,
        userId: comment.userId,
        userName: comment.userName,
        userAvatar: comment.userAvatar,
        text: comment.text,
        createdAt: comment.createdAt.getTime(),
      })),
      count: comments.length,
    });
  } catch (error) {
    console.error("Erreur recuperation commentaires:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

router.put("/comments/:id", verifyToken, async (req, res) => {
  try {
    const commentId = req.params.id;
    const { text, photos } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: "Le texte est requis",
      });
    }

    const comment = await Comment.findOneAndUpdate(
      { _id: commentId, userId: req.userId },
      {
        text: text.trim(),
        photos: photos || [],
        updatedAt: new Date(),
      },
      { new: true }
    );

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: "Commentaire non trouve ou non autorise",
      });
    }

    res.json({
      success: true,
      data: {
        id: comment._id,
        userId: comment.userId,
        userName: comment.userName,
        userAvatar: comment.userAvatar,
        text: comment.text,
        photos: comment.photos,
        createdAt: comment.createdAt.getTime(),
        updatedAt: comment.updatedAt.getTime(),
      },
    });
  } catch (error) {
    console.error("Erreur modification commentaire:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

router.delete("/comments/:id", verifyToken, async (req, res) => {
  try {
    const commentId = req.params.id;

    const comment = await Comment.findOneAndDelete({
      _id: commentId,
      userId: req.userId,
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: "Commentaire non trouve ou non autorise",
      });
    }

    res.json({
      success: true,
      data: { message: "Commentaire supprime avec succes" },
    });
  } catch (error) {
    console.error("Erreur suppression commentaire:", error);
    res.status(500).json({
      success: false,
      error: "Erreur serveur",
    });
  }
});

module.exports = router;

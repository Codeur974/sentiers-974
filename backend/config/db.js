const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URL || process.env.MONGODB_URI;
    const conn = await mongoose.connect(uri);

    console.log(`✅ MongoDB connecté: ${conn.connection.host}`);
  } catch (error) {
    console.error("❌ Erreur de connexion MongoDB:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;

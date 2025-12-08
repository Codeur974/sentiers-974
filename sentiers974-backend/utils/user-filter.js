const mongoose = require("mongoose");

const buildUserFilter = (userId) => {
  const candidates = [userId];
  if (mongoose.Types.ObjectId.isValid(userId)) {
    candidates.push(new mongoose.Types.ObjectId(userId));
  }

  return { userId: { $in: candidates } };
};

module.exports = {
  buildUserFilter,
};

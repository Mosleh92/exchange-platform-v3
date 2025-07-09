
// backend/src/models/p2p/P2PRating.js
const mongoose = require('mongoose');

const p2pRatingSchema = new mongoose.Schema({
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'P2PTransaction',
    required: true
  },
  raterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ratedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  criteria: {
    communication: { type: Number, min: 1, max: 5 },
    punctuality: { type: Number, min: 1, max: 5 },
    trustworthiness: { type: Number, min: 1, max: 5 },
    professionalism: { type: Number, min: 1, max: 5 }
  },
  comment: {
    type: String,
    maxlength: 500
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  response: {
    comment: String,
    respondedAt: Date
  }
}, {
  timestamps: true
});

p2pRatingSchema.index({ ratedUserId: 1 });
p2pRatingSchema.index({ raterId: 1 });
p2pRatingSchema.index({ transactionId: 1 });

module.exports = mongoose.model('P2PRating', p2pRatingSchema);

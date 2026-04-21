const mongoose = require('mongoose');

const keyFindingSchema = new mongoose.Schema({
  type: { type: String, enum: ['positive', 'negative', 'neutral'] },
  text: String,
}, { _id: false });

const proposedActionSchema = new mongoose.Schema({
  priority: { type: String, enum: ['high', 'medium', 'low'] },
  title: String,
  description: String,
  impact: String,
}, { _id: false });

const analysisSchema = new mongoose.Schema({
  headline: String,
  healthScore: Number,
  keyFindings: [keyFindingSchema],
  proposedActions: [proposedActionSchema],
  competitorAlert: String,
  citationOpportunity: String,
}, { _id: false });

const dailyAnalysisSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true,
    index: true,
  },
  projectId: String,
  brandName: String,
  snapshot: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  analysis: analysisSchema,
}, {
  timestamps: true,
});

// Compound index: one analysis per user per day
dailyAnalysisSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyAnalysis', dailyAnalysisSchema);

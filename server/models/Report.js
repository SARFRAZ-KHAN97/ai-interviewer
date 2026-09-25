import mongoose from 'mongoose'

export const ReportStatus = Object.freeze({
  PROCESSING: 'processing',
  READY: 'ready',
  FAILED: 'failed',
})

const dimensionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    comment: {
      type: String,
      default: '',
    },
  },
  { _id: false },
)

const questionAnalysisSchema = new mongoose.Schema(
  {
    questionOrder: {
      type: Number,
      required: true,
    },
    score: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },
    strengths: {
      type: [String],
      default: [],
    },
    weaknesses: {
      type: [String],
      default: [],
    },
    suggestion: {
      type: String,
      default: '',
    },
  },
  { _id: false },
)

const reportSchema = new mongoose.Schema(
  {
    interview: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      required: true,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ReportStatus),
      default: ReportStatus.PROCESSING,
    },
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    summary: {
      type: String,
      default: '',
    },
    dimensions: {
      type: [dimensionSchema],
      default: [],
    },
    questionAnalysis: {
      type: [questionAnalysisSchema],
      default: [],
    },
    strengths: {
      type: [String],
      default: [],
    },
    weaknesses: {
      type: [String],
      default: [],
    },
    suggestions: {
      type: [String],
      default: [],
    },
    failureReason: {
      type: String,
      default: '',
    },
    model: {
      type: String,
      default: '',
    },
    promptVersion: {
      type: String,
      default: '',
    },
    raw: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true },
)

export const Report = mongoose.model('Report', reportSchema)

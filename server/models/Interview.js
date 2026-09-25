import mongoose from 'mongoose'

export const InterviewStatus = Object.freeze({
  CREATED: 'created',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  PROCESSING: 'processing',
  REPORTED: 'reported',
  FAILED: 'failed',
})

export const InterviewDifficulty = Object.freeze({
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
})

const setupSchema = new mongoose.Schema(
  {
    targetRole: {
      type: String,
      required: [true, 'Target role is required'],
      trim: true,
    },
    difficulty: {
      type: String,
      enum: Object.values(InterviewDifficulty),
      default: InterviewDifficulty.MEDIUM,
    },
    questionCount: {
      type: Number,
      min: 1,
      max: 20,
      default: 5,
    },
    timePerQuestionSeconds: {
      type: Number,
      min: 15,
      max: 600,
      default: 60,
    },
    language: {
      type: String,
      default: 'en',
      trim: true,
    },
  },
  { _id: false },
)

const questionSchema = new mongoose.Schema(
  {
    order: {
      type: Number,
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Question text is required'],
    },
    category: {
      type: String,
      default: 'general',
    },
    timeLimitSeconds: {
      type: Number,
      required: [true, 'Question time limit is required'],
    },
  },
  { _id: true },
)

const answerSchema = new mongoose.Schema(
  {
    question: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    text: {
      type: String,
      default: '',
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
)

const interviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    resume: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(InterviewStatus),
      default: InterviewStatus.CREATED,
      index: true,
    },
    setup: {
      type: setupSchema,
      required: true,
    },
    questions: {
      type: [questionSchema],
      default: [],
    },
    answers: {
      type: [answerSchema],
      default: [],
    },
    currentQuestionIndex: {
      type: Number,
      default: 0,
    },
    startedAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true },
)

export const Interview = mongoose.model('Interview', interviewSchema)

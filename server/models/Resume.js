import mongoose from 'mongoose'

export const ResumeParseStatus = Object.freeze({
  PENDING: 'pending',
  PARSED: 'parsed',
  FAILED: 'failed',
})

const resumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: [true, 'File name is required'],
    },
    fileType: {
      type: String,
      enum: ['pdf', 'docx'],
      required: [true, 'File type is required'],
    },
    filePath: {
      type: String,
      required: [true, 'File path is required'],
    },
    parsedText: {
      type: String,
      default: '',
    },
    parseStatus: {
      type: String,
      enum: Object.values(ResumeParseStatus),
      default: ResumeParseStatus.PENDING,
    },
    skills: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
)

export const Resume = mongoose.model('Resume', resumeSchema)

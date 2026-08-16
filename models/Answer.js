import mongoose from 'mongoose';

const AnswerSchema = new mongoose.Schema(
  {
    attemptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attempt', required: true, index: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
    answer: { type: mongoose.Schema.Types.Mixed, default: null },
    marksAwarded: { type: Number, default: null },
    gradingStatus: {
      type: String,
      enum: ['UNGRADED', 'AUTO_GRADED', 'PENDING_REVIEW', 'MANUALLY_GRADED'],
      default: 'UNGRADED',
    },
    feedback: { type: String, default: null },
    savedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

AnswerSchema.index({ attemptId: 1, questionId: 1 }, { unique: true });

export default mongoose.models.Answer || mongoose.model('Answer', AnswerSchema);

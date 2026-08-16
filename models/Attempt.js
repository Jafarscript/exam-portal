import mongoose from 'mongoose';

const AttemptSchema = new mongoose.Schema(
  {
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'SUBMITTED', 'PENDING_REVIEW', 'FINALIZED'],
      default: 'IN_PROGRESS',
    },
    startedAt: { type: Date, default: Date.now },
    submittedAt: { type: Date, default: null },
    // Server-computed absolute deadline for this attempt (startedAt + duration).
    // The frontend timer is cosmetic only - this field is what the backend
    // trusts when deciding whether the attempt has actually expired.
    expiresAt: { type: Date, default: null },
    // Persisted question order (array of Question _ids as strings) and, per
    // question, persisted option order - fixed at start time so refreshing
    // or resuming never re-shuffles what the student already saw.
    questionOrder: { type: [String], default: [] },
    answerOrder: { type: mongoose.Schema.Types.Mixed, default: {} }, // { [questionId]: [optionId,...] }
    tabSwitchCount: { type: Number, default: 0 },
    fullscreenExitCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// A student can only ever have one attempt per exam.
AttemptSchema.index({ examId: 1, studentId: 1 }, { unique: true });

export default mongoose.models.Attempt || mongoose.model('Attempt', AttemptSchema);

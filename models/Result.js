import mongoose from 'mongoose';

const ResultSchema = new mongoose.Schema(
  {
    attemptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attempt', required: true, unique: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    totalMarks: { type: Number, required: true },
    earnedMarks: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    passMark: { type: Number, required: true },
    status: { type: String, enum: ['PENDING', 'FINAL'], default: 'PENDING' },
    passed: { type: Boolean, default: null },
    finalizedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Result || mongoose.model('Result', ResultSchema);

import mongoose from 'mongoose';

const ExamSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
    duration: { type: Number, default: null }, // minutes; null when untimed
    isTimed: { type: Boolean, default: true },
    deadline: { type: Date, required: true },
    passMark: { type: Number, required: true }, // percentage, 0-100
    randomizeQuestions: { type: Boolean, default: false },
    randomizeAnswers: { type: Boolean, default: false },
    // If set, each student's attempt draws this many questions at random
    // from the full question bank (e.g. 20 of 40). Null/0 = show every
    // question. Selection happens once, at attempt-start, and is persisted
    // on the attempt (same as questionOrder) so it never changes on resume.
    questionsToShow: { type: Number, default: null },
    status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'CLOSED'], default: 'DRAFT' },
    publishedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.models.Exam || mongoose.model('Exam', ExamSchema);

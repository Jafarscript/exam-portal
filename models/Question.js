import mongoose from 'mongoose';

const OptionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true }, // stable id, e.g. "o1" - used so
    // shuffled order never depends on array index
    text: { type: String, required: true },
    textDirection: { type: String, enum: ['LTR', 'RTL', 'AUTO'], default: 'AUTO' },
  },
  { _id: false }
);

const QuestionSchema = new mongoose.Schema(
  {
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    type: {
      type: String,
      enum: ['MCQ', 'MULTI_SELECT', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY', 'FILL_BLANK'],
      required: true,
    },
    text: { type: String, required: true },
    textDirection: { type: String, enum: ['LTR', 'RTL', 'AUTO'], default: 'AUTO' },
    marks: { type: Number, required: true, min: 0 },
    options: { type: [OptionSchema], default: [] }, // MCQ / MULTI_SELECT
    // MCQ: option id string. MULTI_SELECT: array of option ids.
    // TRUE_FALSE: "true" | "false". FILL_BLANK: string or array of accepted strings.
    // SHORT_ANSWER/ESSAY: undefined (graded manually, no stored answer key).
    correctAnswer: { type: mongoose.Schema.Types.Mixed, default: null },
    imageUrl: { type: String, default: null },
    audioUrl: { type: String, default: null },
    order: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Question || mongoose.model('Question', QuestionSchema);

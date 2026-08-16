import mongoose from 'mongoose';

const IntegrityEventSchema = new mongoose.Schema(
  {
    attemptId: { type: mongoose.Schema.Types.ObjectId, ref: 'Attempt', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    type: { type: String, enum: ['TAB_SWITCH', 'FULLSCREEN_EXIT'], required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export default mongoose.models.IntegrityEvent ||
  mongoose.model('IntegrityEvent', IntegrityEventSchema);

import mongoose from 'mongoose';

const ReportRemarkSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, unique: true, index: true },
    termName: { type: String, default: 'Term 1 (2026/2027)' },
    academicSession: { type: String, default: '2026/2027 Academic Session' },
    teacherRemark: { type: String, default: '' },
    principalRemark: { type: String, default: '' },
    conductRating: {
      type: String,
      enum: ['EXCELLENT', 'VERY_GOOD', 'GOOD', 'SATISFACTORY', 'NEEDS_IMPROVEMENT'],
      default: 'EXCELLENT',
    },
    attendanceRate: { type: Number, default: 98 },
    nextTermBegins: { type: Date, default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.models.ReportRemark || mongoose.model('ReportRemark', ReportRemarkSchema);

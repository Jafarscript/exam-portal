import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['TEACHER', 'PARENT', 'STUDENT'], required: true },
    fullName: { type: String, required: true },
    // PENDING/APPROVED/REJECTED only meaningfully apply to PARENT.
    // STUDENT and TEACHER accounts are ACTIVE as soon as they're created.
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'ACTIVE'],
      default: 'ACTIVE',
    },
    phoneNumber: { type: String, default: '' },
    childrenNote: { type: String, default: '' },
    resetToken: { type: String, select: false },
    resetTokenExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model('User', UserSchema);

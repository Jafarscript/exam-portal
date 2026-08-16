/**
 * Creates (or updates) the single pre-provisioned teacher account.
 * Run with: npm run seed:teacher
 * Reads TEACHER_EMAIL / TEACHER_PASSWORD from .env.local — teacher
 * registration is intentionally not exposed via any public API route.
 */
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function run() {
  const { MONGODB_URI, TEACHER_EMAIL, TEACHER_PASSWORD } = process.env;
  if (!MONGODB_URI) throw new Error('MONGODB_URI is not set in .env.local');
  if (!TEACHER_EMAIL || !TEACHER_PASSWORD) throw new Error('TEACHER_EMAIL / TEACHER_PASSWORD are not set in .env.local');

  await mongoose.connect(MONGODB_URI);

  const UserSchema = new mongoose.Schema(
    {
      email: String, password: String, role: String, fullName: String, status: String,
    },
    { timestamps: true }
  );
  const User = mongoose.models.User || mongoose.model('User', UserSchema);

  const existing = await User.findOne({ role: 'TEACHER' });
  const hashed = await bcrypt.hash(TEACHER_PASSWORD, 10);

  if (existing) {
    existing.email = TEACHER_EMAIL.toLowerCase();
    existing.password = hashed;
    await existing.save();
    console.log(`Updated existing teacher account: ${TEACHER_EMAIL}`);
  } else {
    await User.create({
      email: TEACHER_EMAIL.toLowerCase(),
      password: hashed,
      role: 'TEACHER',
      fullName: 'Teacher',
      status: 'ACTIVE',
    });
    console.log(`Created teacher account: ${TEACHER_EMAIL}`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

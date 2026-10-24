import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';

dotenv.config();

const seedAdmin = async () => {
  const { MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!MONGO_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('MONGO_URI, ADMIN_EMAIL, and ADMIN_PASSWORD must be set in server/.env.');
  }

  await mongoose.connect(MONGO_URI);
  await User.init();
  const email = ADMIN_EMAIL.trim().toLowerCase();
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    if (existingUser.role !== 'admin') {
      existingUser.role = 'admin';
      await existingUser.save();
      console.log(`Promoted existing account to admin: ${email}`);
      return;
    }
    console.log(`Admin account already exists: ${email}`);
    return;
  }

  await User.create({
    name: 'Administrator',
    email,
    password: ADMIN_PASSWORD,
    role: 'admin',
  });
  console.log(`Created admin account: ${email}`);
};

seedAdmin()
  .catch((error) => {
    console.error(`Admin seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });

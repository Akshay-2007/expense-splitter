const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User schema for authentication and identity.
 * Passwords are automatically hashed before saving via a pre-save hook.
 */
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});


/**
 * Pre-save hook: hash the password with bcryptjs (12 salt rounds)
 * only when the password field has been modified.
 */
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/**
 * Compare an entered plain-text password against the stored hash.
 * @param {string} enteredPassword - The plain-text password to check.
 * @returns {Promise<boolean>} True if the passwords match.
 */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

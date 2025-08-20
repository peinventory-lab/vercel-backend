// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

/* ----------------------------- Mail transporter ----------------------------- */
async function makeTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  const test = await nodemailer.createTestAccount();
  console.warn('⚠️ Using Ethereal dev SMTP. Set real SMTP_* env vars for production.');
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: test.user, pass: test.pass },
  });
}

/* --------------------------------- Signup ---------------------------------- */
router.post('/signup', async (req, res) => {
  try {
    const { username, password, role, email } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const existingByUsername = await User.findOne({ username: username.trim() });
    if (existingByUsername) {
      return res.status(400).json({ message: 'Username already exists.' });
    }

    let normalizedEmail;
    if (email) {
      normalizedEmail = String(email).toLowerCase().trim();
      const existingByEmail = await User.findOne({ email: normalizedEmail });
      if (existingByEmail) {
        return res.status(400).json({ message: 'Email already exists.' });
      }
    }

    const hashed = await bcrypt.hash(password, 10);

    const userDoc = {
      username: username.trim(),
      password: hashed,
      role: role || 'stembassador',
    };
    if (normalizedEmail) userDoc.email = normalizedEmail;

    await User.create(userDoc);

    return res.status(201).json({ message: 'User created successfully.' });
  } catch (err) {
    console.error('Signup error:', err);
    return res.status(500).json({ message: 'Error signing up.' });
  }
});

/* ---------------------------------- Login ---------------------------------- */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    console.log('➡️ Login request body:', req.body);

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const looksLikeEmail = String(username).includes('@');
    const query = looksLikeEmail
      ? { email: String(username).toLowerCase().trim() }
      : { username: username.trim() };

    console.log('🔍 Login query:', query);
    const user = await User.findOne(query);
    console.log('👤 Found user:', user);

    if (!user) return res.status(400).json({ message: 'Invalid username or password.' });

    const ok = await bcrypt.compare(password, user.password);
    console.log('🔐 Password match:', ok);

    if (!ok) return res.status(400).json({ message: 'Invalid username or password.' });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '2h' });

    return res.json({
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Login error.' });
  }
});

/* ----------------------------- Forgot password ----------------------------- */
router.post('/forgot-password', async (req, res) => {
  try {
    const email = (req.body?.email || '').toLowerCase().trim();

    const safeOk = () =>
      res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });

    if (!email) return safeOk();

    const user = await User.findOne({ email });
    if (!user) return safeOk();

    const raw = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');

    user.resetPasswordToken = hash;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    const resetUrl = `${CLIENT_URL}/reset-password/${raw}`;

    try {
      const transporter = await makeTransporter();
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || 'no-reply@pe.local',
        to: email,
        subject: 'Reset your password',
        html: `
          <p>Hello ${user.username},</p>
          <p>Click the link below to reset your password (valid for 1 hour):</p>
          <p><a href="${resetUrl}" target="_blank">${resetUrl}</a></p>
          <p>If you did not request this, you can ignore this email.</p>
        `,
      });

      const preview = nodemailer.getTestMessageUrl(info);
      if (preview) console.log('✉️ Ethereal preview:', preview);
    } catch (mailErr) {
      console.error('Email send error:', mailErr.message);
    }

    console.log('🔗 Password reset link (dev log):', resetUrl);
    return safeOk();
  } catch (err) {
    console.error('forgot-password error:', err);
    return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });
  }
});

/* ------------------------------ Reset password ----------------------------- */
router.post('/reset-password/:token', async (req, res) => {
  try {
    const raw = req.params.token || req.body.token;
    const { password } = req.body || {};
    if (!raw || !password) {
      return res.status(400).json({ message: 'Token and new password are required.' });
    }

    const hash = crypto.createHash('sha256').update(raw).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hash,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({ message: 'Password has been reset. You can now log in.' });
  } catch (err) {
    console.error('reset-password error:', err);
    return res.status(500).json({ message: 'Server error updating password.' });
  }
});

module.exports = router;
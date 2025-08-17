// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

// Build a mail transporter: use your SMTP if provided, else Ethereal (dev)
async function makeTransporter() {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 4000,
      socketTimeout: 4000,
    });
    return transporter;
  }

  const test = await nodemailer.createTestAccount();
  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: test.user, pass: test.pass },
    connectionTimeout: 4000,
    socketTimeout: 4000,
  });
  return transporter;
}

// “Always OK” response (prevents email enumeration)
const safeOk = (res) =>
  res.status(200).json({ message: 'If that email exists, a reset link has been sent.' });

/* ------------------------------------------------------------------ */
/* Auth: Signup & Login                                               */
/* ------------------------------------------------------------------ */

// POST /api/auth/signup  body: { username, email, password, role? }
router.post('/signup', async (req, res) => {
  try {
    console.log('📩 Signup request body:', req.body);

    const { username, email, password, role } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required.' });
    }

    const existing = await User.findOne({
      $or: [{ username }, { email: (email || '').toLowerCase().trim() }],
    });
    if (existing) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    await new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
      role: role || 'stembassador',
    }).save();

    return res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    console.error('❌ Signup error:', err);
    return res.status(500).json({ message: 'Error signing up', error: err.message });
  }
});

// POST /api/auth/login  body: { username, password }
// (If you want to allow email login too, switch query to $or with email)
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    console.log('📩 Login attempt:', username);

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required.' });
    }

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ message: 'Invalid username or password' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: 'Invalid username or password' });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '2h' });

    return res.json({
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    return res.status(500).json({ message: 'Login error', error: err.message });
  }
});

/* ------------------------------------------------------------------ */
/* Forgot / Reset Password                                            */
/* ------------------------------------------------------------------ */

// POST /api/auth/forgot-password  body: { email }
router.post('/forgot-password', async (req, res) => {
  try {
    const email = (req.body?.email || '').toLowerCase().trim();
    console.log('📩 Forgot-password request for:', email || '(empty)');

    // If email missing, still return OK (no enumeration)
    if (!email) return safeOk(res);

    const user = await User.findOne({ email });
    if (!user) {
      console.warn('⚠️ No user for email:', email);
      return safeOk(res);
    }

    // Create raw token & store only its hash
    const raw = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(raw).digest('hex');

    user.resetPasswordToken = hash;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1h
    await user.save();

    const resetUrl = `${CLIENT_URL}/reset-password/${raw}`;
    console.log('🔗 Reset link:', resetUrl);

    // ✅ Return immediately so the browser never waits on SMTP
    safeOk(res);

    // Send the email in the background (no await)
    setImmediate(async () => {
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
          timeout: 5000,
        });

        const preview = nodemailer.getTestMessageUrl(info);
        if (preview) console.log('✉️ Ethereal preview:', preview);
      } catch (mailErr) {
        console.warn('⚠️ Email send error (ignored):', mailErr.message);
      }
    });
  } catch (err) {
    console.error('❌ forgot-password error:', err);
    return safeOk(res);
  }
});

// POST /api/auth/reset-password/:token  body: { password }
router.post('/reset-password/:token', async (req, res) => {
  try {
    const raw = req.params.token || req.body.token;
    const { password } = req.body || {};
    console.log('📩 Reset-password with token:', raw ? '[provided]' : '[missing]');

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

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.json({ message: 'Password has been reset. You can now log in.' });
  } catch (err) {
    console.error('❌ reset-password error:', err);
    return res.status(500).json({ message: 'Server error updating password.' });
  }
});

module.exports = router;
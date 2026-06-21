const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const auth    = require('../middleware/auth');
require('dotenv').config();

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const cookieOpts = {
  httpOnly: true,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production', // required for HTTPS in production
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, phone, rollNumber, department, year } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ success: false, message: 'Name, email and password are required.' });

  try {
    const exists = await User.findOne({ $or: [{ email }, { rollNumber }] });
    if (exists)
      return res.status(409).json({ success: false, message: 'Email or roll number already registered.' });

    const user  = await User.create({ name, email, password, phone, rollNumber, department, year });
    const token = signToken(user._id);

    res.cookie('token', token, cookieOpts);
    res.status(201).json({ success: true, message: 'Registered!', user });
  } catch (err) {
    console.error(err);
    if (err.name === 'ValidationError') {
      const message = Object.values(err.errors).map(val => val.message).join(', ');
      return res.status(400).json({ success: false, message });
    }
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Email or Roll Number already registered.' });
    }
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email and password required.' });

  try {
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    const token = signToken(user._id);
    res.cookie('token', token, cookieOpts);

    const safeUser = user.toJSON(); // password stripped by model
    res.json({ success: true, message: 'Login successful!', user: safeUser });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  res.json({ success: true, message: 'Logged out.' });
});

// GET /api/auth/me
router.get('/me', auth, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;

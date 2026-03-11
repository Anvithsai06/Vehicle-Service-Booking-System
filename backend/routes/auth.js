const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, role, email, password, contact, location } = req.body;

    // Validate required fields
    if (!name || !role || !email || !password || !contact || !location) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create user using create method directly (handles userId generation and password hashing)
    const user = await User.create({
      name,
      role,
      email,
      password,
      contact,
      location
    });

    const token = jwt.sign(
      { userId: user.userId, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        userId: user.userId,
        name: user.name,
        role: user.role,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.userId, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        userId: user.userId,
        name: user.name,
        role: user.role,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: {
        userId: req.user.userId,
        name: req.user.name,
        role: req.user.role,
        email: req.user.email,
        contact: req.user.contact,
        location: req.user.location
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
});

module.exports = router;


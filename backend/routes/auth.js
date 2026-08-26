const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { regNo, name, year, department, email, password } = req.body;

    if (!regNo || !name || !year || !department || !password) {
      return res.status(400).json({ error: 'Please fill in all required fields' });
    }

    // Check for duplicate regNo
    const existingUser = await User.findOne({ regNo });
    if (existingUser) {
      return res.status(400).json({ error: 'Registration number is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
      regNo,
      name,
      year,
      department,
      email: email || undefined,
      passwordHash
    });
    await user.save();

    // Sign JWT with regNo in payload
    const token = jwt.sign({ regNo: user.regNo }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({
      token,
      user: {
        regNo: user.regNo,
        name: user.name,
        year: user.year,
        department: user.department,
        email: user.email
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { regNo, password } = req.body;

    if (!regNo || !password) {
      return res.status(400).json({ error: 'Please provide both registration number and password' });
    }

    // Find user by regNo
    const user = await User.findOne({ regNo });
    if (!user) {
      return res.status(400).json({ error: 'Invalid registration number or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid registration number or password' });
    }

    // Sign JWT with regNo in payload
    const token = jwt.sign({ regNo: user.regNo }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        regNo: user.regNo,
        name: user.name,
        year: user.year,
        department: user.department,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

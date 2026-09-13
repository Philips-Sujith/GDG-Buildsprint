const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'smart-library-development-secret';

router.post('/register', async (req, res) => {
  try {
    const { regNo, name, year, department, email, password } = req.body;

    if (!regNo || !name || !year || !department || !password) {
      return res.status(400).json({
        error: 'Please fill in all required fields (Registration No, Name, Year, Department, Password)',
        message: 'Please fill in all required fields',
      });
    }

    const regNoClean = String(regNo).trim();
    const emailClean = email && String(email).trim() ? String(email).trim().toLowerCase() : undefined;

    // Check for duplicate regNo or email
    const duplicateQuery = [{ regNo: new RegExp(`^${regNoClean}$`, 'i') }];
    if (emailClean) {
      duplicateQuery.push({ email: emailClean });
    }

    const existingUser = await User.findOne({ $or: duplicateQuery });
    if (existingUser) {
      if (existingUser.regNo.toLowerCase() === regNoClean.toLowerCase()) {
        return res.status(400).json({
          error: 'Registration number is already registered. Please login.',
          message: 'Registration number is already registered. Please login.',
        });
      }
      if (emailClean && existingUser.email && existingUser.email.toLowerCase() === emailClean) {
        return res.status(400).json({
          error: 'Email address is already registered. Please login.',
          message: 'Email address is already registered. Please login.',
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
      regNo: regNoClean,
      name: String(name).trim(),
      year: Number(year),
      department: String(department).trim(),
      email: emailClean,
      passwordHash,
    });

    await user.save();

    // Sign JWT with regNo and role in payload
    const token = jwt.sign(
      { regNo: user.regNo, id: user._id, role: user.role || 'student' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        regNo: user.regNo,
        name: user.name,
        year: user.year,
        department: user.department,
        email: user.email,
        role: user.role || 'student',
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(400).json({
      error: error.message || 'Registration failed',
      message: error.message || 'Registration failed',
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { regNo, password } = req.body;

    if (!regNo || !password) {
      return res.status(400).json({
        error: 'Please provide both registration number and password',
        message: 'Please provide both registration number and password',
      });
    }

    const regNoClean = String(regNo).trim();

    // Find user by regNo (case-insensitive)
    const user = await User.findOne({ regNo: new RegExp(`^${regNoClean}$`, 'i') });
    if (!user) {
      return res.status(400).json({
        error: 'Invalid registration number or password',
        message: 'Invalid registration number or password',
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        error: 'Invalid registration number or password',
        message: 'Invalid registration number or password',
      });
    }

    // Sign JWT with regNo and role in payload
    const token = jwt.sign(
      { regNo: user.regNo, id: user._id, role: user.role || 'student' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        regNo: user.regNo,
        name: user.name,
        year: user.year,
        department: user.department,
        email: user.email,
        role: user.role || 'student',
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: error.message || 'Login failed',
      message: error.message || 'Login failed',
    });
  }
});

/**
 * GET /api/auth/mock-profiles
 * Returns the 15 mock student profiles for hackathon presentation / demo modal
 * plus admin demo account details
 */
router.get('/mock-profiles', async (req, res) => {
  try {
    const Borrow = require('../models/Borrow');
    const mockRegNos = Array.from({ length: 15 }, (_, i) => String(2025503570 + i));

    const users = await User.find({ regNo: { $in: mockRegNos } }).sort({ regNo: 1 }).lean();

    // Fetch borrows to calculate live unpaid fines
    const borrows = await Borrow.find({
      regNo: { $in: mockRegNos },
      returnedDate: null,
    }).lean();

    const borrowSummary = {};
    borrows.forEach((b) => {
      if (!borrowSummary[b.regNo]) {
        borrowSummary[b.regNo] = { count: 0, totalFine: 0 };
      }
      borrowSummary[b.regNo].count += 1;
      if (!b.isPaid) {
        borrowSummary[b.regNo].totalFine += Number(b.fineAmount) || 0;
      }
    });

    const profiles = users.map((u) => ({
      regNo: u.regNo,
      name: u.name,
      department: u.department,
      year: u.year,
      password: 'Demo@123',
      fineAmount: borrowSummary[u.regNo]?.totalFine || 0,
      booksCount: borrowSummary[u.regNo]?.count || 0,
    }));

    return res.json({
      success: true,
      count: profiles.length,
      profiles,
      adminDemo: {
        name: 'Arun Karthick',
        role: 'admin',
        regNo: 'ADMIN202501',
        password: 'Admin@123',
        department: 'Library Administration',
      },
    });
  } catch (error) {
    console.error('Error fetching mock profiles:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch mock profiles' });
  }
});

module.exports = router;

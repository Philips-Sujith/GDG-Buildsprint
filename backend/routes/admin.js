const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Book = require('../models/Book');
const Grievance = require('../models/Grievance');
const Payment = require('../models/Payment');
const Presence = require('../models/Presence');
const LibrarySetting = require('../models/LibrarySetting');

// Apply admin authorization to all admin routes
router.use(requireAdmin);

/**
 * Helper to normalize and categorize occupancy by floor/room
 */
const STANDARD_ZONES = [
  'First Floor',
  'Second Floor',
  'Reading Room',
  'Discussion Room',
  'Study Room',
  'Reference Room',
];

function categorizeFloor(floorName) {
  if (!floorName) return 'First Floor';
  const lower = floorName.toLowerCase();
  if (lower.includes('1st') || lower.includes('first')) return 'First Floor';
  if (lower.includes('2nd') || lower.includes('second')) return 'Second Floor';
  if (lower.includes('reading')) return 'Reading Room';
  if (lower.includes('discussion')) return 'Discussion Room';
  if (lower.includes('study')) return 'Study Room';
  if (lower.includes('reference')) return 'Reference Room';
  return floorName;
}

/**
 * GET /api/admin/overview
 * Library overview with total stats and detailed occupancy breakdown
 */
router.get('/overview', async (req, res) => {
  try {
    const [
      totalBooks,
      totalStudents,
      activePresences,
      totalGrievances,
      pendingGrievances,
      paymentsSummary,
    ] = await Promise.all([
      Book.countDocuments(),
      User.countDocuments({ role: { $ne: 'admin' } }),
      Presence.find({ isActive: true }).lean(),
      Grievance.countDocuments(),
      Grievance.countDocuments({
        status: { $in: ['pending', 'Submitted', 'Under Review'] },
      }),
      Payment.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    // Build zone counts
    const zoneCounts = {
      'First Floor': 0,
      'Second Floor': 0,
      'Reading Room': 0,
      'Discussion Room': 0,
      'Study Room': 0,
      'Reference Room': 0,
    };

    const countedAdminRegNos = new Set();

    activePresences.forEach((p) => {
      const regNoKey = p.regNo ? String(p.regNo).trim().toLowerCase() : null;
      if (!regNoKey || countedAdminRegNos.has(regNoKey)) {
        return;
      }
      countedAdminRegNos.add(regNoKey);

      const zone = categorizeFloor(p.floor);
      if (zoneCounts[zone] !== undefined) {
        zoneCounts[zone] += 1;
      } else {
        zoneCounts['First Floor'] += 1;
      }
    });

    // Fetch or initialize persistent base occupancy (Default: 38)
    let setting = await LibrarySetting.findOne({ key: 'occupancy' });
    const baseCount = setting && typeof setting.baseCount === 'number' ? setting.baseCount : 38;
    const roomBase = setting && setting.roomBaseCounts ? setting.roomBaseCounts : {
      'First Floor': 8,
      'Second Floor': 7,
      'Reading Room': 9,
      'Discussion Room': 4,
      'Study Room': 6,
      'Reference Room': 4,
    };

    const displayedZoneCounts = {};
    STANDARD_ZONES.forEach((zone) => {
      const base = typeof roomBase[zone] === 'number' ? roomBase[zone] : 0;
      displayedZoneCounts[zone] = base + (zoneCounts[zone] || 0);
    });

    const activeCheckIns = countedAdminRegNos.size;
    const totalLibraryOccupancy = baseCount + activeCheckIns;

    // Aggregate payments
    let paidAmount = 0;
    let totalTransactions = 0;
    paymentsSummary.forEach((p) => {
      totalTransactions += p.count;
      if (p._id === 'Paid') {
        paidAmount += p.totalAmount;
      }
    });

    return res.json({
      success: true,
      data: {
        stats: {
          totalBooks,
          totalStudents,
          totalActiveOccupancy: totalLibraryOccupancy,
          baseOccupancy: baseCount,
          activeCheckIns,
          totalGrievances,
          pendingGrievances,
          totalTransactions,
          totalPaidAmount: paidAmount,
        },
        occupancy: {
          baseCount,
          activeCheckIns,
          total: totalLibraryOccupancy,
          zones: STANDARD_ZONES.map((zone) => ({
            name: zone,
            count: displayedZoneCounts[zone] || 0,
          })),
        },
      },
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch overview' });
  }
});

/**
 * GET /api/admin/books
 * Paginated list of books with search and category filtering
 */
router.get('/books', async (req, res) => {
  try {
    const { search = '', category = '', page = 1, limit = 15 } = req.query;
    const query = {};

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { author: searchRegex },
        { subjectCode: searchRegex },
        { shelfLocation: searchRegex },
      ];
    }

    if (category && category.trim()) {
      query.category = new RegExp(`^${category.trim()}$`, 'i');
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
    const skip = (pageNum - 1) * limitNum;

    const [books, total] = await Promise.all([
      Book.find(query).sort({ title: 1 }).skip(skip).limit(limitNum).lean(),
      Book.countDocuments(query),
    ]);

    return res.json({
      success: true,
      books,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error('Admin books fetch error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch books' });
  }
});

/**
 * POST /api/admin/books
 * Add a new book with validation
 */
router.post('/books', async (req, res) => {
  try {
    const {
      title,
      author,
      subjectCode,
      category,
      totalQuantity,
      availableQuantity,
      shelfLocation,
    } = req.body;

    if (
      !title ||
      !author ||
      !subjectCode ||
      !category ||
      totalQuantity === undefined ||
      availableQuantity === undefined ||
      !shelfLocation
    ) {
      return res.status(400).json({
        success: false,
        error: 'All fields (Title, Author, Subject Code, Category, Total Quantity, Available Quantity, Shelf Location) are required.',
      });
    }

    const totalQty = parseInt(totalQuantity, 10);
    const availQty = parseInt(availableQuantity, 10);

    if (isNaN(totalQty) || totalQty < 0) {
      return res.status(400).json({
        success: false,
        error: 'Total quantity must be a non-negative number.',
      });
    }

    if (isNaN(availQty) || availQty < 0) {
      return res.status(400).json({
        success: false,
        error: 'Available quantity must be a non-negative number.',
      });
    }

    if (availQty > totalQty) {
      return res.status(400).json({
        success: false,
        error: 'Available quantity cannot exceed total quantity.',
      });
    }

    const book = new Book({
      title: String(title).trim(),
      author: String(author).trim(),
      subjectCode: String(subjectCode).trim().toUpperCase(),
      category: String(category).trim(),
      totalQuantity: totalQty,
      availableQuantity: availQty,
      shelfLocation: String(shelfLocation).trim(),
    });

    await book.save();

    return res.status(201).json({
      success: true,
      message: 'Book added successfully',
      book,
    });
  } catch (error) {
    console.error('Admin add book error:', error);
    return res.status(400).json({ success: false, error: error.message || 'Failed to add book' });
  }
});

/**
 * PUT /api/admin/books/:id
 * Edit an existing book
 */
router.put('/books/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      author,
      subjectCode,
      category,
      totalQuantity,
      availableQuantity,
      shelfLocation,
    } = req.body;

    const book = await Book.findById(id);
    if (!book) {
      return res.status(404).json({ success: false, error: 'Book not found' });
    }

    if (totalQuantity !== undefined) {
      const totalQty = parseInt(totalQuantity, 10);
      if (isNaN(totalQty) || totalQty < 0) {
        return res.status(400).json({
          success: false,
          error: 'Total quantity must be a non-negative number.',
        });
      }
      book.totalQuantity = totalQty;
    }

    if (availableQuantity !== undefined) {
      const availQty = parseInt(availableQuantity, 10);
      if (isNaN(availQty) || availQty < 0) {
        return res.status(400).json({
          success: false,
          error: 'Available quantity must be a non-negative number.',
        });
      }
      book.availableQuantity = availQty;
    }

    if (book.availableQuantity > book.totalQuantity) {
      return res.status(400).json({
        success: false,
        error: 'Available quantity cannot exceed total quantity.',
      });
    }

    if (title) book.title = String(title).trim();
    if (author) book.author = String(author).trim();
    if (subjectCode) book.subjectCode = String(subjectCode).trim().toUpperCase();
    if (category) book.category = String(category).trim();
    if (shelfLocation) book.shelfLocation = String(shelfLocation).trim();

    await book.save();

    return res.json({
      success: true,
      message: 'Book updated successfully',
      book,
    });
  } catch (error) {
    console.error('Admin update book error:', error);
    return res.status(400).json({ success: false, error: error.message || 'Failed to update book' });
  }
});

/**
 * GET /api/admin/grievances
 * List all grievances with student details and photos
 */
router.get('/grievances', async (req, res) => {
  try {
    const grievances = await Grievance.find().sort({ submittedDate: -1 }).lean();

    // Map student names
    const regNos = [...new Set(grievances.map((g) => g.regNo))];
    const users = await User.find({ regNo: { $in: regNos } }).select('regNo name department').lean();
    const userMap = {};
    users.forEach((u) => {
      userMap[u.regNo] = u;
    });

    const enrichedGrievances = grievances.map((g) => ({
      _id: g._id,
      regNo: g.regNo,
      studentName: userMap[g.regNo]?.name || 'Student (' + g.regNo + ')',
      department: userMap[g.regNo]?.department || 'General',
      bookName: g.bookName,
      coverPhotoUrl: g.coverPhotoUrl || g.coverPhoto || g.coverUrl || '',
      reasonPhotoUrl: g.reasonPhotoUrl || g.damagePhotoUrl || g.reasonPhoto || g.damageEvidenceUrl || '',
      reasonText: g.reasonText || '',
      shelfCode: g.shelfCode || 'N/A',
      status: g.status === 'pending' ? 'Submitted' : g.status || 'Submitted',
      submittedDate: g.submittedDate || g.createdAt || new Date(),
    }));

    return res.json({
      success: true,
      grievances: enrichedGrievances,
    });
  } catch (error) {
    console.error('Admin fetch grievances error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch grievances' });
  }
});

/**
 * PUT /api/admin/grievances/:id/status
 * Update grievance status (Submitted, Under Review, Resolved, Rejected)
 */
router.put('/grievances/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ['Submitted', 'Under Review', 'Resolved', 'Rejected', 'pending'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Status must be one of: Submitted, Under Review, Resolved, Rejected`,
      });
    }

    const normalizedStatus = status === 'pending' ? 'Submitted' : status;
    const grievance = await Grievance.findByIdAndUpdate(
      id,
      { status: normalizedStatus },
      { new: true }
    );

    if (!grievance) {
      return res.status(404).json({ success: false, error: 'Grievance not found' });
    }

    return res.json({
      success: true,
      message: `Grievance status updated to ${normalizedStatus}`,
      grievance,
    });
  } catch (error) {
    console.error('Admin update grievance error:', error);
    return res.status(400).json({ success: false, error: error.message || 'Failed to update grievance' });
  }
});

/**
 * GET /api/admin/payments
 * Read-only monitoring of Razorpay payment transactions
 */
router.get('/payments', async (req, res) => {
  try {
    const { search = '', status = '', page = 1, limit = 15 } = req.query;
    const query = {};

    if (search && search.trim()) {
      query.regNo = new RegExp(search.trim(), 'i');
    }

    if (status && status.trim() && status !== 'All') {
      query.status = status.trim();
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 15));
    const skip = (pageNum - 1) * limitNum;

    const [payments, total, statusAgg] = await Promise.all([
      Payment.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Payment.countDocuments(query),
      Payment.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    // Attach student names where available
    const regNos = [...new Set(payments.map((p) => p.regNo))];
    const users = await User.find({ regNo: { $in: regNos } }).select('regNo name department').lean();
    const userMap = {};
    users.forEach((u) => {
      userMap[u.regNo] = u;
    });

    const enrichedPayments = payments.map((p) => ({
      ...p,
      studentName: userMap[p.regNo]?.name || p.regNo,
      department: userMap[p.regNo]?.department || 'General',
    }));

    const summary = {
      totalTransactions: 0,
      totalPaidAmount: 0,
      countsByStatus: {
        Created: 0,
        Paid: 0,
        Failed: 0,
        Cancelled: 0,
      },
    };

    statusAgg.forEach((s) => {
      summary.totalTransactions += s.count;
      if (summary.countsByStatus[s._id] !== undefined) {
        summary.countsByStatus[s._id] = s.count;
      }
      if (s._id === 'Paid') {
        summary.totalPaidAmount += s.totalAmount;
      }
    });

    return res.json({
      success: true,
      payments: enrichedPayments,
      summary,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error('Admin payments fetch error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to fetch payments' });
  }
});

/**
 * POST /api/admin/library/reset
 * Safely reset current library occupancy by deactivating active presence records
 */
router.post('/library/reset', async (req, res) => {
  try {
    const result = await Presence.updateMany(
      { isActive: true },
      { $set: { isActive: false, pendingPing: false } }
    );

    let setting = await LibrarySetting.findOne({ key: 'occupancy' });
    const baseCount = setting && typeof setting.baseCount === 'number' ? setting.baseCount : 38;

    return res.json({
      success: true,
      message: `Active student check-ins deactivated (${result.modifiedCount}). Total occupancy returned to baseline ${baseCount}.`,
      deactivatedCount: result.modifiedCount,
      baseCount,
      total: baseCount,
    });
  } catch (error) {
    console.error('Admin library occupancy reset error:', error);
    return res.status(500).json({ success: false, error: error.message || 'Failed to reset library occupancy' });
  }
});

module.exports = router;

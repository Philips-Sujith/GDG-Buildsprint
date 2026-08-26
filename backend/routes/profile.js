const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Borrow = require("../models/Borrow");

// GET /api/profile/:regNo
router.get("/:regNo", async (req, res) => {
  try {
    const { regNo } = req.params;

    // 1. Fetch user details if User collection exists, else construct default student object
    let studentDetails = {
      name: `Student (${regNo})`,
      regNo: regNo,
      year: "3rd Year",
      department: "Computer Science & Engineering",
      email: `${regNo.toLowerCase()}@student.library.edu`,
    };

    try {
      if (mongoose.models.User || mongoose.connection.collections["users"]) {
        const UserCollection = mongoose.connection.collection("users");
        const userDoc = await UserCollection.findOne({ regNo });
        if (userDoc) {
          studentDetails = {
            name: userDoc.name || studentDetails.name,
            regNo: userDoc.regNo || regNo,
            year: userDoc.year || studentDetails.year,
            department: userDoc.department || studentDetails.department,
            email: userDoc.email || studentDetails.email,
          };
        }
      }
    } catch (e) {
      console.log("User lookup fallback used:", e.message);
    }

    // 2. Fetch active borrowed books (isPaid false or returnedDate null)
    const borrows = await Borrow.find({
      regNo,
      $or: [
        { isPaid: false },
        { isPaid: { $exists: false } },
        { returnedDate: null },
      ],
    }).lean();

    // 3. Join with Book titles if available
    let booksMap = {};
    try {
      if (mongoose.connection.collections["books"]) {
        const bookIds = borrows.map((b) => b.bookId);
        const bookDocs = await mongoose.connection
          .collection("books")
          .find({
            $or: [{ bookId: { $in: bookIds } }, { _id: { $in: bookIds } }],
          })
          .toArray();

        bookDocs.forEach((bk) => {
          const idStr = bk.bookId || String(bk._id);
          booksMap[idStr] = bk.title;
        });
      }
    } catch (e) {
      console.log("Book lookup fallback used:", e.message);
    }

    let totalDue = 0;
    const borrowedBooks = borrows.map((item) => {
      const fine = Number(item.fineAmount) || 0;
      totalDue += fine;
      return {
        _id: item._id,
        bookId: item.bookId,
        title: booksMap[item.bookId] || item.title || `Book #${item.bookId}`,
        borrowDate: item.borrowDate,
        dueDate: item.dueDate,
        fineAmount: fine,
        isPaid: item.isPaid || false,
      };
    });

    return res.json({
      ...studentDetails,
      borrowedBooks,
      totalDue,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch student profile" });
  }
});

module.exports = router;

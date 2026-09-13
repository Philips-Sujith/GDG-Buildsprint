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
      email: `${regNo.toLowerCase()}@smartlibrary.demo`,
    };

    try {
      if (mongoose.models.User || mongoose.connection.collections["users"]) {
        const UserCollection = mongoose.connection.collection("users");
        const userDoc = await UserCollection.findOne({
          regNo: { $regex: new RegExp(`^${regNo}$`, "i") },
        });
        if (userDoc) {
          studentDetails = {
            name: userDoc.name || studentDetails.name,
            regNo: userDoc.regNo || regNo,
            year: userDoc.year ? `${userDoc.year}${userDoc.year === 1 ? 'st' : userDoc.year === 2 ? 'nd' : userDoc.year === 3 ? 'rd' : 'th'} Year` : studentDetails.year,
            department: userDoc.department || studentDetails.department,
            email: userDoc.email || studentDetails.email,
          };
        }
      }
    } catch (e) {
      console.log("User lookup fallback used:", e.message);
    }

    // 2. Fetch active borrowed books (where returnedDate is null)
    const borrows = await Borrow.find({
      regNo: { $regex: new RegExp(`^${regNo}$`, "i") },
      returnedDate: null,
    }).lean();

    // 3. Join with Book titles if available
    let booksMap = {};
    try {
      if (mongoose.connection.collections["books"]) {
        const bookIds = borrows.map((b) => b.bookId);
        const validObjectIds = bookIds
          .filter((id) => mongoose.Types.ObjectId.isValid(id))
          .map((id) => new mongoose.Types.ObjectId(id));
        const orConditions = [{ bookId: { $in: bookIds } }];
        if (validObjectIds.length > 0) {
          orConditions.push({ _id: { $in: validObjectIds } });
        }
        const bookDocs = await mongoose.connection
          .collection("books")
          .find({ $or: orConditions })
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
      const isPaid = item.isPaid === true;
      const fine = isPaid ? 0 : (Number(item.fineAmount) || 0);
      totalDue += fine;
      return {
        _id: item._id,
        bookId: item.bookId,
        title: item.title || booksMap[item.bookId] || `Book #${item.bookId}`,
        borrowDate: item.borrowDate,
        dueDate: item.dueDate,
        fineAmount: fine,
        isPaid: isPaid,
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

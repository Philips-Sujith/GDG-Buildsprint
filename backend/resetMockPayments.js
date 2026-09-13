const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

require("dotenv").config();
const mongoose = require("mongoose");
const Borrow = require("./models/Borrow");
const Book = require("./models/Book");
const { MOCK_STUDENTS } = require("./seedMockProfiles");

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌ MONGO_URI is missing in environment.");
  process.exit(1);
}

/**
 * Resets payment and fine states ONLY for the 15 designated mock student accounts.
 * - Idempotent
 * - Preserves existing Payment collection audit logs
 * - Restores Borrow.fineAmount, isPaid: false, paidDate: null to baseline seed data
 * - Never modifies real students or admin accounts
 */
async function resetMockPayments(isStandalone = false) {
  try {
    if (mongoose.connection.readyState !== 1) {
      if (!MONGO_URI) {
        throw new Error("MONGO_URI is missing in environment.");
      }
      await mongoose.connect(MONGO_URI);
      console.log("Connected to MongoDB for mock payment reset...\n");
    }

    const DAY_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();

    // Cache books for fallback restoration if borrow records were missing
    const allBooks = await Book.find({}).lean();
    const booksBySubject = {};
    allBooks.forEach((b) => {
      if (b.subjectCode) booksBySubject[b.subjectCode] = b;
    });

    let profilesProcessed = 0;
    let profilesWithFines = 0;
    let totalFineAmount = 0;
    const summaryLines = [];

    for (const student of MOCK_STUDENTS) {
      profilesProcessed += 1;
      const regNo = student.regNo;

      // Find existing borrows for this mock student only
      let existingBorrows = await Borrow.find({ regNo }).sort({ borrowDate: 1 });

      if (existingBorrows.length === student.booksConfig.length) {
        // In-place restoration: preserve exact book, borrowDate, dueDate
        for (let i = 0; i < student.booksConfig.length; i++) {
          const bConfig = student.booksConfig[i];
          const bDoc = existingBorrows[i];

          if (bConfig.isPaid || bConfig.returnedDateDaysAgo) {
            bDoc.fineAmount = 0;
            bDoc.isPaid = true;
            if (!bDoc.paidDate) bDoc.paidDate = new Date(now - 1 * DAY_MS);
          } else {
            bDoc.fineAmount = bConfig.fineAmount;
            bDoc.isPaid = false;
            bDoc.paidDate = null;
          }
          await bDoc.save();
        }
      } else {
        // Fallback: safely recreate exact seed borrow records for this mock student
        await Borrow.deleteMany({ regNo });
        const newDocs = [];
        for (const bConfig of student.booksConfig) {
          const bookDoc = booksBySubject[bConfig.subjectCode] || allBooks[0];
          newDocs.push({
            regNo,
            bookId: bookDoc ? String(bookDoc._id) : "66f000000000000000000001",
            title: bookDoc ? bookDoc.title : "Sample Technical Book",
            borrowDate: new Date(now - bConfig.daysAgo * DAY_MS),
            dueDate: new Date(now + bConfig.dueDaysAhead * DAY_MS),
            fineAmount: bConfig.fineAmount,
            isPaid: Boolean(bConfig.isPaid),
            returnedDate: bConfig.returnedDateDaysAgo
              ? new Date(now - bConfig.returnedDateDaysAgo * DAY_MS)
              : null,
            paidDate: bConfig.isPaid ? new Date(now - 1 * DAY_MS) : null,
          });
        }
        if (newDocs.length > 0) {
          await Borrow.insertMany(newDocs);
        }
      }

      // Calculate restored fine for this mock student
      const unpaidBorrows = await Borrow.find({ regNo, isPaid: false, returnedDate: null });
      const studentTotalFine = unpaidBorrows.reduce(
        (sum, b) => sum + (Number(b.fineAmount) || 0),
        0
      );

      if (studentTotalFine > 0) {
        profilesWithFines += 1;
        totalFineAmount += studentTotalFine;
        summaryLines.push(
          `${regNo}  ₹${String(studentTotalFine).padEnd(4)} UNPAID`
        );
      } else {
        summaryLines.push(
          `${regNo}  ₹0    NO FINE`
        );
      }
    }

    // Output formatted report
    console.log("========================================");
    console.log("MOCK PAYMENT RESET");
    console.log("========================================");
    console.log(`Mock profiles processed: ${profilesProcessed}`);
    console.log(`Profiles with outstanding demo fines restored: ${profilesWithFines}`);
    console.log(`Total demo fine restored: ₹${totalFineAmount}\n`);

    summaryLines.forEach((line) => console.log(line));

    console.log("\nMock payment state successfully reset.");
    console.log("========================================\n");

    if (isStandalone) {
      await mongoose.disconnect();
      process.exit(0);
    }

    return {
      success: true,
      message: `Mock payment state successfully reset for ${profilesProcessed} demo profiles (${profilesWithFines} with restored fines).`,
      profilesProcessed,
      profilesWithFines,
      totalFineRestored: totalFineAmount,
      summary: summaryLines,
    };
  } catch (error) {
    console.error("❌ Error resetting mock payments:", error);
    if (isStandalone) {
      process.exit(1);
    }
    throw error;
  }
}

if (require.main === module) {
  resetMockPayments(true);
}

module.exports = {
  resetMockPayments,
};

const cron = require("node-cron");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const Borrow = require("../models/Borrow");
const Notification = require("../models/Notification");

// Setup Nodemailer transporter with env vars or test account fallback
const createTransporter = async () => {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback to test SMTP / console simulation logger
  return {
    sendMail: async (options) => {
      console.log(`[Email Simulation Sent] To: ${options.to} | Subject: ${options.subject} | Body: ${options.html || options.text}`);
      return { messageId: `sim_${Date.now()}` };
    },
  };
};

const checkDueDates = async () => {
  try {
    const now = new Date();
    const dayAfterTomorrow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Find Borrow documents where dueDate is within the next 24-48 hours and isPaid/returnedDate isn't set
    const upcomingDueBorrows = await Borrow.find({
      $or: [{ isPaid: false }, { isPaid: { $exists: false } }],
      returnedDate: null,
      dueDate: { $gte: now, $lte: dayAfterTomorrow },
    }).lean();

    if (upcomingDueBorrows.length === 0) {
      return;
    }

    const transporter = await createTransporter();

    for (const borrow of upcomingDueBorrows) {
      let bookTitle = borrow.title || `Book #${borrow.bookId}`;
      try {
        if (mongoose.connection.collections["books"]) {
          const bookDoc = await mongoose.connection.collection("books").findOne({
            $or: [{ bookId: borrow.bookId }, { _id: borrow.bookId }],
          });
          if (bookDoc && bookDoc.title) {
            bookTitle = bookDoc.title;
          }
        }
      } catch (e) {
        // use fallback
      }

      const message = `Your book '${bookTitle}' is due tomorrow. Please return or renew it to avoid fines.`;

      // 1. Check if unread notification with identical message already exists to avoid duplicates
      const existingNotif = await Notification.findOne({
        regNo: borrow.regNo,
        message: message,
        isRead: false,
      });

      if (!existingNotif) {
        await Notification.create({
          regNo: borrow.regNo,
          message: message,
          type: "due-alert",
          isRead: false,
        });

        // 2. Send email via Nodemailer
        const recipientEmail = `${borrow.regNo.toLowerCase()}@student.library.edu`;
        try {
          await transporter.sendMail({
            from: process.env.SMTP_FROM || '"Smart Library Platform" <no-reply@library.edu>',
            to: recipientEmail,
            subject: `Library Due Date Alert: '${bookTitle}' is due tomorrow`,
            text: message,
            html: `<p>Dear Student (${borrow.regNo}),</p><p>Your borrowed book <strong>"${bookTitle}"</strong> is due tomorrow.</p><p>Please return or pay any due amounts promptly.</p>`,
          });
        } catch (emailErr) {
          console.error(`[dueDateChecker] Failed to send email to ${recipientEmail}:`, emailErr.message);
        }
      }
    }
  } catch (error) {
    console.error("[dueDateChecker] Error running due date checker job:", error);
  }
};

// Scheduled cron job: Run every 6 hours
cron.schedule("0 */6 * * *", () => {
  checkDueDates();
});

// Run check on startup once
setTimeout(() => {
  checkDueDates();
}, 5000);

module.exports = { checkDueDates };

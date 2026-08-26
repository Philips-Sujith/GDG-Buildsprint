const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const User = require("./models/User");
const Borrow = require("./models/Borrow");
const Presence = require("./models/Presence");
const Notification = require("./models/Notification");

const seedDemoUsers = [
  {
    name: "Arjun Nair",
    regNo: "2025503560",
    email: "arjun.nair@smartlibrary.demo",
    password: "Arjun@123",
    year: 3,
    department: "Computer Science & Engineering",
    books: [],
  },
  {
    name: "Rahul Menon",
    regNo: "2025503561",
    email: "rahul.menon@smartlibrary.demo",
    password: "Rahul@123",
    year: 3,
    department: "Computer Science & Engineering",
    books: [
      { title: "Computer Networks", bookId: "CS_NET_301", fineAmount: 40, daysAgo: 14, dueDaysAgo: 4 },
      { title: "Operating System Concepts", bookId: "CS_OS_202", fineAmount: 50, daysAgo: 20, dueDaysAgo: 5 },
      { title: "Database Management Systems", bookId: "CS_DBMS_203", fineAmount: 30, daysAgo: 12, dueDaysAgo: 3 },
    ],
  },
  {
    name: "Aditya Sharma",
    regNo: "2025503562",
    email: "aditya.sharma@smartlibrary.demo",
    password: "Aditya@123",
    year: 4,
    department: "Computer Science & Engineering",
    books: [
      { title: "Data Structures & Algorithms", bookId: "CS_DSA_101", fineAmount: 100, daysAgo: 25, dueDaysAgo: 10 },
      { title: "Computer Architecture", bookId: "CS_ARCH_204", fineAmount: 80, daysAgo: 22, dueDaysAgo: 8 },
      { title: "Operating Systems", bookId: "CS_OS_305", fineAmount: 70, daysAgo: 18, dueDaysAgo: 7 },
      { title: "Machine Learning Fundamentals", bookId: "AI_ML_401", fineAmount: 100, daysAgo: 30, dueDaysAgo: 10 },
    ],
  },
  {
    name: "Ananya Iyer",
    regNo: "2025503563",
    email: "ananya.iyer@smartlibrary.demo",
    password: "Ananya@123",
    year: 2,
    department: "Electronics & Communication",
    books: [
      { title: "Engineering Mathematics", bookId: "MATH_201", fineAmount: 35, daysAgo: 15, dueDaysAgo: 3 },
      { title: "Object Oriented Programming", bookId: "CS_OOP_205", fineAmount: 40, daysAgo: 16, dueDaysAgo: 4 },
    ],
  },
  {
    name: "Rohan Krishnan",
    regNo: "2025503564",
    email: "rohan.krishnan@smartlibrary.demo",
    password: "Rohan@123",
    year: 3,
    department: "Information Technology",
    books: [
      { title: "Artificial Intelligence", bookId: "AI_CORE_301", fineAmount: 150, daysAgo: 35, dueDaysAgo: 15 },
      { title: "Computer Networks", bookId: "IT_NET_302", fineAmount: 100, daysAgo: 25, dueDaysAgo: 10 },
      { title: "Operating Systems", bookId: "IT_OS_303", fineAmount: 100, daysAgo: 28, dueDaysAgo: 10 },
      { title: "Database Management Systems", bookId: "IT_DBMS_304", fineAmount: 150, daysAgo: 32, dueDaysAgo: 15 },
      { title: "Software Engineering", bookId: "IT_SE_305", fineAmount: 100, daysAgo: 20, dueDaysAgo: 10 },
    ],
  },
  {
    name: "Priya Menon",
    regNo: "2025503565",
    email: "priya.menon@smartlibrary.demo",
    password: "Priya@123",
    year: 4,
    department: "Computer Science & Engineering",
    books: [
      { title: "Engineering Mathematics", bookId: "MATH_401", fineAmount: 250, daysAgo: 45, dueDaysAgo: 25 },
    ],
  },
];

const seedData = async () => {
  try {
    console.log("Connecting to MongoDB for demo seeding...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully.");

    const now = Date.now();

    for (const demoUser of seedDemoUsers) {
      console.log(`\n--- Seeding user: ${demoUser.name} (${demoUser.regNo}) ---`);

      // 1. Create or Update User with hashed password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(demoUser.password, salt);

      await User.findOneAndUpdate(
        { regNo: demoUser.regNo },
        {
          name: demoUser.name,
          regNo: demoUser.regNo,
          email: demoUser.email,
          year: demoUser.year,
          department: demoUser.department,
          passwordHash,
        },
        { upsert: true, returnDocument: 'after' }
      );
      console.log(`• User account created/updated.`);

      // 2. Clear old Borrows and seed realistic Borrow records
      await Borrow.deleteMany({ regNo: demoUser.regNo });

      if (demoUser.books.length > 0) {
        const borrowDocs = demoUser.books.map((b) => ({
          regNo: demoUser.regNo,
          bookId: b.bookId,
          title: b.title,
          borrowDate: new Date(now - b.daysAgo * 24 * 60 * 60 * 1000),
          dueDate: new Date(now - b.dueDaysAgo * 24 * 60 * 60 * 1000),
          fineAmount: b.fineAmount,
          isPaid: false,
          returnedDate: null,
        }));
        await Borrow.insertMany(borrowDocs);
        const totalFine = demoUser.books.reduce((sum, b) => sum + b.fineAmount, 0);
        console.log(`• Seeded ${demoUser.books.length} borrowed book(s). Total Fine: ₹${totalFine}`);
      } else {
        console.log(`• 0 borrowed books. Fine: ₹0`);
      }

      // 3. Reset Presence initially to NOT checked-in (clean initial state)
      await Presence.deleteMany({ regNo: demoUser.regNo });
      await Presence.create({
        regNo: demoUser.regNo,
        floor: "First Floor",
        checkinTime: null,
        lastPingAt: null,
        isActive: false,
        pendingPing: false,
      });

      // 4. Clear old notifications
      await Notification.deleteMany({ regNo: demoUser.regNo });
    }

    console.log("\n=======================================================");
    console.log("   ALL 6 DEMO STUDENT ACCOUNTS SEEDED SUCCESSFULLY!    ");
    console.log("=======================================================\n");

    console.log("DEMO LOGIN CREDENTIALS:");
    seedDemoUsers.forEach((u) => {
      const totalFine = u.books.reduce((sum, b) => sum + b.fineAmount, 0);
      console.log(`- ${u.name.padEnd(20)} | RegNo: ${u.regNo} | Password: ${u.password.padEnd(10)} | Books: ${u.books.length} | Fine: ₹${totalFine}`);
    });
    console.log("\n");

    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err);
    process.exit(1);
  }
};

seedData();

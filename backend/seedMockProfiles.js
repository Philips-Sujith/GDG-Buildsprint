const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });

const User = require("./models/User");
const Borrow = require("./models/Borrow");
const Book = require("./models/Book");
const Group = require("./models/Group");
const Material = require("./models/Material");
const Presence = require("./models/Presence");
const Notification = require("./models/Notification");
const LibrarySetting = require("./models/LibrarySetting");

// Common demo password for all 15 accounts
const DEMO_PASSWORD = "Demo@123";

/**
 * 15 Distinct Indian Students with realistic departments and academic years
 */
const MOCK_STUDENTS = [
  {
    regNo: "2025503570",
    name: "Aarav Sharma",
    year: 3,
    department: "Computer Science & Engineering",
    email: "aarav.sharma@smartlibrary.demo",
    floor: "First Floor",
    // Account A: ₹0 fine, 1 book on schedule
    booksConfig: [
      { subjectCode: "CS23302", fineAmount: 0, daysAgo: 5, dueDaysAhead: 16, isPaid: false },
    ],
  },
  {
    regNo: "2025503571",
    name: "Kavin Raj",
    year: 2,
    department: "Information Technology",
    email: "kavin.raj@smartlibrary.demo",
    floor: "Reading Room",
    // Account B: ₹50 unpaid fine, 2 books (1 overdue with ₹50, 1 on schedule)
    booksConfig: [
      { subjectCode: "CS23101", fineAmount: 50, daysAgo: 19, dueDaysAhead: -5, isPaid: false },
      { subjectCode: "CS23204", fineAmount: 0, daysAgo: 4, dueDaysAhead: 17, isPaid: false },
    ],
  },
  {
    regNo: "2025503572",
    name: "Nithya Krishnan",
    year: 4,
    department: "Computer Science & Engineering",
    email: "nithya.krishnan@smartlibrary.demo",
    floor: "Discussion Room",
    // Student 3: ₹75 unpaid fine
    booksConfig: [
      { subjectCode: "CS23405", fineAmount: 75, daysAgo: 22, dueDaysAhead: -8, isPaid: false },
      { subjectCode: "CS23502", fineAmount: 0, daysAgo: 6, dueDaysAhead: 15, isPaid: false },
    ],
  },
  {
    regNo: "2025503573",
    name: "Aditya Menon",
    year: 3,
    department: "Electronics & Communication Engineering",
    email: "aditya.menon@smartlibrary.demo",
    floor: "Second Floor",
    // Student 4: ₹100 unpaid fine
    booksConfig: [
      { subjectCode: "CS23302", fineAmount: 100, daysAgo: 24, dueDaysAhead: -10, isPaid: false },
    ],
  },
  {
    regNo: "2025503574",
    name: "Meera Nair",
    year: 1,
    department: "Electrical & Electronics Engineering",
    email: "meera.nair@smartlibrary.demo",
    floor: null, // not checked in
    // Student 5: ₹20 unpaid fine
    booksConfig: [
      { subjectCode: "CS23101", fineAmount: 20, daysAgo: 16, dueDaysAhead: -2, isPaid: false },
    ],
  },
  {
    regNo: "2025503575",
    name: "Arjun Kumar",
    year: 2,
    department: "Mechanical Engineering",
    email: "arjun.kumar@smartlibrary.demo",
    floor: "Study Room",
    // Account C: ₹120 unpaid fine, multiple books (ideal Razorpay demonstration)
    booksConfig: [
      { subjectCode: "CS23204", fineAmount: 70, daysAgo: 21, dueDaysAhead: -7, isPaid: false },
      { subjectCode: "CS23405", fineAmount: 50, daysAgo: 19, dueDaysAhead: -5, isPaid: false },
      { subjectCode: "CS23101", fineAmount: 0, daysAgo: 3, dueDaysAhead: 18, isPaid: false },
    ],
  },
  {
    regNo: "2025503576",
    name: "Divya Varma",
    year: 3,
    department: "Computer Science & Engineering",
    email: "divya.varma@smartlibrary.demo",
    floor: "Reading Room",
    // Student 7: ₹150 unpaid fine
    booksConfig: [
      { subjectCode: "CS23502", fineAmount: 150, daysAgo: 29, dueDaysAhead: -15, isPaid: false },
    ],
  },
  {
    regNo: "2025503577",
    name: "Siddharth Balaji",
    year: 4,
    department: "Information Technology",
    email: "siddharth.balaji@smartlibrary.demo",
    floor: "Reference Room",
    // Student 8: ₹200 unpaid fine
    booksConfig: [
      { subjectCode: "CS23302", fineAmount: 120, daysAgo: 26, dueDaysAhead: -12, isPaid: false },
      { subjectCode: "CS23204", fineAmount: 80, daysAgo: 22, dueDaysAhead: -8, isPaid: false },
    ],
  },
  {
    regNo: "2025503578",
    name: "Pooja Sundaram",
    year: 2,
    department: "Civil Engineering",
    email: "pooja.sundaram@smartlibrary.demo",
    floor: null,
    // Account D: ₹250 unpaid fine, multiple overdue books
    booksConfig: [
      { subjectCode: "CS23101", fineAmount: 150, daysAgo: 29, dueDaysAhead: -15, isPaid: false },
      { subjectCode: "CS23405", fineAmount: 100, daysAgo: 24, dueDaysAhead: -10, isPaid: false },
    ],
  },
  {
    regNo: "2025503579",
    name: "Varun Venkatesh",
    year: 3,
    department: "Electronics & Communication Engineering",
    email: "varun.venkatesh@smartlibrary.demo",
    floor: "First Floor",
    // Account E: ₹0 fine, member of multiple study groups, 1 returned/fine paid, 1 on schedule
    booksConfig: [
      { subjectCode: "CS23502", fineAmount: 0, daysAgo: 5, dueDaysAhead: 16, isPaid: false },
      { subjectCode: "CS23302", fineAmount: 0, daysAgo: 30, dueDaysAhead: -10, isPaid: true, returnedDateDaysAgo: 1 },
    ],
  },
  {
    regNo: "2025503580",
    name: "Shreya Rangarajan",
    year: 1,
    department: "Computer Science & Engineering",
    email: "shreya.rangarajan@smartlibrary.demo",
    floor: "Reading Room",
    // Student 11: ₹30 unpaid fine
    booksConfig: [
      { subjectCode: "CS23101", fineAmount: 30, daysAgo: 17, dueDaysAhead: -3, isPaid: false },
      { subjectCode: "CS23204", fineAmount: 0, daysAgo: 2, dueDaysAhead: 19, isPaid: false },
    ],
  },
  {
    regNo: "2025503581",
    name: "Pranav Chandran",
    year: 4,
    department: "Mechanical Engineering",
    email: "pranav.chandran@smartlibrary.demo",
    floor: null,
    // Student 12: ₹180 unpaid fine
    booksConfig: [
      { subjectCode: "CS23405", fineAmount: 180, daysAgo: 32, dueDaysAhead: -18, isPaid: false },
    ],
  },
  {
    regNo: "2025503582",
    name: "Ananya Natarajan",
    year: 2,
    department: "Information Technology",
    email: "ananya.natarajan@smartlibrary.demo",
    floor: "Second Floor",
    // Account F: ₹80 unpaid fine + owns a study group
    booksConfig: [
      { subjectCode: "CS23302", fineAmount: 80, daysAgo: 22, dueDaysAhead: -8, isPaid: false },
    ],
  },
  {
    regNo: "2025503583",
    name: "Harish Raghavan",
    year: 3,
    department: "Electrical & Electronics Engineering",
    email: "harish.raghavan@smartlibrary.demo",
    floor: "Discussion Room",
    // Student 14: ₹300 fine (large fine demonstration)
    booksConfig: [
      { subjectCode: "CS23101", fineAmount: 150, daysAgo: 29, dueDaysAhead: -15, isPaid: false },
      { subjectCode: "CS23502", fineAmount: 150, daysAgo: 29, dueDaysAhead: -15, isPaid: false },
    ],
  },
  {
    regNo: "2025503584",
    name: "Rithika Subramanian",
    year: 4,
    department: "Computer Science & Engineering",
    email: "rithika.subramanian@smartlibrary.demo",
    floor: "Study Room",
    // Student 15: ₹0 fine, 2 books on schedule
    booksConfig: [
      { subjectCode: "CS23204", fineAmount: 0, daysAgo: 4, dueDaysAhead: 17, isPaid: false },
      { subjectCode: "CS23405", fineAmount: 0, daysAgo: 2, dueDaysAhead: 19, isPaid: false },
    ],
  },
];

/**
 * 6 Realistic Study Groups spanning across the 15 mock students
 */
const MOCK_GROUPS = [
  {
    name: "CSE Semester 3 Study Group",
    ownerRegNo: "2025503570",
    memberRegNos: ["2025503570", "2025503571", "2025503576", "2025503580"],
    materialSubjects: ["CS23302", "CS23101"],
  },
  {
    name: "Database Systems Team",
    ownerRegNo: "2025503572",
    memberRegNos: ["2025503572", "2025503570", "2025503577", "2025503584"],
    materialSubjects: ["CS23204"],
  },
  {
    name: "AI & ML Study Circle",
    ownerRegNo: "2025503577",
    memberRegNos: ["2025503577", "2025503573", "2025503579", "2025503584"],
    materialSubjects: ["CS23405"],
  },
  {
    name: "Web Development Project",
    ownerRegNo: "2025503582",
    memberRegNos: ["2025503582", "2025503571", "2025503575", "2025503579"],
    materialSubjects: ["CS23101", "CS23204"],
  },
  {
    name: "Engineering Mathematics Group",
    ownerRegNo: "2025503573",
    memberRegNos: ["2025503573", "2025503574", "2025503578", "2025503583"],
    materialSubjects: ["GE3152"],
  },
  {
    name: "Embedded Systems & IoT",
    ownerRegNo: "2025503579",
    memberRegNos: ["2025503579", "2025503572", "2025503574", "2025503581"],
    materialSubjects: ["CS3152"],
  },
];

async function seedMockData() {
  try {
    console.log("=================================================================");
    console.log("   SMART LIBRARY - SEEDING 15 HACKATHON DEMO MOCK PROFILES        ");
    console.log("=================================================================\n");

    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error("MONGO_URI not found in backend .env file!");
    }

    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(mongoUri);
    console.log(" Connected to MongoDB successfully.\n");

    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    // 1. Fetch catalog books from MongoDB to use real book records
    const allBooks = await Book.find({}).lean();
    console.log(` Retrieved ${allBooks.length} catalog books for realistic Borrow associations.`);

    // 2. Fetch catalog materials from MongoDB to use real material records
    const allMaterials = await Material.find({}).lean();
    console.log(` Retrieved ${allMaterials.length} catalog materials for Group resource associations.\n`);

    // Helper to find a real book by subjectCode
    const findBook = (subjectCode) => {
      const match = allBooks.find((b) => b.subjectCode === subjectCode);
      if (match) return match;
      return allBooks[0] || { _id: "MOCK_BOOK_01", title: "Engineering Textbook", subjectCode: "GEN101" };
    };

    // Helper to find materials by subjectCode
    const findMaterialIds = (subjectCodes) => {
      const ids = [];
      subjectCodes.forEach((code) => {
        const mat = allMaterials.find((m) => m.subjectCode === code || m.subjectCode?.startsWith(code.slice(0, 4)));
        if (mat) {
          ids.push(String(mat._id));
        }
      });
      // Fallback: pick any real material if none matched exact subject code
      if (ids.length === 0 && allMaterials.length > 0) {
        ids.push(String(allMaterials[0]._id));
      }
      return ids;
    };

    // Pre-hash common demo password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, salt);

    const targetRegNos = MOCK_STUDENTS.map((s) => s.regNo);

    // 3. Seed / Update 15 Mock Students (Idempotent)
    console.log("Seeding 15 Mock Student Accounts...");
    for (const student of MOCK_STUDENTS) {
      await User.findOneAndUpdate(
        { regNo: student.regNo },
        {
          name: student.name,
          regNo: student.regNo,
          year: student.year,
          department: student.department,
          email: student.email,
          passwordHash: passwordHash,
          role: 'student',
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );

      // Clean & re-seed Borrow records for this specific mock user
      await Borrow.deleteMany({ regNo: student.regNo });

      const borrowDocs = [];
      for (const bConfig of student.booksConfig) {
        const realBook = findBook(bConfig.subjectCode);
        const borrowDate = new Date(now - bConfig.daysAgo * DAY_MS);
        const dueDate = new Date(now + bConfig.dueDaysAhead * DAY_MS);

        borrowDocs.push({
          regNo: student.regNo,
          bookId: String(realBook._id),
          title: realBook.title,
          borrowDate,
          dueDate,
          fineAmount: bConfig.fineAmount,
          isPaid: bConfig.isPaid,
          returnedDate: bConfig.returnedDateDaysAgo ? new Date(now - bConfig.returnedDateDaysAgo * DAY_MS) : null,
          paidDate: bConfig.isPaid ? new Date(now - 1 * DAY_MS) : null,
        });
      }

      if (borrowDocs.length > 0) {
        await Borrow.insertMany(borrowDocs);
      }

      // Presence state: initially NOT checked in (baseline 38 already represents library occupants)
      await Presence.deleteMany({ regNo: student.regNo });
      await Presence.create({
        regNo: student.regNo,
        floor: student.floor || "First Floor",
        checkinTime: null,
        lastPingAt: null,
        isActive: false,
        pendingPing: false,
      });

      // Clean notifications for fresh demo
      await Notification.deleteMany({ regNo: student.regNo });
    }
    console.log(" 15 Mock Students & Borrow records seeded successfully.\n");

    // Initialize persistent library baseline occupancy (Base Count: 38 distributed across 6 rooms)
    const DEFAULT_ROOM_BASE = {
      "First Floor": 8,
      "Second Floor": 7,
      "Reading Room": 9,
      "Discussion Room": 4,
      "Study Room": 6,
      "Reference Room": 4,
    };
    await LibrarySetting.findOneAndUpdate(
      { key: "occupancy" },
      { $set: { key: "occupancy", baseCount: 38, roomBaseCounts: DEFAULT_ROOM_BASE } },
      { upsert: true }
    );
    console.log(" Persistent Library Baseline Occupancy initialized: 38 (distributed across rooms)\n");

    // 3b. Seed Admin Account: Arun Karthick (Idempotent)
    console.log("Seeding Demo Admin Account (Arun Karthick)...");
    const adminPasswordHash = await bcrypt.hash("Admin@123", salt);
    let adminUser = await User.findOne({
      $or: [
        { regNo: "ADMIN202501" },
        { name: "Arun Karthick" }
      ]
    });

    if (adminUser) {
      adminUser.name = "Arun Karthick";
      adminUser.regNo = adminUser.regNo || "ADMIN202501";
      adminUser.role = "admin";
      adminUser.year = adminUser.year || 4;
      adminUser.department = "Library Administration";
      adminUser.email = adminUser.email || "arun.karthick@smartlibrary.admin";
      adminUser.passwordHash = adminPasswordHash;
      await adminUser.save();
    } else {
      await User.create({
        regNo: "ADMIN202501",
        name: "Arun Karthick",
        role: "admin",
        year: 4,
        department: "Library Administration",
        email: "arun.karthick@smartlibrary.admin",
        passwordHash: adminPasswordHash,
      });
    }
    console.log(" Demo Admin Account seeded: Arun Karthick (ADMIN202501 / Admin@123).\n");

    // 4. Seed Study Groups (Idempotent for target mock groups)
    console.log("Seeding Study Groups & Shared Materials...");
    // Remove groups owned by mock students to allow clean, idempotent re-creation
    await Group.deleteMany({ ownerRegNo: { $in: targetRegNos } });

    for (const groupConfig of MOCK_GROUPS) {
      const sharedMaterialIds = findMaterialIds(groupConfig.materialSubjects);

      await Group.create({
        name: groupConfig.name,
        ownerRegNo: groupConfig.ownerRegNo,
        memberRegNos: groupConfig.memberRegNos,
        sharedMaterialIds,
      });
    }
    console.log(` ${MOCK_GROUPS.length} Study Groups seeded with real shared resources.\n`);

    // 5. Summary Output
    console.log("=================================================================");
    console.log("   ALL 15 DEMO PROFILES SEEDED & READY FOR PRESENTATION!          ");
    console.log("=================================================================\n");

    console.log("DEMO ACCOUNTS SUMMARY:\n");
    console.log(
      "Index | Registration No | Name                 | Dept                  | Year | Fine  | Books | Presence"
    );
    console.log(
      "-------------------------------------------------------------------------------------------------------"
    );

    MOCK_STUDENTS.forEach((s, idx) => {
      const totalFine = s.booksConfig.reduce(
        (acc, b) => acc + (b.isPaid ? 0 : b.fineAmount),
        0
      );
      const booksCount = s.booksConfig.length;
      const presence = "Not Checked In";
      console.log(
        `${String(idx + 1).padStart(2)}    | ${s.regNo}      | ${s.name.padEnd(20)} | ${s.department.slice(0, 21).padEnd(21)} | ${s.year} yr | ₹${String(totalFine).padEnd(4)} | ${booksCount}     | ${presence}`
      );
    });

    console.log("\n Common Password: " + DEMO_PASSWORD);
    console.log("=================================================================\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding Error:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  seedMockData();
}

module.exports = {
  MOCK_STUDENTS,
  MOCK_GROUPS,
  seedMockData,
};

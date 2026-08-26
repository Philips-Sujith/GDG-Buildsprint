const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const mongoose = require("mongoose");
require("dotenv").config();

const Borrow = require("./models/Borrow");
const Group = require("./models/Group");
const Presence = require("./models/Presence");
const Notification = require("./models/Notification");

const seedData = async () => {
  try {
    console.log("Connecting to MongoDB for demo seeding...");
    await mongoose.connect(process.env.MONGO_URI);

    const regNo = "REG101";

    // 1. Seed Borrow Documents
    await Borrow.deleteMany({ regNo });
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await Borrow.create([
      {
        regNo,
        bookId: "BK_101",
        title: "Engineering Physics",
        borrowDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        dueDate: tomorrow,
        fineAmount: 50,
        isPaid: false,
        returnedDate: null,
      },
      {
        regNo,
        bookId: "BK_202",
        title: "Data Structures & Algorithms",
        borrowDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        dueDate: nextWeek,
        fineAmount: 100,
        isPaid: false,
        returnedDate: null,
      },
    ]);
    console.log("Seeded Borrow records.");

    // 2. Seed Group Document
    await Group.deleteMany({ ownerRegNo: regNo });
    await Group.create({
      ownerRegNo: regNo,
      memberRegNos: [regNo, "REG102", "REG103"],
      sharedMaterialIds: ["MAT_CS301", "MAT_PHY102"],
    });
    console.log("Seeded Group record.");

    // 3. Seed Presence Document
    await Presence.deleteMany({ regNo });
    await Presence.create({
      regNo,
      floor: "1st Floor Study Zone",
      checkinTime: new Date(),
      lastPingAt: new Date(),
      isActive: true,
      pendingPing: false,
    });
    console.log("Seeded Presence record.");

    // 4. Seed Notification Document
    await Notification.deleteMany({ regNo });
    await Notification.create({
      regNo,
      message: "Your book 'Engineering Physics' is due tomorrow.",
      type: "due-alert",
      isRead: false,
      createdAt: new Date(),
    });
    console.log("Seeded Notification record.");

    console.log("Demo data successfully seeded for REG101!");
    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err.message);
    process.exit(1);
  }
};

seedData();

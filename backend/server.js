const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure local uploads directory exists and serve statically if needed
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// Route Handlers
const authRoutes = require("./routes/auth");
const libraryRoutes = require("./routes/library");
const grievanceRoutes = require("./routes/grievance");
const uploadRoutes = require("./routes/upload");
const booksRoutes = require("./routes/books");
const materialsRoutes = require("./routes/materials");
const profileRoutes = require("./routes/profile");
const paymentRoutes = require("./routes/payment");
const presenceRoutes = require("./routes/presence");
const groupsRoutes = require("./routes/groups");
const notificationsRoutes = require("./routes/notifications");
const adminRoutes = require("./routes/admin");

// API Route Registrations
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/library", libraryRoutes);
app.use("/api/grievance", grievanceRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/books", booksRoutes);
app.use("/api/materials", materialsRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/presence", presenceRoutes);
app.use("/api/groups", groupsRoutes);
app.use("/api/notifications", notificationsRoutes);

// Initialize background jobs (due date check and presence ping)
require("./jobs/dueDateChecker");
require("./jobs/presencePing");

// Health Check / Root Test Route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Smart Library Backend is running",
    endpoints: [
      "/api/auth/register",
      "/api/auth/login",
      "/api/library/count",
      "/api/grievance",
      "/api/upload",
      "/api/books/search?q=<query>",
      "/api/books",
      "/api/materials/search?year=&q=",
      "/api/materials",
      "/api/profile/:regNo",
      "/api/payment/create-order",
      "/api/payment/verify",
      "/api/presence/checkin",
      "/api/presence/ping-response",
      "/api/groups",
      "/api/notifications/:regNo",
    ],
  });
});

// Connect to MongoDB
const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Backend server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:");
    console.error(error.message);
  });

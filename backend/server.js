const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Smart Library Backend is running",
  });
});

// Routes
app.use("/api/profile", require("./routes/profile"));
app.use("/api/payment", require("./routes/payment"));
app.use("/api/presence", require("./routes/presence"));
app.use("/api/groups", require("./routes/groups"));
app.use("/api/notifications", require("./routes/notifications"));

// Initialize background jobs
require("./jobs/dueDateChecker");
require("./jobs/presencePing");

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
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
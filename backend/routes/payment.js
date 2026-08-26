const express = require("express");
const router = express.Router();
const Borrow = require("../models/Borrow");

// Helper to generate a realistic Demo Transaction ID
const generateDemoTxnId = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(10000 + Math.random() * 90000);
  return `DEMO-TXN-${dateStr}-${randomSuffix}`;
};

// POST /api/payment/create-order
// Initiates a demo payment order with verified fine amount from database
router.post("/create-order", async (req, res) => {
  try {
    const { regNo, amount } = req.body;

    if (!regNo) {
      return res.status(400).json({ success: false, message: "regNo is required" });
    }

    // Verify actual outstanding fine from Borrow collection
    const unpaidBorrows = await Borrow.find({
      regNo: { $regex: new RegExp(`^${regNo}$`, "i") },
      isPaid: false,
      returnedDate: null,
    });

    const calculatedFine = unpaidBorrows.reduce((acc, curr) => acc + (Number(curr.fineAmount) || 0), 0);
    const orderAmount = calculatedFine > 0 ? calculatedFine : (Number(amount) || 0);

    if (orderAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "No outstanding fine amount to pay.",
      });
    }

    const cleanRegNo = regNo.replace(/[^a-zA-Z0-9]/g, "");
    const orderId = `DEMO_ORDER_${cleanRegNo}_${Date.now()}`;
    const transactionId = generateDemoTxnId();

    console.log(`\n[Demo Payment Gateway] Initialized Order for RegNo: ${regNo} | Amount: ₹${orderAmount} | OrderId: ${orderId}`);

    return res.json({
      success: true,
      orderId,
      transactionId,
      orderAmount,
      currency: "INR",
      status: "INITIATED",
    });
  } catch (error) {
    console.error("[Demo Payment] Error creating order:", error);
    return res.status(500).json({ success: false, message: "Failed to initiate demo payment" });
  }
});

// POST /api/payment/verify
// Completes and records the demo fine payment in MongoDB
router.post("/verify", async (req, res) => {
  try {
    const { orderId, regNo, paymentMethod, amount } = req.body;

    if (!regNo && !orderId) {
      return res.status(400).json({ success: false, message: "regNo or orderId is required" });
    }

    const filter = regNo
      ? { regNo: { $regex: new RegExp(`^${regNo}$`, "i") }, isPaid: false }
      : { isPaid: false };

    const updateResult = await Borrow.updateMany(filter, {
      $set: { isPaid: true, fineAmount: 0 },
    });

    const transactionId = req.body.transactionId || generateDemoTxnId();
    const paidAt = new Date().toISOString();

    console.log(`[Demo Payment Gateway] Payment Successful for RegNo: ${regNo || 'Unknown'} | Cleared ${updateResult.modifiedCount} borrow records | Txn: ${transactionId}`);

    return res.json({
      success: true,
      status: "PAID",
      isPaid: true,
      transactionId,
      orderId: orderId || `DEMO_ORDER_${Date.now()}`,
      paidAt,
      paymentMethod: paymentMethod || "UPI",
      message: "Payment successful. Your outstanding fine has been cleared.",
    });
  } catch (error) {
    console.error("[Demo Payment] Error verifying payment:", error);
    return res.status(500).json({ success: false, message: "Demo payment processing failed" });
  }
});

module.exports = router;

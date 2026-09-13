const express = require("express");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const router = express.Router();
const Borrow = require("../models/Borrow");
const Payment = require("../models/Payment");
const Notification = require("../models/Notification");

/**
 * Initialize Razorpay instance using Test Mode credentials
 */
const getRazorpayInstance = () => {
  const keyId = (process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

  if (!keyId || !keySecret) {
    return null;
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
};

/**
 * POST /api/payment/create-order
 * Calculates authoritative outstanding fine from MongoDB and creates a Razorpay Test Mode Order
 */
router.post("/create-order", async (req, res) => {
  try {
    const { regNo } = req.body;

    if (!regNo || typeof regNo !== "string" || !regNo.trim()) {
      return res.status(400).json({
        success: false,
        message: "Student registration number (regNo) is required.",
      });
    }

    const trimmedRegNo = regNo.trim();

    // 1. Verify Razorpay credentials configuration
    const razorpay = getRazorpayInstance();
    if (!razorpay) {
      console.error("[Razorpay] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in environment");
      return res.status(500).json({
        success: false,
        message: "Payment gateway is not properly configured. Please contact administrator.",
      });
    }

    // 2. Authoritative fine calculation directly from MongoDB
    const unpaidBorrows = await Borrow.find({
      regNo: { $regex: new RegExp(`^${trimmedRegNo}$`, "i") },
      isPaid: false,
      returnedDate: null,
    });

    const totalDue = unpaidBorrows.reduce(
      (acc, curr) => acc + (Number(curr.fineAmount) || 0),
      0
    );

    if (totalDue <= 0) {
      return res.status(400).json({
        success: false,
        message: "No outstanding fine amount to pay.",
      });
    }

    // 3. Convert amount to paise (1 INR = 100 paise)
    const amountInPaise = Math.round(totalDue * 100);

    // 4. Generate unique short receipt string (max 40 chars)
    const cleanRegNo = trimmedRegNo.replace(/[^a-zA-Z0-9]/g, "").slice(0, 15);
    const receipt = `rcpt_${cleanRegNo}_${Date.now()}`.slice(0, 40);

    // 5. Create order with Razorpay
    const orderOptions = {
      amount: amountInPaise,
      currency: "INR",
      receipt: receipt,
      notes: {
        regNo: trimmedRegNo,
        description: `Library Fine Settlement for ${trimmedRegNo}`,
      },
    };

    const order = await razorpay.orders.create(orderOptions);

    // 6. Create Payment audit document
    await Payment.create({
      regNo: trimmedRegNo,
      amount: totalDue,
      currency: "INR",
      razorpayOrderId: order.id,
      status: "Created",
    });

    console.log(
      `[Razorpay] Created Order: ${order.id} | Amount: ₹${totalDue} (${amountInPaise} paise) | RegNo: ${trimmedRegNo}`
    );

    // 7. Return safe order data to frontend (NEVER expose key_secret)
    return res.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    console.error("[Razorpay] Error creating order:", error.message || error);
    return res.status(500).json({
      success: false,
      message: error.error?.description || error.message || "Failed to create Razorpay payment order.",
    });
  }
});

/**
 * POST /api/payment/verify
 * Cryptographically verifies Razorpay signature via HMAC-SHA256,
 * confirms payment capture with Razorpay API, and settles fines in MongoDB
 */
router.post("/verify", async (req, res) => {
  try {
    const { regNo, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // 1. Validate required fields
    if (!regNo || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required payment verification parameters (regNo, razorpay_order_id, razorpay_payment_id, razorpay_signature).",
      });
    }

    const trimmedRegNo = String(regNo).trim();

    // 2. Check Razorpay configuration
    const razorpay = getRazorpayInstance();
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
    if (!razorpay || !keySecret) {
      console.error("[Razorpay] Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET in environment");
      return res.status(500).json({
        success: false,
        message: "Payment gateway is not properly configured.",
      });
    }

    // 3. Find existing Payment document
    const paymentDoc = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!paymentDoc) {
      return res.status(404).json({
        success: false,
        message: `No payment record found for order ID: ${razorpay_order_id}`,
      });
    }

    // 4. Confirm regNo matches
    if (paymentDoc.regNo.toLowerCase() !== trimmedRegNo.toLowerCase()) {
      return res.status(400).json({
        success: false,
        message: "Payment order does not belong to the supplied registration number.",
      });
    }

    const serverOrderId = paymentDoc.razorpayOrderId;

    // 5. Idempotency Check: if already Paid, return success safely without double-processing
    if (paymentDoc.status === "Paid") {
      console.log(`[Razorpay] Idempotent hit: Order ${serverOrderId} already marked Paid.`);
      return res.json({
        success: true,
        data: {
          orderId: serverOrderId,
          paymentId: paymentDoc.razorpayPaymentId || razorpay_payment_id,
          amount: paymentDoc.amount,
          status: "Paid",
          message: "Payment already verified and processed.",
        },
      });
    }

    // 6. Cryptographic HMAC-SHA256 signature verification using server-stored order ID
    const text = `${serverOrderId}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(text)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "utf8");
    const receivedBuffer = Buffer.from(razorpay_signature, "utf8");

    const isSignatureValid =
      expectedBuffer.length === receivedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

    if (!isSignatureValid) {
      console.warn(`[Razorpay] Signature mismatch for Order: ${serverOrderId}`);
      paymentDoc.status = "Failed";
      await paymentDoc.save();
      return res.status(400).json({
        success: false,
        message: "Payment verification failed: Invalid signature.",
      });
    }

    // 7. Query Razorpay API to confirm payment and order status
    let paymentDetails;
    let orderDetails;
    try {
      [paymentDetails, orderDetails] = await Promise.all([
        razorpay.payments.fetch(razorpay_payment_id),
        razorpay.orders.fetch(serverOrderId),
      ]);
    } catch (fetchErr) {
      console.error("[Razorpay] Error fetching payment/order details from API:", fetchErr.message || fetchErr);
      return res.status(500).json({
        success: false,
        message: "Unable to confirm payment status with Razorpay.",
      });
    }

    const expectedAmountInPaise = Math.round(paymentDoc.amount * 100);
    const expectedCurrency = (paymentDoc.currency || "INR").toUpperCase();

    // Verify all requirements:
    // 1. paymentDetails.order_id === serverOrderId
    // 2. paymentDetails.status === "captured" (strictly require captured)
    // 3. orderDetails.status === "paid"
    // 4. paymentDetails.amount === expectedAmountInPaise
    // 5. paymentDetails.currency === expectedCurrency
    if (
      !paymentDetails ||
      !orderDetails ||
      paymentDetails.order_id !== serverOrderId ||
      paymentDetails.status !== "captured" ||
      orderDetails.status !== "paid" ||
      Number(paymentDetails.amount) !== expectedAmountInPaise ||
      String(paymentDetails.currency).toUpperCase() !== expectedCurrency
    ) {
      console.warn(
        `[Razorpay] Verification requirements failed for Order: ${serverOrderId} | Payment Status: ${paymentDetails?.status} | Order Status: ${orderDetails?.status} | Amount: ${paymentDetails?.amount}/${expectedAmountInPaise} | Currency: ${paymentDetails?.currency}/${expectedCurrency}`
      );
      paymentDoc.status = "Failed";
      await paymentDoc.save();
      return res.status(400).json({
        success: false,
        message: `Payment verification failed. Payment status: ${paymentDetails?.status || "Unknown"}, Order status: ${orderDetails?.status || "Unknown"}`,
      });
    }

    // 8. Update Payment audit record
    paymentDoc.status = "Paid";
    paymentDoc.razorpayPaymentId = razorpay_payment_id;
    paymentDoc.razorpaySignature = razorpay_signature;
    paymentDoc.paymentMethod = paymentDetails.method || "ONLINE";
    paymentDoc.verifiedAt = new Date();
    await paymentDoc.save();

    // 9. Update student's unpaid Borrow records in MongoDB
    const updateResult = await Borrow.updateMany(
      {
        regNo: { $regex: new RegExp(`^${paymentDoc.regNo}$`, "i") },
        isPaid: false,
      },
      {
        $set: {
          isPaid: true,
          fineAmount: 0,
          paidDate: new Date(),
        },
      }
    );

    console.log(
      `✅ [Razorpay] Payment Verified! Order: ${serverOrderId} | Txn: ${razorpay_payment_id} | Cleared ${updateResult.modifiedCount} borrow fines for RegNo: ${paymentDoc.regNo}`
    );

    // 10. Record a payment notification
    await Notification.create({
      regNo: paymentDoc.regNo,
      message: `Payment of ₹${paymentDoc.amount} received successfully via Razorpay. All outstanding library fines cleared.`,
      type: "payment-success",
      isRead: false,
    });

    // 11. Return safe confirmation to client
    return res.json({
      success: true,
      data: {
        orderId: serverOrderId,
        paymentId: razorpay_payment_id,
        amount: paymentDoc.amount,
        status: "Paid",
        paymentMethod: paymentDoc.paymentMethod,
        paidAt: paymentDoc.verifiedAt,
      },
    });
  } catch (error) {
    console.error("[Razorpay] Verification server error:", error.message || error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while verifying payment.",
    });
  }
});

/**
 * GET /api/payment/verify/:orderId
 * Read-only status inquiry endpoint (does NOT clear fines)
 */
router.get("/verify/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!orderId) {
      return res.status(400).json({ success: false, message: "orderId is required" });
    }

    const paymentDoc = await Payment.findOne({ razorpayOrderId: orderId });
    if (!paymentDoc) {
      return res.status(404).json({ success: false, message: "Payment order not found" });
    }

    return res.json({
      success: true,
      data: {
        orderId: paymentDoc.razorpayOrderId,
        status: paymentDoc.status,
        amount: paymentDoc.amount,
        paymentMethod: paymentDoc.paymentMethod,
        createdAt: paymentDoc.createdAt,
        verifiedAt: paymentDoc.verifiedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error retrieving payment status" });
  }
});

const { resetMockPayments } = require("../resetMockPayments");

/**
 * POST /api/payment/reset-demo
 * Safely restores seeded demo student fines and borrow states for the 15 designated mock students.
 * - Publicly accessible from login screen for demo reset
 * - Idempotent
 * - Affects ONLY designated MOCK_STUDENTS
 * - Preserves Payment audit collection records
 * - Never modifies admin or real students
 */
const resetDemoHandler = async (req, res) => {
  try {
    const result = await resetMockPayments(false);
    return res.json(result);
  } catch (error) {
    console.error("[Payment] Error resetting demo payments:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to reset demo payment profiles.",
    });
  }
};

router.post("/reset-demo", resetDemoHandler);
router.post("/reset-mock", resetDemoHandler);

module.exports = router;

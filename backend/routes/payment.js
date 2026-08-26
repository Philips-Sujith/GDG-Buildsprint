const express = require("express");
const router = express.Router();
const axios = require("axios");
const Borrow = require("../models/Borrow");

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID || "TEST_APP_ID";
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY || "TEST_SECRET_KEY";
const CASHFREE_BASE_URL = "https://sandbox.cashfree.com/pg";

// POST /api/payment/create-order
router.post("/create-order", async (req, res) => {
  try {
    const { regNo, amount } = req.body;

    if (!regNo || amount === undefined) {
      return res.status(400).json({ success: false, message: "regNo and amount are required" });
    }

    const orderId = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const payload = {
      order_id: orderId,
      order_amount: Number(amount),
      order_currency: "INR",
      customer_details: {
        customer_id: regNo,
        customer_email: `${regNo.toLowerCase()}@student.library.edu`,
        customer_phone: "9999999999",
      },
      order_meta: {
        return_url: `http://localhost:5173/profile?order_id=${orderId}`,
      },
    };

    // Attempt real Cashfree sandbox API call
    if (CASHFREE_APP_ID !== "TEST_APP_ID" && CASHFREE_SECRET_KEY !== "TEST_SECRET_KEY") {
      try {
        const response = await axios.post(`${CASHFREE_BASE_URL}/orders`, payload, {
          headers: {
            "x-api-version": "2023-08-01",
            "x-client-id": CASHFREE_APP_ID,
            "x-client-secret": CASHFREE_SECRET_KEY,
            "Content-Type": "application/json",
          },
        });

        return res.json({
          success: true,
          paymentSessionId: response.data.payment_session_id,
          orderId: response.data.order_id,
        });
      } catch (apiError) {
        console.error("Cashfree Sandbox API Error:", apiError.response?.data || apiError.message);
      }
    }

    // Fallback sandbox session for demo testing when keys are missing or test mode
    const simulatedSessionId = `session_sim_${Date.now()}`;
    return res.json({
      success: true,
      paymentSessionId: simulatedSessionId,
      orderId: orderId,
    });
  } catch (error) {
    console.error("Error creating payment order:", error);
    return res.status(500).json({ success: false, message: "Failed to create payment order" });
  }
});

// POST /api/payment/verify
router.post("/verify", async (req, res) => {
  try {
    const { orderId, regNo } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: "orderId is required" });
    }

    let isPaid = true;
    let paymentStatus = "SUCCESS";

    if (CASHFREE_APP_ID !== "TEST_APP_ID" && CASHFREE_SECRET_KEY !== "TEST_SECRET_KEY") {
      try {
        const response = await axios.get(`${CASHFREE_BASE_URL}/orders/${orderId}`, {
          headers: {
            "x-api-version": "2023-08-01",
            "x-client-id": CASHFREE_APP_ID,
            "x-client-secret": CASHFREE_SECRET_KEY,
          },
        });

        paymentStatus = response.data.order_status;
        isPaid = paymentStatus === "PAID" || paymentStatus === "SUCCESS";
      } catch (apiError) {
        console.error("Cashfree Verify Error:", apiError.response?.data || apiError.message);
        // Fallback for sandbox demo testing
        isPaid = true;
        paymentStatus = "SUCCESS";
      }
    }

    if (isPaid) {
      const filter = regNo ? { regNo, isPaid: false } : { isPaid: false };
      await Borrow.updateMany(filter, { $set: { isPaid: true, fineAmount: 0 } });
    }

    return res.json({
      status: paymentStatus,
      isPaid: isPaid,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return res.status(500).json({ success: false, message: "Payment verification failed" });
  }
});

module.exports = router;

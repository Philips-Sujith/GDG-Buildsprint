const express = require("express");
const axios = require("axios");
const router = express.Router();
const Borrow = require("../models/Borrow");
const User = require("../models/User");
const Notification = require("../models/Notification");

/**
 * Read and validate Cashfree Sandbox/Production configuration
 */
const getCashfreeConfig = () => {
  const appId = (process.env.CASHFREE_APP_ID || "").trim();
  const secretKey = (process.env.CASHFREE_SECRET_KEY || "").trim();
  const environment = (process.env.CASHFREE_ENVIRONMENT || "SANDBOX").trim().toUpperCase();

  const baseUrl =
    environment === "PRODUCTION"
      ? "https://api.cashfree.com/pg"
      : "https://sandbox.cashfree.com/pg";

  return {
    appId,
    secretKey,
    environment,
    baseUrl,
    isConfigured: Boolean(appId && secretKey),
  };
};

/**
 * POST /api/payment/create-order
 * Creates a Cashfree Sandbox payment order and returns payment_session_id
 */
router.post("/create-order", async (req, res) => {
  try {
    const { regNo, amount, customerPhone, customerEmail, customerName } = req.body;

    if (!regNo) {
      return res.status(400).json({
        success: false,
        message: "Student registration number (regNo) is required.",
      });
    }

    // 1. Check Cashfree Sandbox configuration
    const cfConfig = getCashfreeConfig();
    if (!cfConfig.isConfigured) {
      console.error("[Cashfree PG] Missing CASHFREE_APP_ID or CASHFREE_SECRET_KEY in backend/.env");
      return res.status(400).json({
        success: false,
        isConfigured: false,
        code: "CASHFREE_CREDENTIALS_MISSING",
        message:
          "Cashfree Sandbox credentials are not configured. Please add CASHFREE_APP_ID and CASHFREE_SECRET_KEY in backend/.env.",
      });
    }

    // 2. Fetch student user & verify unpaid borrows
    const [userDoc, unpaidBorrows] = await Promise.all([
      User.findOne({ regNo: { $regex: new RegExp(`^${regNo}$`, "i") } }),
      Borrow.find({
        regNo: { $regex: new RegExp(`^${regNo}$`, "i") },
        isPaid: false,
        returnedDate: null,
      }),
    ]);

    const calculatedFine = unpaidBorrows.reduce(
      (acc, curr) => acc + (Number(curr.fineAmount) || 0),
      0
    );
    const orderAmount = calculatedFine > 0 ? calculatedFine : Number(amount) || 0;

    if (orderAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "No outstanding fine amount to pay.",
      });
    }

    // 3. Prepare unique Order ID & sanitized Customer Details
    const cleanRegNo = regNo.replace(/[^a-zA-Z0-9]/g, "");
    const orderId = `order_${cleanRegNo}_${Date.now()}`.slice(0, 45);

    const customerId = `cust_${cleanRegNo}`.slice(0, 45);
    const resolvedName = (customerName || userDoc?.name || `Student ${cleanRegNo}`).trim();
    const resolvedEmail = (
      customerEmail ||
      userDoc?.email ||
      `${cleanRegNo.toLowerCase()}@smartlibrary.demo`
    ).trim();
    
    // Ensure phone is valid 10 digits as required by Cashfree API
    let resolvedPhone = (customerPhone || userDoc?.phone || "9876543210").replace(/[^0-9]/g, "");
    if (resolvedPhone.length < 10) resolvedPhone = "9876543210";
    if (resolvedPhone.length > 10) resolvedPhone = resolvedPhone.slice(-10);

    const frontendOrigin = req.headers.origin || "http://localhost:5173";
    const returnUrl = `${frontendOrigin}/profile?order_id={order_id}`;

    console.log(
      `\n[Cashfree PG Sandbox] Creating Order: ${orderId} | Amount: ₹${orderAmount} | Student: ${resolvedName} (${regNo})`
    );

    // 4. Call Cashfree PG API (v2023-08-01) to create order
    const cfPayload = {
      order_id: orderId,
      order_amount: Number(orderAmount),
      order_currency: "INR",
      customer_details: {
        customer_id: customerId,
        customer_name: resolvedName,
        customer_email: resolvedEmail,
        customer_phone: resolvedPhone,
      },
      order_meta: {
        return_url: returnUrl,
      },
      order_note: `Smart Library fine settlement for ${regNo}`,
    };

    const cfResponse = await axios.post(`${cfConfig.baseUrl}/orders`, cfPayload, {
      headers: {
        "x-client-id": cfConfig.appId,
        "x-client-secret": cfConfig.secretKey,
        "x-api-version": "2023-08-01",
        "Content-Type": "application/json",
      },
    });

    const { payment_session_id, order_status } = cfResponse.data;

    console.log(`[Cashfree PG Sandbox] Order Created Successfully! OrderId: ${orderId} | Status: ${order_status}`);

    return res.json({
      success: true,
      orderId: cfResponse.data.order_id,
      paymentSessionId: payment_session_id,
      orderAmount: cfResponse.data.order_amount,
      orderCurrency: cfResponse.data.order_currency,
      orderStatus: order_status,
      environment: cfConfig.environment,
    });
  } catch (error) {
    const errorDetails = error.response?.data || error.message;
    console.error("[Cashfree PG Sandbox] Order creation failed:", errorDetails);

    return res.status(error.response?.status || 500).json({
      success: false,
      message:
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to create Cashfree Sandbox payment order.",
      details: errorDetails,
    });
  }
});

/**
 * GET & POST /api/payment/verify/:orderId?
 * Queries Cashfree API using secret key to verify payment status and update database
 */
const handlePaymentVerification = async (req, res) => {
  try {
    const orderId = req.params.orderId || req.body.orderId || req.query.orderId;
    const regNo = req.body.regNo || req.query.regNo;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "orderId is required for verification.",
      });
    }

    const cfConfig = getCashfreeConfig();
    if (!cfConfig.isConfigured) {
      return res.status(400).json({
        success: false,
        message: "Cashfree Sandbox credentials are not configured in backend/.env.",
      });
    }

    console.log(`\n[Cashfree PG Sandbox] Verifying Payment Status for Order: ${orderId}...`);

    // 1. Fetch Order Details from Cashfree API
    const orderRes = await axios.get(`${cfConfig.baseUrl}/orders/${orderId}`, {
      headers: {
        "x-client-id": cfConfig.appId,
        "x-client-secret": cfConfig.secretKey,
        "x-api-version": "2023-08-01",
      },
    });

    const cfOrder = orderRes.data;
    const orderStatus = (cfOrder.order_status || "").toUpperCase();
    console.log(`[Cashfree PG Sandbox] Order ${orderId} Status from Cashfree: ${orderStatus}`);

    // 2. Fetch Payment Transactions for this order
    let latestPayment = null;
    try {
      const paymentsRes = await axios.get(`${cfConfig.baseUrl}/orders/${orderId}/payments`, {
        headers: {
          "x-client-id": cfConfig.appId,
          "x-client-secret": cfConfig.secretKey,
          "x-api-version": "2023-08-01",
        },
      });
      if (Array.isArray(paymentsRes.data) && paymentsRes.data.length > 0) {
        latestPayment = paymentsRes.data[0];
      }
    } catch (payErr) {
      console.warn("[Cashfree PG Sandbox] Could not fetch payment transaction list:", payErr.message);
    }

    // 3. Handle PAID / SUCCESS State
    if (orderStatus === "PAID") {
      // Determine student regNo from customer_id / order_id / body
      let resolvedRegNo = regNo;
      if (!resolvedRegNo && cfOrder.customer_details?.customer_id) {
        resolvedRegNo = cfOrder.customer_details.customer_id.replace(/^cust_/, "");
      }
      if (!resolvedRegNo) {
        const match = orderId.match(/^order_([^_]+)_/);
        if (match) resolvedRegNo = match[1];
      }

      // Update Borrow records in MongoDB
      if (resolvedRegNo) {
        const updateResult = await Borrow.updateMany(
          {
            regNo: { $regex: new RegExp(`^${resolvedRegNo}$`, "i") },
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
          `✅ [Cashfree PG Sandbox] Payment Verified! Cleared ${updateResult.modifiedCount} borrow fines for RegNo: ${resolvedRegNo}`
        );

        // Record a payment notification
        await Notification.create({
          regNo: resolvedRegNo,
          message: `Payment of ₹${cfOrder.order_amount} received successfully via Cashfree. All outstanding library fines cleared.`,
          type: "payment-success",
          isRead: false,
        });
      }

      return res.json({
        success: true,
        isPaid: true,
        status: "PAID",
        orderId: cfOrder.order_id,
        amount: cfOrder.order_amount,
        transactionId: latestPayment?.cf_payment_id || `CF-${cfOrder.cf_order_id}`,
        paymentMethod: latestPayment?.payment_group || "CASHFREE_GATEWAY",
        paidAt: cfOrder.order_expiry_time || new Date().toISOString(),
        message: "Payment successful! Your outstanding library fine has been cleared.",
      });
    }

    // 4. Handle PENDING / ACTIVE State
    if (orderStatus === "ACTIVE") {
      return res.json({
        success: false,
        isPaid: false,
        status: "ACTIVE",
        orderId: cfOrder.order_id,
        message: "Payment is pending or still in progress.",
      });
    }

    // 5. Handle FAILED / EXPIRED / CANCELLED / USER_DROPPED State
    return res.json({
      success: false,
      isPaid: false,
      status: orderStatus || "FAILED",
      orderId: cfOrder.order_id,
      message:
        latestPayment?.payment_message ||
        `Payment was not completed (Status: ${orderStatus}). Your outstanding fine remains unchanged.`,
    });
  } catch (error) {
    const errorDetails = error.response?.data || error.message;
    console.error("[Cashfree PG Sandbox] Verification failed:", errorDetails);

    return res.status(error.response?.status || 500).json({
      success: false,
      message:
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to verify payment with Cashfree.",
      details: errorDetails,
    });
  }
};

router.get("/verify/:orderId", handlePaymentVerification);
router.post("/verify", handlePaymentVerification);

module.exports = router;

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  getProfile,
  createPaymentOrder,
  verifyPayment,
  createGroup,
  getGroups,
  shareToGroup,
  checkIn,
  checkOut,
  respondToPing,
  getPresence,
  getNotifications,
  dismissNotification,
} from "../api/api";
import {
  BookOpen,
  CreditCard,
  Users,
  MapPin,
  Bell,
  AlertCircle,
  PlusCircle,
  Share2,
  Clock,
  UserCheck,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Check,
  X,
  Smartphone,
  Building2,
  ShieldCheck,
  Receipt,
  ArrowRight,
  Lock,
  LogOut,
} from "lucide-react";
import Navbar from "../components/Navbar";

/**
 * Safely parse a date input (string, Date, or number) into a Date object.
 * Avoids timezone-related off-by-one errors when date-only strings (e.g. "2026-08-01")
 * or midnight UTC strings ("2026-08-01T00:00:00.000Z") are converted into local time.
 */
const parseDateSafely = (dateInput) => {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }
  if (typeof dateInput === "number") {
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof dateInput === "string") {
    // If format is YYYY-MM-DD or YYYY-MM-DDT00:00:00... treat as calendar date in local timezone
    const dateOnlyMatch = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.000)?Z?)?$/);
    if (dateOnlyMatch) {
      const year = parseInt(dateOnlyMatch[1], 10);
      const month = parseInt(dateOnlyMatch[2], 10) - 1;
      const day = parseInt(dateOnlyMatch[3], 10);
      return new Date(year, month, day);
    }
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

/**
 * Checks dynamically whether a book's dueDate has passed against the current date/time.
 * Returns false if the book was already returned.
 */
const isBookOverdue = (dueDateInput, returnedDateInput) => {
  if (returnedDateInput) return false;
  const dueDate = parseDateSafely(dueDateInput);
  if (!dueDate) return false;

  const now = new Date();

  // If due date has hours, minutes, seconds all 0 (date-only or midnight),
  // the borrower has until the end of that local calendar day (23:59:59.999).
  if (dueDate.getHours() === 0 && dueDate.getMinutes() === 0 && dueDate.getSeconds() === 0) {
    const endOfDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate(), 23, 59, 59, 999);
    return now.getTime() > endOfDay.getTime();
  }

  return now.getTime() > dueDate.getTime();
};

/**
 * Formats due date cleanly avoiding timezone off-by-one errors.
 */
const formatDueDate = (dateInput) => {
  const d = parseDateSafely(dateInput);
  if (!d) return "N/A";
  return d.toLocaleDateString();
};

export default function Profile() {
  const authUser = JSON.parse(localStorage.getItem("user") || "{}");
  const defaultRegNo = authUser.regNo || localStorage.getItem("regNo") || "2025503560";

  const [regNo, setRegNo] = useState(defaultRegNo);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Razorpay Payment Gateway State
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState(null);
  const [paymentMsg, setPaymentMsg] = useState("");
  const [paymentStatusType, setPaymentStatusType] = useState("info"); // "success" | "error" | "info"

  // Group Space State
  const [groups, setGroups] = useState([]);
  const [newMemberRegNos, setNewMemberRegNos] = useState("");
  const [shareMaterialIds, setShareMaterialIds] = useState({});
  const [groupMsg, setGroupMsg] = useState("");

  // Presence State
  const [floor, setFloor] = useState("First Floor");
  const [presence, setPresence] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);

  // Notifications State (Deduplicated)
  const [notifications, setNotifications] = useState([]);

  // Fetch all data for current regNo
  const loadData = async (studentRegNo = regNo) => {
    setLoading(true);
    setError("");
    try {
      const [profileData, groupsData, presenceData, notifsData] = await Promise.allSettled([
        getProfile(studentRegNo),
        getGroups(studentRegNo),
        getPresence(studentRegNo),
        getNotifications(studentRegNo),
      ]);

      if (profileData.status === "fulfilled") {
        setProfile(profileData.value);
      } else {
        setError("Failed to load profile data.");
      }

      if (groupsData.status === "fulfilled" && groupsData.value.groups) {
        setGroups(groupsData.value.groups);
      }

      if (presenceData.status === "fulfilled" && presenceData.value.presence) {
        setPresence(presenceData.value.presence);
        if (presenceData.value.presence.floor) {
          setFloor(presenceData.value.presence.floor);
        }
      }

      if (notifsData.status === "fulfilled" && Array.isArray(notifsData.value)) {
        const uniqueMap = new Map();
        notifsData.value.forEach((n) => {
          if (!uniqueMap.has(n.message)) {
            uniqueMap.set(n.message, n);
          }
        });
        setNotifications(Array.from(uniqueMap.values()));
      }
    } catch (err) {
      console.error(err);
      setError("Error connecting to server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(regNo);
  }, [regNo]);

  // Handle Razorpay Fine Payment
  const handlePayFine = async () => {
    if (!profile || profile.totalDue <= 0 || paymentLoading) return;

    setPaymentMsg("");
    setPaymentStatusType("info");

    // 1. Verify Razorpay script is loaded
    if (typeof window.Razorpay === "undefined") {
      setPaymentStatusType("error");
      setPaymentMsg(
        "Razorpay payment gateway SDK failed to load. Please check your internet connection or reload the page."
      );
      return;
    }

    setPaymentLoading(true);

    try {
      // 2. Call backend to create Razorpay Test Mode Order (authoritative fine calculated from MongoDB)
      const orderRes = await createPaymentOrder(regNo);

      if (!orderRes.success || !orderRes.data) {
        throw new Error(orderRes.message || "Failed to initiate payment order with server.");
      }

      const { orderId, amount, currency, keyId } = orderRes.data;

      // 3. Configure Razorpay Checkout options
      const options = {
        key: keyId,
        amount: amount,
        currency: currency || "INR",
        name: "Smart Library Management System",
        description: "Library Fine Payment",
        order_id: orderId,
        prefill: {
          name: profile.name || authUser.name || "",
          email: profile.email || authUser.email || "",
          contact: profile.phone || authUser.phone || "",
        },
        theme: {
          color: "#4f46e5",
        },
        handler: async function (response) {
          try {
            setPaymentMsg("Verifying payment with library server...");
            setPaymentStatusType("info");

            // 4. Verify payment cryptographically with backend
            const verifyRes = await verifyPayment({
              regNo,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            if (verifyRes.success && verifyRes.data?.status === "Paid") {
              const receiptData = {
                studentName: profile.name,
                regNo: regNo,
                amountPaid: verifyRes.data.amount || profile.totalDue,
                transactionId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                paymentMethod: verifyRes.data.paymentMethod || "Razorpay Online",
                timestamp: new Date().toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }),
              };

              setPaymentReceipt(receiptData);
              setPaymentStatusType("success");
              setPaymentMsg(
                `Payment of ₹${receiptData.amountPaid} verified successfully! Outstanding fine has been cleared.`
              );

              // Refresh profile data and notifications
              await loadData(regNo);
            } else {
              setPaymentStatusType("error");
              setPaymentMsg(
                verifyRes.message || "Payment verification failed on server. Your fine has not been cleared."
              );
            }
          } catch (verifyErr) {
            console.error("Payment verification error:", verifyErr);
            setPaymentStatusType("error");
            setPaymentMsg(
              verifyErr.response?.data?.message ||
                verifyErr.message ||
                "Error verifying payment with server. Your fine has not been changed."
            );
          } finally {
            setPaymentLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setPaymentLoading(false);
            setPaymentStatusType("info");
            setPaymentMsg("Payment checkout was cancelled. No charges were made.");
          },
        },
      };

      const rzp = new window.Razorpay(options);

      rzp.on("payment.failed", function (response) {
        setPaymentLoading(false);
        setPaymentStatusType("error");
        setPaymentMsg(
          response.error?.description || "Payment failed at gateway. Your fine remains unchanged."
        );
      });

      rzp.open();
    } catch (err) {
      console.error("Payment initiation error:", err);
      setPaymentLoading(false);
      setPaymentStatusType("error");
      setPaymentMsg(
        err.response?.data?.message ||
          err.message ||
          "Failed to initiate payment. Please try again."
      );
    }
  };

  // Close Payment Receipt Modal & Refresh Data
  const handleCloseReceiptModal = () => {
    setPaymentReceipt(null);
    loadData(regNo);
  };

  // Create Group Handler
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setGroupMsg("");
    const members = newMemberRegNos
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      const res = await createGroup(regNo, members);
      if (res.success) {
        setGroupMsg("Group created successfully!");
        setNewMemberRegNos("");
        loadData(regNo);
      }
    } catch (err) {
      console.error(err);
      setGroupMsg("Failed to create group.");
    }
  };

  // Share Material Handler
  const handleShareMaterial = async (groupId) => {
    const matId = shareMaterialIds[groupId];
    if (!matId) return;

    try {
      const res = await shareToGroup(groupId, matId, regNo);
      if (res.success) {
        setShareMaterialIds((prev) => ({ ...prev, [groupId]: "" }));
        loadData(regNo);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to share material to group.");
    }
  };

  // Presence Check-In Handler
  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const res = await checkIn(regNo, floor);
      if (res.success) {
        setPresence(res.presence);
        setNotifications((prev) =>
          prev.filter((n) => n.type !== "presence-ping" && !n.message?.toLowerCase().includes("still in"))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingIn(false);
    }
  };

  // Presence Check-Out Handler
  const handleCheckOut = async () => {
    setCheckingIn(true);
    try {
      const res = await checkOut(regNo);
      if (res.success) {
        setPresence(res.presence || { regNo, isActive: false, pendingPing: false });
        setNotifications((prev) =>
          prev.filter((n) => n.type !== "presence-ping" && !n.message?.toLowerCase().includes("still in"))
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingIn(false);
    }
  };

  // Presence Ping Response Handler
  const handlePingResponse = async (stillHere, notifId = null) => {
    setPresence((prev) =>
      prev ? { ...prev, pendingPing: false, isActive: Boolean(stillHere) } : null
    );
    setNotifications((prev) =>
      prev.filter((n) => n._id !== notifId && n.type !== "presence-ping" && !n.message?.toLowerCase().includes("still in"))
    );

    try {
      await respondToPing(regNo, stillHere);
      if (notifId) {
        await dismissNotification(notifId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Dismiss regular notification
  const handleDismissNotif = async (notifId) => {
    setNotifications((prev) => prev.filter((n) => n._id !== notifId));
    if (notifId) {
      try {
        await dismissNotification(notifId);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const hasPendingPresencePing = Boolean(presence && presence.pendingPing);

  const displayNotifications = notifications.filter((n) => {
    const isPing = n.type === "presence-ping" || n.message?.toLowerCase().includes("still in");
    if (isPing && hasPendingPresencePing) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans text-left">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Top Header */}
          <div className="relative flex items-center justify-center py-3 sm:py-4">
            {/* Centered Heading Block */}
            <div className="text-center px-12 sm:px-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Student Hub &amp; Services</span>
              </div>
              <h1 className="text-[2.25rem] sm:text-[2.85rem] font-extrabold tracking-tight leading-tight">
                <span className="heading-gradient">Student Profile</span>
              </h1>
            </div>

            {/* Refresh Button on Far Right */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <button
                type="button"
                onClick={() => loadData(regNo)}
                className="btn-secondary p-2.5 cursor-pointer"
                title="Refresh Profile Data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications & Presence Alerts Banner */}
          {(hasPendingPresencePing || displayNotifications.length > 0) && (
            <div className="space-y-3">
              {hasPendingPresencePing && (
                <div className="bg-amber-950/50 border border-amber-500/50 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200 shadow-lg shadow-amber-950/20">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <h3 className="font-bold text-sm text-white">Library Presence Verification</h3>
                      <p className="text-xs text-amber-300/90">Are you still in the library ({presence.floor})?</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handlePingResponse(true)}
                      className="btn-success text-xs py-1.5 px-3.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Yes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePingResponse(false)}
                      className="btn-danger text-xs py-1.5 px-3.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>No</span>
                    </button>
                  </div>
                </div>
              )}

              {displayNotifications.map((notif) => {
                const isPing = notif.type === "presence-ping" || notif.message?.toLowerCase().includes("still in");
                return (
                  <div
                    key={notif._id || notif.message}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs sm:text-sm ${
                      isPing
                        ? "bg-amber-950/50 border-amber-500/50 text-amber-200"
                        : "bg-indigo-950/40 border-indigo-500/40 text-indigo-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Bell className={`w-4 h-4 shrink-0 ${isPing ? "text-amber-400" : "text-indigo-400"}`} />
                      <span className="font-medium">{notif.message}</span>
                    </div>

                    {isPing ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handlePingResponse(true, notif._id)}
                          className="btn-success text-xs py-1 px-2.5"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePingResponse(false, notif._id)}
                          className="btn-danger text-xs py-1 px-2.5"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] text-indigo-400/80 font-mono hidden sm:inline">
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDismissNotif(notif._id)}
                          className="text-slate-400 hover:text-white p-1 cursor-pointer"
                          title="Dismiss"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
            </div>
          ) : error || !profile ? (
            <div className="app-card p-8 text-center text-red-300 text-sm">
              {error || "Profile not found."}
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Primary Profile & Borrow/Presence Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Personal Info & Library Presence */}
                <div className="space-y-6">
                  
                  {/* Personal Details Card */}
                  <div className="app-card-container p-6 space-y-4">
                    <div className="flex items-center gap-3.5 pb-4 border-b border-slate-800">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/20">
                        <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-extrabold text-lg text-white">
                          {profile.name ? profile.name.charAt(0).toUpperCase() : "S"}
                        </div>
                      </div>
                      <div>
                        <h2 className="font-bold text-lg text-white leading-tight">{profile.name}</h2>
                        <span className="badge-code mt-1 inline-block">
                          {profile.regNo}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5 text-xs sm:text-sm">
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400">Department</span>
                        <span className="text-slate-200 font-semibold">{profile.department}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                        <span className="text-slate-400">Academic Year</span>
                        <span className="text-slate-200 font-semibold">{profile.year}</span>
                      </div>
                      <div className="flex justify-between py-1.5">
                        <span className="text-slate-400">Student Email</span>
                        <span className="text-slate-200 font-medium truncate max-w-[180px]">{profile.email}</span>
                      </div>
                    </div>
                  </div>

                  {/* Presence Feature Card */}
                  <div className="app-card-container p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                        <MapPin className="w-4 h-4" />
                        <span>Library Presence</span>
                      </div>
                      {presence && presence.isActive ? (
                        <span className="badge-success flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          Active
                        </span>
                      ) : (
                        <span className="badge-tag">
                          Not Checked-In
                        </span>
                      )}
                    </div>

                    {presence && presence.isActive && (
                      <div className="bg-slate-950/70 p-3.5 rounded-xl text-xs space-y-1 border border-slate-800">
                        <p className="text-slate-300">
                          <span className="text-slate-500">Location:</span> <strong className="text-white">{presence.floor}</strong>
                        </p>
                        <p className="text-slate-500">
                          Checked in: {new Date(presence.checkinTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    )}

                    <div className="space-y-3 pt-1">
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Select Library Floor / Zone:
                      </label>
                      <select
                        value={floor}
                        onChange={(e) => setFloor(e.target.value)}
                        className="app-select w-full"
                      >
                        <option value="First Floor">First Floor</option>
                        <option value="Second Floor">Second Floor</option>
                        <option value="Reading Room">Reading Room</option>
                        <option value="Discussion Room">Discussion Room</option>
                        <option value="Study Room">Study Room</option>
                        <option value="Reference Room">Reference Room</option>
                      </select>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleCheckIn}
                          disabled={checkingIn}
                          className="btn-primary flex-1 py-2.5 text-xs cursor-pointer"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>{checkingIn ? "Updating..." : (presence && presence.isActive ? "Change Zone" : "I'm in the Library (Check-In)")}</span>
                        </button>

                        {presence && presence.isActive && (
                          <button
                            type="button"
                            onClick={handleCheckOut}
                            disabled={checkingIn}
                            className="btn-secondary py-2.5 px-3 text-xs cursor-pointer text-rose-400 hover:text-rose-300 hover:border-rose-500/40 flex items-center gap-1.5"
                            title="Check out and leave library"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Leave</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Right Column: Borrowed Books & Fine Payment */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Borrowed Books & Fine Payment Card */}
                  <div className="app-card-container p-6 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                      <div className="flex items-center gap-2 text-indigo-400 font-bold">
                        <BookOpen className="w-5 h-5" />
                        <span>Currently Borrowed Books ({profile.borrowedBooks ? profile.borrowedBooks.length : 0})</span>
                      </div>

                      {/* Total Fine & Pay Fine Button */}
                      <div className="flex items-center gap-4 bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800">
                        <div>
                          <span className="text-[11px] text-slate-400 block font-medium">Total Fine Due</span>
                          <span className="text-lg font-extrabold text-emerald-400 font-mono">₹{profile.totalDue || 0}</span>
                        </div>

                        <button
                          type="button"
                          onClick={handlePayFine}
                          disabled={!profile.totalDue || profile.totalDue <= 0 || paymentLoading}
                          className={`text-xs py-2 px-4 font-semibold transition flex items-center gap-2 ${
                            profile.totalDue > 0
                              ? "btn-success cursor-pointer shadow-lg shadow-emerald-500/20"
                              : "bg-slate-800 text-slate-500 border border-slate-700/60 rounded-xl cursor-not-allowed opacity-60"
                          }`}
                        >
                          {paymentLoading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Processing...</span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-4 h-4" />
                              <span>{profile.totalDue > 0 ? "Pay Fine" : "Paid"}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Payment Feedback Banner */}
                    {paymentMsg && (
                      <div
                        className={`text-xs p-3.5 rounded-xl border font-medium flex items-center gap-2 ${
                          paymentStatusType === "success"
                            ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                            : paymentStatusType === "error"
                            ? "bg-red-950/60 border-red-500/40 text-red-300"
                            : "bg-slate-900 border-slate-700 text-slate-300"
                        }`}
                      >
                        {paymentStatusType === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                        {paymentStatusType === "error" && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
                        <span>{paymentMsg}</span>
                      </div>
                    )}

                    {/* Books List */}
                    {!profile.borrowedBooks || profile.borrowedBooks.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-sm">
                        No active borrowed books on record.
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-800">
                        {profile.borrowedBooks.map((book) => {
                          const isOverdue = isBookOverdue(book.dueDate, book.returnedDate);
                          const isReturned = Boolean(book.returnedDate);
                          const isPaid = Boolean(book.isPaid || book.finePaid || book.paidDate);
                          const fineAmount = Number(book.fineAmount) || 0;

                          return (
                            <div key={book._id || book.bookId} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <h4 className="font-bold text-white text-sm sm:text-base">{book.title}</h4>
                              </div>

                              <div className="flex items-center gap-2 sm:gap-3 text-xs flex-wrap">
                                <div className="flex items-center gap-1.5 text-slate-400">
                                  <Clock className="w-3.5 h-3.5 text-indigo-400" />
                                  <span>Due: <strong className="text-slate-200">{formatDueDate(book.dueDate)}</strong></span>
                                </div>

                                {isReturned ? (
                                  <>
                                    <span className="badge-tag">Returned</span>
                                    {isPaid && <span className="badge-success font-mono">Fine Paid</span>}
                                    {!isPaid && fineAmount > 0 && (
                                      <span className="badge-warning font-mono">Fine: ₹{fineAmount}</span>
                                    )}
                                  </>
                                ) : isOverdue ? (
                                  <>
                                    <span className="badge-danger">Overdue</span>
                                    {isPaid ? (
                                      <span className="badge-success font-mono">Fine Paid</span>
                                    ) : fineAmount > 0 ? (
                                      <span className="badge-warning font-mono">Fine: ₹{fineAmount}</span>
                                    ) : null}
                                  </>
                                ) : (
                                  <span className="badge-success">On Schedule</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>

              </div>

              {/* Compact Entry Card: Private Study & Material Sharing */}
              <div className="app-card-container p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 border border-slate-800 hover:border-purple-500/30 transition shadow-lg shadow-black/20">
                <div className="flex items-start sm:items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center shrink-0 text-purple-400 shadow-md shadow-purple-500/10">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-white text-base sm:text-lg">Private Study &amp; Material Sharing</h3>
                      <span className="badge-tag text-[10px] font-mono text-purple-300 border-purple-500/30 bg-purple-500/10">
                        Private Space
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
                      Collaborate privately with study groups, manage peer members, and share course study materials securely.
                    </p>

                    {/* Active Group Names */}
                    {groups.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap pt-1">
                        <span className="text-xs text-slate-400 font-medium">Your Groups:</span>
                        {groups.slice(0, 3).map((g) => (
                          <span
                            key={g._id}
                            className="badge-tag text-xs font-semibold text-purple-300 border-purple-500/30 bg-purple-950/40"
                          >
                            {g.name || "Study Group"}
                          </span>
                        ))}
                        {groups.length > 3 && (
                          <span className="text-[11px] text-slate-400 font-mono">+{groups.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <Link
                  to="/private-space"
                  className="btn-primary text-xs sm:text-sm py-2.5 px-5 font-semibold shrink-0 flex items-center justify-center gap-2 group cursor-pointer shadow-lg shadow-indigo-500/20"
                >
                  <span>Open Private Space</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* =========================================================================
         ============= RAZORPAY TEST MODE PAYMENT RECEIPT MODAL ===================
         ========================================================================= */}
      {paymentReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          {/* Backdrop Click */}
          <div className="fixed inset-0" onClick={handleCloseReceiptModal}></div>

          <div className="relative z-10 w-full max-w-lg app-card-container p-6 sm:p-7 shadow-2xl border border-slate-700/80 space-y-6">
            <div className="space-y-5 animate-fadeIn">
              {/* Success Icon & Header */}
              <div className="text-center space-y-2 pt-2">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/20">
                  <Check className="w-8 h-8 stroke-[3]" />
                </div>
                <h3 className="font-extrabold text-white text-xl">Payment Successful</h3>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Razorpay Test Mode Verified</span>
                </div>
              </div>

              {/* Receipt Details Card */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-slate-900">
                  <span className="text-slate-400">Amount Paid:</span>
                  <span className="text-xl font-extrabold text-emerald-400 font-mono">₹{paymentReceipt.amountPaid}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Student Name:</span>
                  <span className="font-semibold text-white">{paymentReceipt.studentName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Register Number:</span>
                  <span className="font-mono text-slate-200">{paymentReceipt.regNo}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Razorpay Payment ID:</span>
                  <span className="font-mono text-indigo-400 font-semibold">{paymentReceipt.transactionId}</span>
                </div>
                {paymentReceipt.orderId && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Razorpay Order ID:</span>
                    <span className="font-mono text-slate-300 font-semibold">{paymentReceipt.orderId}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Payment Method:</span>
                  <span className="text-slate-200 font-medium capitalize">{paymentReceipt.paymentMethod}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Date &amp; Time:</span>
                  <span className="text-slate-300 font-mono text-[11px]">{paymentReceipt.timestamp}</span>
                </div>
              </div>

              {/* Done Button */}
              <button
                type="button"
                onClick={handleCloseReceiptModal}
                className="btn-primary w-full py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/20"
              >
                <span>Done</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

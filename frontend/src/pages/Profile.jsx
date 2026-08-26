import React, { useState, useEffect } from "react";
import {
  getProfile,
  createPaymentOrder,
  verifyPayment,
  createGroup,
  getGroups,
  shareToGroup,
  checkIn,
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
  ExternalLink,
} from "lucide-react";
import Navbar from "../components/Navbar";

export default function Profile() {
  const authUser = JSON.parse(localStorage.getItem("user") || "{}");
  const defaultRegNo = authUser.regNo || localStorage.getItem("regNo") || "2025503560";

  const [regNo, setRegNo] = useState(defaultRegNo);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Cashfree Payment Gateway State
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState("SUCCESS"); // "PROCESSING" | "SUCCESS"
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

  // Handle return from redirect checkout if ?order_id is in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderIdParam = params.get("order_id");
    if (orderIdParam) {
      window.history.replaceState({}, document.title, window.location.pathname);
      handleVerifyOrder(orderIdParam);
    }
  }, []);

  // Helper to load Cashfree JS SDK v3
  const loadCashfreeSdk = () => {
    return new Promise((resolve, reject) => {
      if (typeof window.Cashfree === "function") {
        return resolve(window.Cashfree);
      }
      const existingScript = document.getElementById("cashfree-js-sdk");
      if (existingScript) {
        existingScript.onload = () => resolve(window.Cashfree);
        return;
      }
      const script = document.createElement("script");
      script.id = "cashfree-js-sdk";
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.async = true;
      script.onload = () => resolve(window.Cashfree);
      script.onerror = () => reject(new Error("Failed to load Cashfree Checkout SDK script"));
      document.head.appendChild(script);
    });
  };

  // Cashfree Order Verification
  const handleVerifyOrder = async (orderId) => {
    setPaymentLoading(true);
    setPaymentMsg("Verifying payment status with Cashfree Sandbox...");
    setPaymentStatusType("info");

    try {
      const res = await verifyPayment(orderId, regNo);
      if (res.success && res.isPaid) {
        const receiptData = {
          studentName: profile?.name || authUser.name || "Student",
          regNo: regNo,
          amountPaid: res.amount || profile?.totalDue || 0,
          transactionId: res.transactionId || `CF-${orderId}`,
          paymentMethod: res.paymentMethod || "Cashfree Sandbox",
          timestamp: new Date().toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          }),
        };

        setPaymentReceipt(receiptData);
        setPaymentStep("SUCCESS");
        setPaymentModalOpen(true);
        setPaymentStatusType("success");
        setPaymentMsg("Payment verified! Your outstanding fine has been cleared.");
        loadData(regNo);
      } else {
        setPaymentStatusType("error");
        setPaymentMsg(
          res.message || "Payment was not completed. Your outstanding fine remains unchanged."
        );
        loadData(regNo);
      }
    } catch (err) {
      console.error("Payment verification failed:", err);
      setPaymentStatusType("error");
      setPaymentMsg(
        err.response?.data?.message || "Failed to verify payment with Cashfree. Fine remains unchanged."
      );
    } finally {
      setPaymentLoading(false);
    }
  };

  // Initiate Cashfree Sandbox Payment Flow
  const handlePayFineWithCashfree = async () => {
    if (!profile || profile.totalDue <= 0) return;
    setPaymentLoading(true);
    setPaymentMsg("");
    setPaymentStatusType("info");

    try {
      // 1. Call Backend to create Cashfree Order & get paymentSessionId
      const res = await createPaymentOrder(regNo, profile.totalDue, {
        name: profile.name,
        email: profile.email,
        phone: profile.phone || "9876543210",
      });

      if (!res.success || !res.paymentSessionId) {
        setPaymentStatusType("error");
        setPaymentMsg(
          res.message || "Could not initialize Cashfree payment. Please check backend configuration."
        );
        setPaymentLoading(false);
        return;
      }

      console.log("[Cashfree Sandbox] Order Created:", res.orderId, "PaymentSession:", res.paymentSessionId);

      // 2. Load and Initialize Cashfree SDK v3
      const CashfreeSDK = await loadCashfreeSdk();
      const cashfree = CashfreeSDK({
        mode: (res.environment || "SANDBOX").toLowerCase(),
      });

      // 3. Open Cashfree Hosted/Modal Checkout
      const checkoutOptions = {
        paymentSessionId: res.paymentSessionId,
        redirectTarget: "_modal",
      };

      setPaymentLoading(false);

      cashfree.checkout(checkoutOptions).then(async (result) => {
        console.log("[Cashfree Checkout Result]", result);

        if (result.error) {
          console.error("Cashfree SDK Checkout Error:", result.error);
          setPaymentStatusType("error");
          setPaymentMsg(result.error.message || "Payment cancelled or encountered an error.");
          return;
        }

        if (result.redirect) {
          console.log("Payment will be redirected...");
          return;
        }

        // When checkout closes / completes in modal, verify with backend
        await handleVerifyOrder(res.orderId);
      });
    } catch (err) {
      console.error("Cashfree Checkout Init Error:", err);
      setPaymentLoading(false);
      setPaymentStatusType("error");
      setPaymentMsg(
        err.response?.data?.message ||
          err.message ||
          "Failed to initiate Cashfree payment. Please ensure CASHFREE_APP_ID & CASHFREE_SECRET_KEY are configured."
      );
    }
  };

  // Close Payment Modal
  const handleClosePaymentModal = () => {
    setPaymentModalOpen(false);
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

  // Handle Presence Ping Prompt Response
  const handlePingResponse = async (notifId, stillHere) => {
    try {
      const res = await respondToPing(regNo, stillHere);
      if (res.success) {
        setPresence(res.presence);
        if (notifId) {
          await dismissNotification(notifId);
        }
        setNotifications((prev) => prev.filter((n) => n._id !== notifId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Dismiss regular notification
  const handleDismissNotif = async (notifId) => {
    try {
      await dismissNotification(notifId);
      setNotifications((prev) => prev.filter((n) => n._id !== notifId));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Student Profile &amp; Library Services</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              My <span className="heading-gradient">Account</span>
            </h1>
            <p className="text-sm text-slate-400">
              Manage your library borrowings, payments, study groups, and active presence
            </p>
          </div>

          <button
            onClick={() => loadData(regNo)}
            disabled={loading}
            className="btn-secondary self-start md:self-auto flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Global Loading / Error State */}
        {loading && !profile && (
          <div className="text-center py-20 space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-400 text-sm">Loading your student records...</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-800/60 text-red-200 text-xs sm:text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {profile && (
          <div className="space-y-8">

            {/* In-Web Notifications Feed */}
            {notifications.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                  <Bell className="w-4 h-4" />
                  <span>Important Alerts ({notifications.length})</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {notifications.map((n) => (
                    <div
                      key={n._id}
                      className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs sm:text-sm transition ${
                        n.type === "presence-ping" || n.message?.toLowerCase().includes("still in")
                          ? "bg-indigo-950/40 border-indigo-500/40 text-indigo-200"
                          : "bg-amber-950/40 border-amber-500/30 text-amber-200"
                      }`}
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 text-indigo-400" />
                          <p className="font-semibold text-white">{n.message}</p>
                        </div>

                        {/* Interactive Presence Ping Response Buttons */}
                        {(n.type === "presence-ping" || n.message?.toLowerCase().includes("still in")) && (
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handlePingResponse(n._id, true)}
                              className="btn-success py-1 px-3 text-xs cursor-pointer"
                            >
                              Yes, I'm here
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePingResponse(n._id, false)}
                              className="btn-danger py-1 px-3 text-xs cursor-pointer"
                            >
                              No, I left
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDismissNotif(n._id)}
                        className="text-slate-400 hover:text-slate-200 p-1"
                        title="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
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

                    <button
                      type="button"
                      onClick={handleCheckIn}
                      disabled={checkingIn}
                      className="btn-primary w-full py-2.5 text-xs cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>{checkingIn ? "Checking in..." : "I'm in the Library (Check-In)"}</span>
                    </button>
                  </div>
                </div>

              </div>

              {/* Right Column: Borrowed Books, Fine Payment & Groups */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Borrowed Books & Fine Payment Card */}
                <div className="app-card-container p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2 text-indigo-400 font-bold">
                      <BookOpen className="w-5 h-5" />
                      <span>Currently Borrowed Books ({profile.borrowedBooks ? profile.borrowedBooks.length : 0})</span>
                    </div>

                    {/* Total Fine & Cashfree Pay Fine Button */}
                    <div className="flex items-center gap-4 bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Total Fine Due</span>
                        <span className="text-lg font-extrabold text-emerald-400 font-mono">₹{profile.totalDue || 0}</span>
                      </div>

                      <button
                        type="button"
                        onClick={handlePayFineWithCashfree}
                        disabled={!profile.totalDue || profile.totalDue <= 0 || paymentLoading}
                        className={`text-xs py-2 px-4 font-semibold transition flex items-center gap-2 ${
                          profile.totalDue > 0
                            ? "btn-success cursor-pointer shadow-lg shadow-emerald-500/20"
                            : "bg-slate-800 text-slate-500 border border-slate-700/60 rounded-xl cursor-not-allowed opacity-60"
                        }`}
                      >
                        {paymentLoading ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            <span>Connecting...</span>
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
                          : "bg-indigo-950/60 border-indigo-500/40 text-indigo-300"
                      }`}
                    >
                      {paymentStatusType === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                      {paymentStatusType === "error" && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
                      {paymentStatusType === "info" && <RefreshCw className="w-4 h-4 text-indigo-400 shrink-0 animate-spin" />}
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
                      {profile.borrowedBooks.map((book) => (
                        <div key={book._id || book.bookId} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <h4 className="font-bold text-white text-sm sm:text-base">{book.title}</h4>
                            <span className="badge-code text-[11px] mt-1 inline-block">ID: {book.bookId}</span>
                          </div>

                          <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1.5 text-slate-400">
                              <Clock className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Due: <strong className="text-slate-200">{new Date(book.dueDate).toLocaleDateString()}</strong></span>
                            </div>
                            {book.fineAmount > 0 ? (
                              <span className="badge-warning font-mono">Fine: ₹{book.fineAmount}</span>
                            ) : (
                              <span className="badge-success">On Schedule</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Private / Study Groups Card */}
                <div className="app-card-container p-6 space-y-5">
                  <div className="flex items-center gap-2 text-purple-400 font-bold pb-4 border-b border-slate-800">
                    <Users className="w-5 h-5" />
                    <span>Private Study &amp; Material Sharing Groups</span>
                  </div>

                  {/* Create Group Form */}
                  <form onSubmit={handleCreateGroup} className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                    <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Create New Study Group</h4>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        type="text"
                        value={newMemberRegNos}
                        onChange={(e) => setNewMemberRegNos(e.target.value)}
                        placeholder="Enter peer reg numbers (e.g. 2025503561, 2025503562)"
                        className="app-input text-xs"
                      />
                      <button
                        type="submit"
                        className="btn-primary text-xs shrink-0 py-2 cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4" />
                        <span>Create Group</span>
                      </button>
                    </div>
                    {groupMsg && <p className="text-xs text-emerald-400 font-medium">{groupMsg}</p>}
                  </form>

                  {/* List of Groups */}
                  <div className="space-y-4">
                    {groups.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-4">No active study groups. Create one above to share resources privately.</p>
                    ) : (
                      groups.map((group) => (
                        <div key={group._id} className="app-card space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="badge-code">
                                Owner: {group.ownerRegNo}
                              </span>
                              <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                                <span className="text-slate-400 text-xs">Members:</span>
                                {group.members.map((m) => (
                                  <span key={m} className="badge-tag text-[11px] font-mono">
                                    {m}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Share Material into Group */}
                          <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row items-center gap-2">
                            <input
                              type="text"
                              placeholder="Paste Material ID (e.g. 64b8f...)"
                              value={shareMaterialIds[group._id] || ""}
                              onChange={(e) =>
                                setShareMaterialIds({
                                  ...shareMaterialIds,
                                  [group._id]: e.target.value,
                                })
                              }
                              className="app-input text-xs py-1.5 flex-1"
                            />
                            <button
                              type="button"
                              onClick={() => handleShareMaterial(group._id)}
                              className="btn-secondary text-xs py-1.5 px-3 w-full sm:w-auto flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Share Material</span>
                            </button>
                          </div>

                          {/* Shared Materials in Group */}
                          {group.materials && group.materials.length > 0 && (
                            <div className="pt-2 space-y-1.5">
                              <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">Shared Resources:</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {group.materials.map((mat) => (
                                  <div key={mat._id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                                    <span className="text-slate-200 font-medium truncate max-w-[160px]">{mat.title}</span>
                                    <a
                                      href={mat.fileUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-indigo-400 hover:text-indigo-300 font-semibold"
                                    >
                                      View
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}

      </main>

      {/* Cashfree Payment Verified Success Modal */}
      {paymentModalOpen && paymentReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 space-y-5 shadow-2xl relative">
            
            <div className="text-center space-y-2 pt-2">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/20">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <h3 className="font-extrabold text-white text-xl">Payment Successful</h3>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
                <span>Verified by Cashfree Sandbox</span>
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
                <span className="text-slate-400">Transaction ID:</span>
                <span className="font-mono text-indigo-400 font-semibold">{paymentReceipt.transactionId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Payment Gateway:</span>
                <span className="text-slate-200 font-medium">{paymentReceipt.paymentMethod}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Date &amp; Time:</span>
                <span className="text-slate-300 font-mono text-[11px]">{paymentReceipt.timestamp}</span>
              </div>
            </div>

            {/* Done Button */}
            <button
              type="button"
              onClick={handleClosePaymentModal}
              className="btn-primary w-full py-3 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-500/20"
            >
              <span>Done</span>
              <ArrowRight className="w-4 h-4" />
            </button>

          </div>
        </div>
      )}

    </div>
  );
}

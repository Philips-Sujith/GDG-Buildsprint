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
} from "lucide-react";
import Navbar from "../components/Navbar";

export default function Profile() {
  const authUser = JSON.parse(localStorage.getItem("user") || "{}");
  const defaultRegNo = authUser.regNo || localStorage.getItem("regNo") || "2025503560";

  const [regNo, setRegNo] = useState(defaultRegNo);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Demo Payment Gateway State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentStep, setPaymentStep] = useState("SELECT_METHOD"); // "SELECT_METHOD" | "PROCESSING" | "SUCCESS"
  const [paymentMethod, setPaymentMethod] = useState("UPI"); // "UPI" | "CARD" | "NETBANKING"
  const [upiId, setUpiId] = useState("student@upi");
  const [cardNumber, setCardNumber] = useState("4532 8920 1142 8821");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvv, setCardCvv] = useState("842");
  const [cardHolder, setCardHolder] = useState("");
  const [selectedBank, setSelectedBank] = useState("State Bank of India (SBI)");
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
        setCardHolder(profileData.value.name || "Student Name");
        setUpiId(`${studentRegNo.toLowerCase()}@upi`);
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

  // Open Demo Payment Modal
  const handleOpenPaymentModal = () => {
    if (!profile || profile.totalDue <= 0) return;
    setPaymentStep("SELECT_METHOD");
    setPaymentMsg("");
    setPaymentModalOpen(true);
  };

  // Close Payment Modal & Refresh
  const handleClosePaymentModal = () => {
    setPaymentModalOpen(false);
    setPaymentStep("SELECT_METHOD");
    setPaymentReceipt(null);
    loadData(regNo);
  };

  // Process Demo Payment
  const handleProcessPayment = async () => {
    if (!profile || profile.totalDue <= 0) return;
    setPaymentStep("PROCESSING");

    const amountToPay = profile.totalDue;
    const cleanRegNo = regNo.replace(/[^a-zA-Z0-9]/g, "");
    const orderId = `DEMO_ORDER_${cleanRegNo}_${Date.now()}`;
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const txnId = `DEMO-TXN-${dateStr}-${randomSuffix}`;

    try {
      // Short realistic delay (1.2s) for smooth processing animation
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Call backend API to record payment and clear fine in MongoDB
      const res = await verifyPayment(orderId, regNo, paymentMethod, txnId, amountToPay);

      if (res.success && res.isPaid) {
        const receiptData = {
          studentName: profile.name,
          regNo: regNo,
          amountPaid: amountToPay,
          transactionId: res.transactionId || txnId,
          paymentMethod:
            paymentMethod === "UPI"
              ? `UPI (${upiId || "student@upi"})`
              : paymentMethod === "CARD"
              ? `Card (•••• ${cardNumber.slice(-4)})`
              : `Net Banking (${selectedBank})`,
          timestamp: new Date().toLocaleString("en-US", {
            dateStyle: "medium",
            timeStyle: "short",
          }),
        };

        setPaymentReceipt(receiptData);
        setPaymentStep("SUCCESS");
        setPaymentStatusType("success");
        setPaymentMsg("Payment successful. Your outstanding fine has been cleared.");
      } else {
        setPaymentStep("SELECT_METHOD");
        setPaymentStatusType("error");
        setPaymentMsg("Payment processing failed. Please try again.");
      }
    } catch (err) {
      console.error("Demo Payment Error:", err);
      setPaymentStep("SELECT_METHOD");
      setPaymentStatusType("error");
      setPaymentMsg("Payment failed. Your fine has not been changed.");
    }
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

          {/* Top Header & Student RegNo Switcher */}
          <div className="app-card-container p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Student Hub &amp; Services</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Student <span className="heading-gradient">Profile</span>
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Viewing Reg No:</span>
              <div className="relative">
                <input
                  type="text"
                  value={regNo}
                  onChange={(e) => setRegNo(e.target.value)}
                  className="app-input font-mono text-xs sm:text-sm uppercase w-36 sm:w-44 py-2"
                  placeholder="2025503560"
                />
              </div>
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

                    {/* Total Fine & Pay Fine Button */}
                    <div className="flex items-center gap-4 bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Total Fine Due</span>
                        <span className="text-lg font-extrabold text-emerald-400 font-mono">₹{profile.totalDue || 0}</span>
                      </div>

                      <button
                        type="button"
                        onClick={handleOpenPaymentModal}
                        disabled={!profile.totalDue || profile.totalDue <= 0}
                        className={`text-xs py-2 px-4 font-semibold transition flex items-center gap-2 ${
                          profile.totalDue > 0
                            ? "btn-success cursor-pointer shadow-lg shadow-emerald-500/20"
                            : "bg-slate-800 text-slate-500 border border-slate-700/60 rounded-xl cursor-not-allowed opacity-60"
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>{profile.totalDue > 0 ? "Pay Fine" : "Paid"}</span>
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
                                <span className="text-xs text-slate-400">Members:</span>
                                {group.memberRegNos.map((m) => (
                                  <span key={m} className="badge-tag font-mono">
                                    {m}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Shared Materials */}
                          <div className="space-y-1.5 pt-1">
                            <span className="text-xs font-medium text-slate-400 block">Shared Study Resources:</span>
                            {group.sharedMaterialIds.length === 0 ? (
                              <p className="text-xs text-slate-600 italic">No resources shared yet.</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {group.sharedMaterialIds.map((matId, idx) => (
                                  <span
                                    key={idx}
                                    className="badge-tag flex items-center gap-1.5 font-mono text-indigo-300"
                                  >
                                    <BookOpen className="w-3 h-3 text-indigo-400" />
                                    {matId}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Share Material Input */}
                          <div className="flex gap-2 pt-2 border-t border-slate-800">
                            <input
                              type="text"
                              placeholder="Enter Material ID / Document Code to share"
                              value={shareMaterialIds[group._id] || ""}
                              onChange={(e) =>
                                setShareMaterialIds({ ...shareMaterialIds, [group._id]: e.target.value })
                              }
                              className="app-input text-xs py-1.5"
                            />
                            <button
                              type="button"
                              onClick={() => handleShareMaterial(group._id)}
                              className="btn-secondary text-xs py-1.5 px-3 cursor-pointer"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                              <span>Share</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>
      </main>

      {/* =========================================================================
         ============= PROFESSIONAL DEMO PAYMENT GATEWAY MODAL ===================
         ========================================================================= */}
      {paymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          {/* Backdrop Click */}
          <div className="fixed inset-0" onClick={paymentStep !== "PROCESSING" ? handleClosePaymentModal : undefined}></div>

          <div className="relative z-10 w-full max-w-lg app-card-container p-6 sm:p-7 shadow-2xl border border-slate-700/80 space-y-6">

            {/* Step 1: Select Payment Method & Enter Demo Details */}
            {paymentStep === "SELECT_METHOD" && (
              <>
                {/* Modal Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-extrabold shadow-lg shadow-emerald-500/20">
                      ₹
                    </div>
                    <div>
                      <h3 className="font-extrabold text-white text-lg leading-tight">Pay Library Fine</h3>
                      <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold mt-0.5">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Demo Payment Gateway</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClosePaymentModal}
                    className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Student & Fine Details Card */}
                <div className="bg-slate-950/90 p-4 rounded-xl border border-slate-800/90 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Student Name:</span>
                    <span className="font-semibold text-white">{profile.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Register Number:</span>
                    <span className="font-mono text-indigo-300 font-semibold">{profile.regNo}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2.5 border-t border-slate-800">
                    <span className="text-sm font-bold text-slate-200">Outstanding Fine Amount:</span>
                    <span className="text-2xl font-extrabold text-emerald-400 font-mono">₹{profile.totalDue}</span>
                  </div>
                </div>

                {/* Payment Method Selector Tabs */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Choose Payment Method
                  </span>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("UPI")}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition text-xs font-semibold cursor-pointer ${
                        paymentMethod === "UPI"
                          ? "bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                      }`}
                    >
                      <Smartphone className={`w-5 h-5 ${paymentMethod === "UPI" ? "text-indigo-400" : "text-slate-400"}`} />
                      <span>UPI</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("CARD")}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition text-xs font-semibold cursor-pointer ${
                        paymentMethod === "CARD"
                          ? "bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                      }`}
                    >
                      <CreditCard className={`w-5 h-5 ${paymentMethod === "CARD" ? "text-indigo-400" : "text-slate-400"}`} />
                      <span>Debit/Credit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("NETBANKING")}
                      className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition text-xs font-semibold cursor-pointer ${
                        paymentMethod === "NETBANKING"
                          ? "bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10"
                          : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                      }`}
                    >
                      <Building2 className={`w-5 h-5 ${paymentMethod === "NETBANKING" ? "text-indigo-400" : "text-slate-400"}`} />
                      <span>Net Banking</span>
                    </button>
                  </div>
                </div>

                {/* Payment Method Specific Inputs */}
                <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
                  {paymentMethod === "UPI" && (
                    <div className="space-y-2">
                      <label className="block text-slate-300 font-medium">Virtual Payment Address (VPA / UPI ID):</label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="student@upi"
                        className="app-input text-xs font-mono"
                      />
                      <div className="flex gap-2 pt-1">
                        <span className="badge-tag">Google Pay</span>
                        <span className="badge-tag">PhonePe</span>
                        <span className="badge-tag">Paytm</span>
                        <span className="badge-tag">BHIM UPI</span>
                      </div>
                    </div>
                  )}

                  {paymentMethod === "CARD" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">Card Number:</label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={(e) => setCardNumber(e.target.value)}
                          placeholder="4532 8920 1142 8821"
                          className="app-input text-xs font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-300 font-medium mb-1">Expiry (MM/YY):</label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            placeholder="12/28"
                            className="app-input text-xs font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-300 font-medium mb-1">CVV:</label>
                          <input
                            type="password"
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            placeholder="842"
                            maxLength={4}
                            className="app-input text-xs font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">Cardholder Name:</label>
                        <input
                          type="text"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          placeholder="Student Name"
                          className="app-input text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {paymentMethod === "NETBANKING" && (
                    <div className="space-y-2">
                      <label className="block text-slate-300 font-medium">Select Bank:</label>
                      <select
                        value={selectedBank}
                        onChange={(e) => setSelectedBank(e.target.value)}
                        className="app-select w-full text-xs"
                      >
                        <option value="State Bank of India (SBI)">State Bank of India (SBI)</option>
                        <option value="HDFC Bank">HDFC Bank</option>
                        <option value="ICICI Bank">ICICI Bank</option>
                        <option value="Axis Bank">Axis Bank</option>
                        <option value="Punjab National Bank (PNB)">Punjab National Bank (PNB)</option>
                        <option value="Canara Bank">Canara Bank</option>
                      </select>
                    </div>
                  )}

                  {/* Demo Notice */}
                  <div className="flex items-center gap-2 text-[11px] text-amber-300/90 pt-1">
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Demo Payment &bull; No real money will be charged</span>
                  </div>
                </div>

                {/* Modal Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClosePaymentModal}
                    className="btn-secondary w-1/3 py-2.5 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleProcessPayment}
                    className="btn-success w-2/3 py-2.5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Pay ₹{profile.totalDue}</span>
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Processing State */}
            {paymentStep === "PROCESSING" && (
              <div className="py-12 px-4 text-center space-y-5 animate-fadeIn">
                <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                  <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                  <Lock className="w-6 h-6 text-indigo-400 absolute" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-extrabold text-white text-lg">Processing Payment...</h3>
                  <p className="text-xs text-slate-400">Communicating with Demo Payment Gateway</p>
                  <p className="text-sm font-mono text-emerald-400 font-bold pt-2">₹{profile.totalDue}</p>
                </div>
                <div className="inline-flex items-center gap-2 text-[11px] text-slate-500 bg-slate-900 px-3 py-1.5 rounded-full">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>256-Bit Simulated SSL Encryption</span>
                </div>
              </div>
            )}

            {/* Step 3: Payment Successful Screen */}
            {paymentStep === "SUCCESS" && paymentReceipt && (
              <div className="space-y-5 animate-fadeIn">
                {/* Success Icon & Header */}
                <div className="text-center space-y-2 pt-2">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/20">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>
                  <h3 className="font-extrabold text-white text-xl">Payment Successful</h3>
                  <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
                    <span>Fine Status: Paid</span>
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
                    <span className="text-slate-400">Payment Method:</span>
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
            )}

          </div>
        </div>
      )}

    </div>
  );
}

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
} from "../api/api";
import {
  BookOpen,
  CreditCard,
  Users,
  MapPin,
  Bell,
  CheckCircle,
  AlertCircle,
  PlusCircle,
  Share2,
  Clock,
  UserCheck,
  RefreshCw,
  Search,
} from "lucide-react";

export default function Profile() {
  const [regNo, setRegNo] = useState("REG101");
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Payment State
  const [paying, setPaying] = useState(false);
  const [paymentMsg, setPaymentMsg] = useState("");

  // Group Space State
  const [groups, setGroups] = useState([]);
  const [newMemberRegNos, setNewMemberRegNos] = useState("");
  const [shareMaterialIds, setShareMaterialIds] = useState({});
  const [groupMsg, setGroupMsg] = useState("");

  // Presence State
  const [floor, setFloor] = useState("1st Floor Study Zone");
  const [presence, setPresence] = useState(null);
  const [checkingIn, setCheckingIn] = useState(false);

  // Notifications State
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
        setNotifications(notifsData.value);
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

  // Fine Payment Handler (Cashfree Sandbox)
  const handlePayment = async () => {
    if (!profile || profile.totalDue <= 0) return;
    setPaying(true);
    setPaymentMsg("");

    try {
      const orderRes = await createPaymentOrder(regNo, profile.totalDue);
      if (!orderRes.paymentSessionId) {
        setPaymentMsg("Failed to initiate payment session.");
        setPaying(false);
        return;
      }

      // Check if Cashfree JS SDK is available in window
      if (window.Cashfree) {
        try {
          const cashfree = window.Cashfree({ mode: "sandbox" });
          cashfree
            .checkout({
              paymentSessionId: orderRes.paymentSessionId,
              redirectTarget: "_modal",
            })
            .then(async (result) => {
              if (result.error) {
                setPaymentMsg(`Payment Error: ${result.error.message}`);
              } else {
                await verifyPayment(orderRes.orderId, regNo);
                setPaymentMsg("Payment completed successfully!");
                loadData(regNo);
              }
            });
        } catch (sdkErr) {
          console.warn("Cashfree Modal Error, executing verification fallback:", sdkErr);
          await verifyPayment(orderRes.orderId, regNo);
          setPaymentMsg("Test Payment Sandbox verified successfully!");
          loadData(regNo);
        }
      } else {
        // Fallback for hackathon demo mode if Cashfree script isn't loaded
        const confirmSim = window.confirm(
          `[Cashfree Sandbox Demo]\nSimulate payment of ₹${profile.totalDue} for Order ID: ${orderRes.orderId}?`
        );
        if (confirmSim) {
          await verifyPayment(orderRes.orderId, regNo);
          setPaymentMsg("Test Payment Sandbox verified successfully!");
          loadData(regNo);
        }
      }
    } catch (err) {
      console.error("Payment error:", err);
      setPaymentMsg("Payment processing error.");
    } finally {
      setPaying(false);
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
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingIn(false);
    }
  };

  // Presence Ping Response Handler
  const handlePingResponse = async (stillHere) => {
    try {
      const res = await respondToPing(regNo, stillHere);
      if (res.success) {
        setPresence(res.presence);
        loadData(regNo);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans text-left">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header & Student RegNo Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-800/80 backdrop-blur border border-slate-700 p-5 rounded-2xl shadow-xl">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
              Student Profile Module
            </h1>
            <p className="text-slate-400 text-sm mt-1">Smart Library Platform Hackathon</p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-medium">Switch Student:</span>
            <div className="relative">
              <input
                type="text"
                value={regNo}
                onChange={(e) => setRegNo(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-purple-300 font-mono focus:outline-none focus:border-purple-500 w-32"
                placeholder="REG101"
              />
            </div>
            <button
              onClick={() => loadData(regNo)}
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 p-2 rounded-lg transition"
              title="Refresh Profile Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications & Presence Alerts Banner */}
        {((presence && presence.pendingPing) || notifications.length > 0) && (
          <div className="space-y-3">
            {/* Presence Ping Alert */}
            {presence && presence.pendingPing && (
              <div className="bg-amber-500/10 border border-amber-500/40 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-200 animate-pulse">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-amber-400 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-sm">Library Presence Verification</h3>
                    <p className="text-xs text-amber-300/80">Are you still currently in the library ({presence.floor})?</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePingResponse(true)}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold px-4 py-1.5 rounded-lg text-xs transition"
                  >
                    Yes, I am here
                  </button>
                  <button
                    onClick={() => handlePingResponse(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-lg text-xs transition"
                  >
                    No, I left
                  </button>
                </div>
              </div>
            )}

            {/* In-App Due Date Alerts Banner */}
            {notifications.map((notif, idx) => (
              <div
                key={idx}
                className="bg-indigo-950/60 border border-indigo-500/30 p-3.5 rounded-xl flex items-center justify-between gap-3 text-indigo-200"
              >
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-indigo-400 shrink-0" />
                  <span className="text-sm font-medium">{notif.message}</span>
                </div>
                <span className="text-xs text-indigo-400/70 shrink-0">
                  {new Date(notif.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500"></div>
          </div>
        ) : error || !profile ? (
          <div className="bg-red-900/20 border border-red-500/30 p-6 rounded-2xl text-red-300 text-center">
            {error || "Profile not found."}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Personal Info & Library Presence */}
            <div className="space-y-6">
              {/* Personal Details Card */}
              <div className="bg-slate-800/80 border border-slate-700 p-6 rounded-2xl shadow-lg space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-700">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-lg font-bold text-white shadow-inner">
                    {profile.name ? profile.name.charAt(0) : "S"}
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-white">{profile.name}</h2>
                    <span className="text-xs font-mono bg-purple-900/50 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded">
                      {profile.regNo}
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5 text-sm">
                  <div className="flex justify-between py-1 border-b border-slate-700/50">
                    <span className="text-slate-400">Department</span>
                    <span className="text-slate-200 font-medium">{profile.department}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-700/50">
                    <span className="text-slate-400">Year</span>
                    <span className="text-slate-200 font-medium">{profile.year}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Email</span>
                    <span className="text-slate-200 font-medium truncate max-w-[180px]">{profile.email}</span>
                  </div>
                </div>
              </div>

              {/* Presence Feature Card */}
              <div className="bg-slate-800/80 border border-slate-700 p-6 rounded-2xl shadow-lg space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                    <MapPin className="w-5 h-5" />
                    <span>Library Presence</span>
                  </div>
                  {presence && presence.isActive ? (
                    <span className="flex items-center gap-1.5 text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Active in Library
                    </span>
                  ) : (
                    <span className="text-xs bg-slate-700 text-slate-400 px-2.5 py-1 rounded-full">
                      Not Checked-In
                    </span>
                  )}
                </div>

                {presence && presence.isActive && (
                  <div className="bg-slate-900/60 p-3 rounded-xl text-xs space-y-1 border border-slate-700/50">
                    <p className="text-slate-300">
                      <span className="text-slate-400">Location:</span> {presence.floor}
                    </p>
                    <p className="text-slate-400">
                      Checked in at: {new Date(presence.checkinTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-medium text-slate-300">Select Current Floor/Zone:</label>
                  <select
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="1st Floor Study Zone">1st Floor Study Zone</option>
                    <option value="Reference Section">Reference Section</option>
                    <option value="2nd Floor Silent Reading Room">2nd Floor Silent Reading Room</option>
                    <option value="Digital Resource Centre">Digital Resource Centre</option>
                    <option value="Discussion Room B">Discussion Room B</option>
                  </select>

                  <button
                    onClick={handleCheckIn}
                    disabled={checkingIn}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-md"
                  >
                    <UserCheck className="w-4 h-4" />
                    {checkingIn ? "Checking in..." : "I'm in the Library"}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Borrowed Books, Cashfree Fine Payment, Group Space */}
            <div className="lg:col-span-2 space-y-6">
              {/* Borrowed Books & Fine Payment Section */}
              <div className="bg-slate-800/80 border border-slate-700 p-6 rounded-2xl shadow-lg space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-700">
                  <div className="flex items-center gap-2 text-purple-400 font-semibold">
                    <BookOpen className="w-5 h-5" />
                    <span>Currently Borrowed Books ({profile.borrowedBooks.length})</span>
                  </div>

                  {/* Total Fine & Cashfree Pay Button */}
                  <div className="flex items-center gap-4 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-700">
                    <div>
                      <span className="text-xs text-slate-400 block">Total Fine Due:</span>
                      <span className="text-lg font-bold text-emerald-400">₹{profile.totalDue}</span>
                    </div>

                    <button
                      onClick={handlePayment}
                      disabled={paying || profile.totalDue <= 0}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                        profile.totalDue > 0
                          ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-lg"
                          : "bg-slate-700 text-slate-500 cursor-not-allowed"
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                      {paying ? "Processing..." : "Pay Due Amount"}
                    </button>
                  </div>
                </div>

                {paymentMsg && (
                  <div className="text-xs p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300">
                    {paymentMsg}
                  </div>
                )}

                {/* Books List */}
                {profile.borrowedBooks.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    No active borrowed books or overdue fines.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-700/60">
                    {profile.borrowedBooks.map((book) => (
                      <div key={book._id || book.bookId} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-slate-200 text-sm">{book.title}</h4>
                          <span className="text-xs text-slate-400 font-mono">ID: {book.bookId}</span>
                        </div>

                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1 text-slate-400">
                            <Clock className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Due: {new Date(book.dueDate).toLocaleDateString()}</span>
                          </div>
                          <div className="font-medium text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-md border border-amber-400/20">
                            Fine: ₹{book.fineAmount}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Private/Group Space Card (Materials Sharing Only) */}
              <div className="bg-slate-800/80 border border-slate-700 p-6 rounded-2xl shadow-lg space-y-5">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold pb-3 border-b border-slate-700">
                  <Users className="w-5 h-5" />
                  <span>Private Study & Material Sharing Groups</span>
                </div>

                {/* Create Group Form */}
                <form onSubmit={handleCreateGroup} className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-700/60">
                  <h4 className="text-xs font-semibold text-slate-300">Create New Group</h4>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newMemberRegNos}
                      onChange={(e) => setNewMemberRegNos(e.target.value)}
                      placeholder="Enter friends' reg numbers (e.g. REG102, REG103)"
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      className="bg-purple-600 hover:bg-purple-500 text-white font-medium px-4 py-2 rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <PlusCircle className="w-4 h-4" />
                      Create Group
                    </button>
                  </div>
                  {groupMsg && <p className="text-xs text-emerald-400">{groupMsg}</p>}
                </form>

                {/* List of Groups */}
                <div className="space-y-4">
                  {groups.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-4">No active study groups. Create one above!</p>
                  ) : (
                    groups.map((group) => (
                      <div key={group._id} className="bg-slate-900/80 border border-slate-700 p-4 rounded-xl space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-semibold text-purple-300 bg-purple-950 px-2 py-0.5 rounded border border-purple-500/30">
                              Group Owner: {group.ownerRegNo}
                            </span>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              <span className="text-xs text-slate-400">Members:</span>
                              {group.memberRegNos.map((m) => (
                                <span key={m} className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
                                  {m}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Shared Materials List */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-xs font-medium text-slate-400 block">Shared Materials:</span>
                          {group.sharedMaterialIds.length === 0 ? (
                            <p className="text-xs text-slate-600 italic">No materials shared yet.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {group.sharedMaterialIds.map((matId, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs bg-indigo-950/80 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-md flex items-center gap-1.5 font-mono"
                                >
                                  <BookOpen className="w-3 h-3 text-indigo-400" />
                                  Material #{matId}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Share Material Input */}
                        <div className="flex gap-2 pt-2 border-t border-slate-800">
                          <input
                            type="text"
                            placeholder="Enter Material ID to share"
                            value={shareMaterialIds[group._id] || ""}
                            onChange={(e) =>
                              setShareMaterialIds({ ...shareMaterialIds, [group._id]: e.target.value })
                            }
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          />
                          <button
                            onClick={() => handleShareMaterial(group._id)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            Share
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
    </div>
  );
}

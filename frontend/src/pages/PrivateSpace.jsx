import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  BookOpen,
  Share2,
  PlusCircle,
  ArrowLeft,
  ExternalLink,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Search,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { getGroups, createGroup, shareToGroup, getMaterials } from "../api/api";

export default function PrivateSpace() {
  const authUser = JSON.parse(localStorage.getItem("user") || "{}");
  const regNo = authUser.regNo || localStorage.getItem("regNo") || "2025503560";

  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Catalog of materials for rich lookup
  const [materialsMap, setMaterialsMap] = useState({});

  // Group creation form state
  const [newGroupName, setNewGroupName] = useState("");
  const [newMemberRegNos, setNewMemberRegNos] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createMsg, setCreateMsg] = useState({ text: "", type: "info" });

  // Share material state
  const [shareInput, setShareInput] = useState("");
  const [shareLoading, setShareLoading] = useState(false);
  const [shareMsg, setShareMsg] = useState({ text: "", type: "info" });

  // Expanded material details state: Set of material IDs/keys currently expanded
  const [expandedItems, setExpandedItems] = useState({});

  // Filter / Search groups
  const [groupSearchQuery, setGroupSearchQuery] = useState("");

  // Load groups and materials catalog
  const loadWorkspaceData = async () => {
    setLoading(true);
    setError("");
    try {
      const [groupsRes, materialsRes] = await Promise.allSettled([
        getGroups(regNo),
        getMaterials(),
      ]);

      // Process groups
      let fetchedGroups = [];
      if (groupsRes.status === "fulfilled" && groupsRes.value?.success) {
        fetchedGroups = groupsRes.value.groups || [];
        // Ensure student belongs to group
        fetchedGroups = fetchedGroups.filter(
          (g) => g.ownerRegNo === regNo || (g.memberRegNos && g.memberRegNos.includes(regNo))
        );
      }
      setGroups(fetchedGroups);

      // Select first group if none selected or previously selected no longer exists
      if (fetchedGroups.length > 0) {
        setSelectedGroupId((prev) =>
          prev && fetchedGroups.some((g) => g._id === prev) ? prev : fetchedGroups[0]._id
        );
      } else {
        setSelectedGroupId(null);
      }

      // Process materials catalog for lookup
      if (materialsRes.status === "fulfilled" && materialsRes.value?.success) {
        const matArray = materialsRes.value.materials || [];
        const map = {};
        matArray.forEach((m) => {
          if (m._id) map[m._id] = m;
          if (m.subjectCode) map[m.subjectCode] = m;
          if (m.title) map[m.title.toLowerCase()] = m;
        });
        setMaterialsMap(map);
      }
    } catch (err) {
      console.error("Error loading private space data:", err);
      setError("Failed to load your private study groups. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaceData();
  }, [regNo]);

  // Handle Create Group with Custom Name
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    setCreateMsg({ text: "", type: "info" });

    const trimmedName = newGroupName.trim();
    if (!trimmedName) {
      setCreateMsg({
        text: "Please enter a custom Group Name (e.g. CSE Semester 3 Study Group).",
        type: "error",
      });
      return;
    }

    const rawMembers = newMemberRegNos
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (rawMembers.length === 0) {
      setCreateMsg({
        text: "Please enter peer registration numbers separated by commas.",
        type: "error",
      });
      return;
    }

    setCreateLoading(true);
    try {
      const res = await createGroup(regNo, rawMembers, trimmedName);
      if (res.success) {
        setCreateMsg({
          text: `Study group "${trimmedName}" created successfully!`,
          type: "success",
        });
        setNewGroupName("");
        setNewMemberRegNos("");
        await loadWorkspaceData();
        if (res.group?._id) {
          setSelectedGroupId(res.group._id);
        }
      } else {
        setCreateMsg({
          text: res.message || "Failed to create group.",
          type: "error",
        });
      }
    } catch (err) {
      console.error("Create group error:", err);
      setCreateMsg({
        text: err.response?.data?.message || err.message || "Failed to create group.",
        type: "error",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  // Handle Share Material
  const handleShareMaterial = async (e) => {
    e.preventDefault();
    if (!selectedGroupId) return;
    setShareMsg({ text: "", type: "info" });

    const trimmedInput = shareInput.trim();
    if (!trimmedInput) {
      setShareMsg({
        text: "Please enter a Material ID, Document Code, or Resource Link.",
        type: "error",
      });
      return;
    }

    setShareLoading(true);
    try {
      const res = await shareToGroup(selectedGroupId, trimmedInput, regNo);
      if (res.success) {
        setShareMsg({
          text: "Material shared with group successfully!",
          type: "success",
        });
        setShareInput("");
        // Refresh groups to get updated sharedMaterialIds
        const groupsRes = await getGroups(regNo);
        if (groupsRes?.success) {
          const fetchedGroups = (groupsRes.groups || []).filter(
            (g) => g.ownerRegNo === regNo || (g.memberRegNos && g.memberRegNos.includes(regNo))
          );
          setGroups(fetchedGroups);
        }
      } else {
        setShareMsg({
          text: res.message || "Failed to share material.",
          type: "error",
        });
      }
    } catch (err) {
      console.error("Share material error:", err);
      setShareMsg({
        text: err.response?.data?.message || err.message || "Failed to share material.",
        type: "error",
      });
    } finally {
      setShareLoading(false);
    }
  };

  // Toggle item expansion for long content
  const toggleExpand = (key) => {
    setExpandedItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Currently selected group object
  const selectedGroup = groups.find((g) => g._id === selectedGroupId) || null;

  // Filtered groups by search (supports name, owner, and members)
  const filteredGroups = groups.filter((g) => {
    if (!groupSearchQuery) return true;
    const q = groupSearchQuery.toLowerCase();
    const matchesName = g.name?.toLowerCase().includes(q);
    const matchesOwner = g.ownerRegNo?.toLowerCase().includes(q);
    const matchesMember = g.memberRegNos?.some((m) => m.toLowerCase().includes(q));
    return matchesName || matchesOwner || matchesMember;
  });

  // Helper to format URL clean labels
  const formatUrlLabel = (url) => {
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname.split("/").filter(Boolean).pop();
      return pathname ? decodeURIComponent(pathname) : parsed.hostname;
    } catch {
      return "Open External Resource";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* =========================================================================
           ========================== 1. PAGE HEADER ================================
           ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
          <div>
            <Link
              to="/profile"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition py-1.5 px-3 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 mb-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Profile</span>
            </Link>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              <span className="heading-gradient">Private Study &amp; Material Sharing</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Share study materials privately with your groups.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-900/90 border border-slate-800 px-4 py-2 rounded-xl flex items-center gap-2.5">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-slate-300">
                My Active Groups: <strong className="text-white font-mono">{groups.length}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/60 border border-red-500/40 text-red-300 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-28">
            <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
          </div>
        ) : groups.length === 0 ? (
          /* =========================================================================
             ======================== 6. EMPTY STATE: NO GROUPS =====================
             ========================================================================= */
          <div className="app-card-container p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6 my-10">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400 shadow-xl shadow-purple-500/10">
              <Users className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-white">No private groups yet</h2>
              <p className="text-slate-400 text-sm max-w-md mx-auto">
                Create a study group to start sharing materials privately.
              </p>
            </div>

            {/* Create Group Form in Empty State */}
            <form onSubmit={handleCreateGroup} className="space-y-4 bg-slate-950/80 p-5 sm:p-6 rounded-xl border border-slate-800 text-left">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Create Your First Study Group
              </h3>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                    Group Name <span className="text-pink-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. CSE Semester 3 Study Group"
                    className="app-input text-xs w-full"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                    Peer Student Registration Numbers <span className="text-pink-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={newMemberRegNos}
                    onChange={(e) => setNewMemberRegNos(e.target.value)}
                    placeholder="Enter peer registration numbers separated by commas (e.g. 2025503561, 2025503562)"
                    className="app-input text-xs w-full"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={createLoading}
                  className="btn-primary text-xs w-full py-2.5 px-5 font-semibold cursor-pointer flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{createLoading ? "Creating..." : "Create Group"}</span>
                </button>
              </div>

              {createMsg.text && (
                <p
                  className={`text-xs font-medium flex items-center gap-1.5 ${
                    createMsg.type === "success" ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {createMsg.type === "success" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{createMsg.text}</span>
                </p>
              )}
            </form>
          </div>
        ) : (
          /* =========================================================================
             ======================== MAIN WORKSPACE LAYOUT ==========================
             ========================================================================= */
          <div className="space-y-6">
            
            {/* 1. CREATE NEW STUDY GROUP SECTION (WITH REQUIRED GROUP NAME) */}
            <div className="app-card-container p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <PlusCircle className="w-4 h-4" />
                <span>Create New Study Group</span>
              </div>

              <form onSubmit={handleCreateGroup} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  
                  {/* GROUP NAME FIELD */}
                  <div className="md:col-span-4 space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                      Group Name <span className="text-pink-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="e.g. CSE Semester 3 Study Group"
                      className="app-input text-xs w-full"
                      required
                    />
                  </div>

                  {/* PEER REGISTRATION NUMBERS FIELD */}
                  <div className="md:col-span-5 space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                      Peer Student Registration Numbers <span className="text-pink-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={newMemberRegNos}
                      onChange={(e) => setNewMemberRegNos(e.target.value)}
                      placeholder="Enter peer registration numbers separated by commas"
                      className="app-input text-xs w-full"
                      required
                    />
                  </div>

                  {/* SUBMIT BUTTON */}
                  <div className="md:col-span-3">
                    <button
                      type="submit"
                      disabled={createLoading}
                      className="btn-primary text-xs w-full py-2.5 px-4 font-semibold cursor-pointer flex items-center justify-center gap-2"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>{createLoading ? "Creating..." : "Create Group"}</span>
                    </button>
                  </div>
                </div>
              </form>

              {createMsg.text && (
                <div
                  className={`text-xs p-2.5 rounded-lg border flex items-center gap-2 ${
                    createMsg.type === "success"
                      ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                      : "bg-red-950/60 border-red-500/40 text-red-300"
                  }`}
                >
                  {createMsg.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  )}
                  <span>{createMsg.text}</span>
                </div>
              )}
            </div>

            {/* 2-COLUMN WORKSPACE GRID: MY GROUPS (LEFT) & GROUP WORKSPACE (RIGHT) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* =========================================================================
                 ========================== 2. MY GROUPS COLUMN ==========================
                 ========================================================================= */}
              <div className="lg:col-span-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-bold text-base">
                    <Users className="w-4 h-4 text-purple-400" />
                    <span>My Groups ({filteredGroups.length})</span>
                  </div>

                  {groups.length > 2 && (
                    <div className="relative w-44">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={groupSearchQuery}
                        onChange={(e) => setGroupSearchQuery(e.target.value)}
                        placeholder="Search group or reg no..."
                        className="app-input text-[11px] py-1 pl-8 w-full"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
                  {filteredGroups.map((group) => {
                    const isSelected = group._id === selectedGroupId;
                    const isOwner = group.ownerRegNo === regNo;

                    return (
                      <div
                        key={group._id}
                        onClick={() => setSelectedGroupId(group._id)}
                        className={`app-card p-4 space-y-3 cursor-pointer transition-all duration-150 border ${
                          isSelected
                            ? "border-purple-500/80 bg-purple-950/25 ring-1 ring-purple-500/40 shadow-lg shadow-purple-500/10"
                            : "border-slate-800 hover:border-slate-700 hover:bg-slate-900/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 flex-1 min-w-0">
                            {/* Group Name: Clean text, NO pill, NO dim badge background */}
                            <h3 className="font-bold text-base text-white hover:text-purple-300 transition truncate">
                              {group.name || "Study Group"}
                            </h3>

                            {/* Supporting info underneath */}
                            <div className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
                              <span>Owner: <strong className="text-slate-300 font-mono">{group.ownerRegNo}</strong></span>
                              {isOwner && (
                                <span className="badge-tag text-[10px] font-mono text-emerald-400 border-emerald-500/30 bg-emerald-500/10 py-0 px-1">
                                  You
                                </span>
                              )}
                              <span className="text-slate-600">•</span>
                              <span>{group.memberRegNos.length} {group.memberRegNos.length === 1 ? "member" : "members"}</span>
                            </div>
                          </div>

                          <span className="badge-tag flex items-center gap-1.5 text-[11px] font-mono text-indigo-300 shrink-0 self-start">
                            <BookOpen className="w-3 h-3 text-indigo-400" />
                            <span>{group.sharedMaterialIds?.length || 0}</span>
                          </span>
                        </div>

                        {/* Members tags */}
                        <div className="flex flex-wrap gap-1 items-center pt-2 border-t border-slate-800/80">
                          <span className="text-[10px] text-slate-400">Members:</span>
                          {group.memberRegNos.slice(0, 4).map((m) => (
                            <span key={m} className="badge-tag font-mono text-[10px] py-0.5 px-1.5">
                              {m}
                            </span>
                          ))}
                          {group.memberRegNos.length > 4 && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              +{group.memberRegNos.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* =========================================================================
                 ================= 3 & 4. SELECTED GROUP & SHARED MATERIALS ==============
                 ========================================================================= */}
              <div className="lg:col-span-7 space-y-6">
                {selectedGroup ? (
                  <>
                    {/* Active Group Details Header: PRIMARY GROUP NAME (NO pill/dim background) */}
                    <div className="app-card-container p-6 space-y-4 border border-purple-500/20">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-800">
                        <div className="space-y-2 flex-1 min-w-0">
                          {/* Primary Group Title: Clean text directly on card background, no badge/pill/border/bg, continuous heading-gradient */}
                          <h2 className="text-xl sm:text-[1.35rem] font-extrabold tracking-tight leading-[1.25] break-words">
                            <span className="heading-gradient">{selectedGroup.name || "Study Group"}</span>
                          </h2>

                          {/* Supporting Information underneath */}
                          <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap pt-0.5">
                            <span className="flex items-center gap-1.5">
                              <span>Owner:</span>
                              <strong className="text-slate-200 font-mono">{selectedGroup.ownerRegNo}</strong>
                              {selectedGroup.ownerRegNo === regNo && (
                                <span className="badge-tag text-[10px] font-mono text-emerald-400 border-emerald-500/30 bg-emerald-500/10 py-0.5 px-1.5">
                                  You
                                </span>
                              )}
                            </span>
                            <span className="text-slate-600">•</span>
                            <span>
                              <strong className="text-slate-200">{selectedGroup.memberRegNos.length}</strong> {selectedGroup.memberRegNos.length === 1 ? "Member" : "Members"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Full Members List */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
                          Group Members ({selectedGroup.memberRegNos.length}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedGroup.memberRegNos.map((m) => (
                            <span
                              key={m}
                              className={`badge-tag font-mono text-xs py-1 px-2 flex items-center gap-1.5 ${
                                m === regNo
                                  ? "border-purple-500/50 bg-purple-500/10 text-purple-200 font-bold"
                                  : ""
                              }`}
                            >
                              <User className="w-3 h-3 text-slate-400" />
                              <span>{m}</span>
                              {m === regNo && <span className="text-[10px] text-purple-400">(You)</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 4. SHARE MATERIAL SECTION */}
                    <div className="app-card-container p-6 space-y-4">
                      <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                        <Share2 className="w-4 h-4" />
                        <span>Share a Material</span>
                      </div>
                      <p className="text-xs text-slate-400">
                        Enter a Material ID, Subject Code (e.g. CS3301, ME3251), document code, or resource URL to share with group members.
                      </p>

                      <form onSubmit={handleShareMaterial} className="flex flex-col sm:flex-row gap-2.5">
                        <input
                          type="text"
                          value={shareInput}
                          onChange={(e) => setShareInput(e.target.value)}
                          placeholder="Material ID / Document Code / Resource Link"
                          className="app-input text-xs flex-1 min-w-0"
                        />
                        <button
                          type="submit"
                          disabled={shareLoading}
                          className="btn-primary text-xs py-2.5 px-5 font-semibold shrink-0 cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>{shareLoading ? "Sharing..." : "Share"}</span>
                        </button>
                      </form>

                      {shareMsg.text && (
                        <div
                          className={`text-xs p-2.5 rounded-lg border flex items-center gap-2 ${
                            shareMsg.type === "success"
                              ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300"
                              : "bg-red-950/60 border-red-500/40 text-red-300"
                          }`}
                        >
                          {shareMsg.type === "success" ? (
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                          ) : (
                            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                          )}
                          <span>{shareMsg.text}</span>
                        </div>
                      )}
                    </div>

                    {/* 3. SHARED MATERIALS / GROUP CONTENT */}
                    <div className="app-card-container p-6 space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2 text-white font-bold text-sm sm:text-base">
                          <BookOpen className="w-4 h-4 text-purple-400" />
                          <span>Shared Study Resources ({selectedGroup.sharedMaterialIds?.length || 0})</span>
                        </div>
                      </div>

                      {/* If no materials shared yet */}
                      {!selectedGroup.sharedMaterialIds || selectedGroup.sharedMaterialIds.length === 0 ? (
                        <div className="py-10 text-center space-y-2 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                          <BookOpen className="w-8 h-8 mx-auto text-slate-600" />
                          <p className="text-sm font-semibold text-slate-300">No materials shared yet.</p>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            Use the section above to share notes, subject codes, or resource URLs with your group.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedGroup.sharedMaterialIds.map((item, index) => {
                            const itemKey = `${selectedGroup._id}-${index}`;
                            const isExpanded = Boolean(expandedItems[itemKey]);

                            // Resolve material data from catalog if available
                            const matchedMaterial =
                              materialsMap[item] ||
                              materialsMap[item.toLowerCase?.()] ||
                              null;

                            const isUrl =
                              typeof item === "string" &&
                              (item.startsWith("http://") || item.startsWith("https://"));

                            const resourceUrl = matchedMaterial?.fileUrl || (isUrl ? item : null);
                            const displayTitle =
                              matchedMaterial?.title ||
                              (isUrl ? formatUrlLabel(item) : item);

                            const uploader =
                              matchedMaterial?.uploaderRegNo || selectedGroup.ownerRegNo;

                            const subjectCode = matchedMaterial?.subjectCode || null;

                            const dateFormatted = matchedMaterial?.uploadDate
                              ? new Date(matchedMaterial.uploadDate).toLocaleDateString("en-US", {
                                  dateStyle: "medium",
                                })
                              : "Recently Shared";

                            const isLongContent = item.length > 120 || matchedMaterial?.title?.length > 120;

                            return (
                              <div
                                key={itemKey}
                                className="app-card p-4 space-y-3 border border-slate-800/80 hover:border-slate-700/80 transition"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                                  <div className="space-y-1.5 flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {subjectCode && (
                                        <span className="badge-tag font-mono text-[11px] text-indigo-300 border-indigo-500/30 bg-indigo-500/10">
                                          {subjectCode}
                                        </span>
                                      )}
                                      <span className="badge-code font-mono text-[10px]">
                                        Ref: {matchedMaterial?._id ? matchedMaterial._id.slice(-6) : `Item #${index + 1}`}
                                      </span>
                                    </div>

                                    {/* Material Title / Content */}
                                    <h3 className="font-bold text-white text-sm sm:text-base break-words">
                                      {displayTitle}
                                    </h3>

                                    {/* Full content if expanded or not long */}
                                    {isLongContent && (
                                      <div className="text-xs text-slate-300 pt-1">
                                        <p className={`${isExpanded ? "block" : "line-clamp-2"} leading-relaxed`}>
                                          {item}
                                        </p>
                                        <button
                                          type="button"
                                          onClick={() => toggleExpand(itemKey)}
                                          className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold mt-1 inline-flex items-center gap-1 cursor-pointer"
                                        >
                                          {isExpanded ? (
                                            <>
                                              <span>Collapse</span>
                                              <ChevronUp className="w-3.5 h-3.5" />
                                            </>
                                          ) : (
                                            <>
                                              <span>View Details / Expand</span>
                                              <ChevronDown className="w-3.5 h-3.5" />
                                            </>
                                          )}
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Clickable Resource Link Button */}
                                  {resourceUrl && (
                                    <a
                                      href={resourceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn-secondary text-xs py-2 px-3 shrink-0 flex items-center gap-1.5 cursor-pointer self-start"
                                      title="Open Material in new tab"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      <span>View Resource</span>
                                    </a>
                                  )}
                                </div>

                                {/* Metadata Footer */}
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-medium">
                                  <div className="flex items-center gap-1.5">
                                    <User className="w-3 h-3 text-slate-500" />
                                    <span>Shared by: <strong className="text-slate-300 font-mono">{uploader}</strong></span>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3 h-3 text-slate-500" />
                                    <span>{dateFormatted}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="app-card-container p-12 text-center text-slate-500 text-sm">
                    Select a study group from the list on the left to view its shared materials.
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </main>
    </div>
  );
}

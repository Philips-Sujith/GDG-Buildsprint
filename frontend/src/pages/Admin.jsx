import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Library,
  BookOpen,
  Users,
  AlertTriangle,
  CreditCard,
  RotateCcw,
  LogOut,
  Search,
  Plus,
  Edit3,
  CheckCircle,
  XCircle,
  Clock,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Filter,
  Check,
  X,
  Building,
  RefreshCw,
  MapPin,
  User,
  ImageOff,
  Maximize2,
  FileText,
  Trash2,
} from 'lucide-react';
import {
  getAdminOverview,
  getAdminBooks,
  addAdminBook,
  updateAdminBook,
  getAdminGrievances,
  updateAdminGrievanceStatus,
  clearAdminGrievances,
  getAdminPayments,
  resetLibraryOccupancy,
} from '../api/api';

// Helper to parse category vs details from reasonText
const parseGrievanceReason = (reasonText = '') => {
  const knownCategories = [
    'Water Damage',
    'Page Missing',
    'Bad Condition',
    'Torn Pages',
    'Binding Issue',
    'Other',
  ];
  for (const cat of knownCategories) {
    if (reasonText.startsWith(cat)) {
      const remaining = reasonText.slice(cat.length).replace(/^[\s:-]+/, '').trim();
      return {
        category: cat,
        details: remaining || reasonText,
      };
    }
  }
  return {
    category: 'Grievance',
    details: reasonText || 'No additional notes provided.',
  };
};

const getCategoryBadgeStyle = (category) => {
  switch (category) {
    case 'Water Damage':
      return {
        pill: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300',
        dotEmoji: '🔴',
      };
    case 'Page Missing':
      return {
        pill: 'bg-rose-500/15 border-rose-500/30 text-rose-300',
        dotEmoji: '🔴',
      };
    case 'Torn Pages':
      return {
        pill: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
        dotEmoji: '🟡',
      };
    case 'Bad Condition':
      return {
        pill: 'bg-orange-500/15 border-orange-500/30 text-orange-300',
        dotEmoji: '🟠',
      };
    case 'Binding Issue':
      return {
        pill: 'bg-purple-500/15 border-purple-500/30 text-purple-300',
        dotEmoji: '🟣',
      };
    default:
      return {
        pill: 'bg-slate-800 border-slate-700 text-slate-300',
        dotEmoji: '⚪',
      };
  }
};

function AdminGrievancePhotoPreview({ url, label, bookTitle, onZoom }) {
  const [loadFailed, setLoadFailed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isInvalid = !url || url.includes('example.com') || url.trim() === '';

  if (isInvalid || loadFailed) {
    return (
      <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-slate-950/80 border border-slate-800 text-center min-h-[160px] sm:min-h-[190px] w-full select-none">
        <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-2">
          <ImageOff className="w-5 h-5 text-slate-500" />
        </div>
        <span className="text-xs font-semibold text-slate-400">Image unavailable</span>
        <span className="text-[10px] text-slate-600 mt-0.5 uppercase tracking-wider">{label}</span>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-1">
        <span className="uppercase tracking-wider font-semibold text-slate-300">{label}</span>
        <span className="text-[10px] text-slate-500">Click to enlarge</span>
      </div>
      <div
        onClick={() => onZoom(url, `${label} — ${bookTitle}`)}
        className="relative group cursor-pointer overflow-hidden rounded-xl bg-slate-950/90 border border-slate-800 hover:border-purple-500/50 transition p-2 min-h-[160px] sm:min-h-[190px] flex items-center justify-center"
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 z-10">
            <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
          </div>
        )}
        <img
          src={url}
          alt={label}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setLoadFailed(true);
          }}
          className="max-h-56 sm:max-h-64 w-auto max-w-full rounded-lg object-contain transition duration-200 group-hover:scale-[1.02]"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 text-white text-xs font-semibold backdrop-blur-[1px] rounded-xl pointer-events-none">
          <Maximize2 className="w-4 h-4" />
          <span>View Full Preview</span>
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const [adminUser, setAdminUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'books' | 'grievances' | 'payments'

  // Overview State
  const [overviewData, setOverviewData] = useState(null);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resettingOccupancy, setResettingOccupancy] = useState(false);
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');

  // Books State
  const [books, setBooks] = useState([]);
  const [booksPagination, setBooksPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [booksSearch, setBooksSearch] = useState('');
  const [booksCategory, setBooksCategory] = useState('');
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [bookForm, setBookForm] = useState({
    title: '',
    author: '',
    subjectCode: '',
    category: '',
    totalQuantity: 1,
    availableQuantity: 1,
    shelfLocation: '',
  });
  const [bookFormError, setBookFormError] = useState('');
  const [bookFormSuccess, setBookFormSuccess] = useState('');
  const [savingBook, setSavingBook] = useState(false);

  // Grievance State
  const [grievances, setGrievances] = useState([]);
  const [grievanceFilter, setGrievanceFilter] = useState('All');
  const [loadingGrievances, setLoadingGrievances] = useState(false);
  const [updatingGrievanceId, setUpdatingGrievanceId] = useState(null);
  const [expandedGrievanceId, setExpandedGrievanceId] = useState(null);
  const [grievanceToast, setGrievanceToast] = useState('');
  const [showClearGrievancesModal, setShowClearGrievancesModal] = useState(false);
  const [clearingGrievances, setClearingGrievances] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState(null); // { url, title }

  // Payment Monitoring State
  const [payments, setPayments] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState(null);
  const [paymentsPagination, setPaymentsPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('All');
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Initialize admin user
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        setAdminUser(u);
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch Overview Data
  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const res = await getAdminOverview();
      if (res.success) {
        setOverviewData(res.data);
      }
    } catch (err) {
      console.error('Failed to load overview:', err);
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  // Fetch Books
  const fetchBooks = useCallback(
    async (page = 1) => {
      setLoadingBooks(true);
      try {
        const res = await getAdminBooks({
          search: booksSearch,
          category: booksCategory,
          page,
          limit: 12,
        });
        if (res.success) {
          setBooks(res.books || []);
          setBooksPagination(res.pagination || { total: 0, page: 1, totalPages: 1 });
        }
      } catch (err) {
        console.error('Failed to load books:', err);
      } finally {
        setLoadingBooks(false);
      }
    },
    [booksSearch, booksCategory]
  );

  // Fetch Grievances
  const fetchGrievances = useCallback(async () => {
    setLoadingGrievances(true);
    try {
      const res = await getAdminGrievances();
      if (res.success) {
        setGrievances(res.grievances || []);
      }
    } catch (err) {
      console.error('Failed to load grievances:', err);
    } finally {
      setLoadingGrievances(false);
    }
  }, []);

  // Fetch Payments
  const fetchPayments = useCallback(
    async (page = 1) => {
      setLoadingPayments(true);
      try {
        const res = await getAdminPayments({
          search: paymentSearch,
          status: paymentStatusFilter,
          page,
          limit: 12,
        });
        if (res.success) {
          setPayments(res.payments || []);
          setPaymentSummary(res.summary || null);
          setPaymentsPagination(res.pagination || { total: 0, page: 1, totalPages: 1 });
        }
      } catch (err) {
        console.error('Failed to load payments:', err);
      } finally {
        setLoadingPayments(false);
      }
    },
    [paymentSearch, paymentStatusFilter]
  );

  // Load data according to active tab
  useEffect(() => {
    if (activeTab === 'overview') fetchOverview();
    if (activeTab === 'books') fetchBooks(1);
    if (activeTab === 'grievances') fetchGrievances();
    if (activeTab === 'payments') fetchPayments(1);
  }, [activeTab, fetchOverview, fetchBooks, fetchGrievances, fetchPayments]);

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Occupancy Reset Handler
  const handleConfirmResetOccupancy = async () => {
    setResettingOccupancy(true);
    try {
      const res = await resetLibraryOccupancy();
      if (res.success) {
        setShowResetModal(false);
        setResetSuccessMessage('Current library occupancy successfully reset to 0.');
        fetchOverview();
        setTimeout(() => setResetSuccessMessage(''), 5000);
      }
    } catch (err) {
      console.error('Reset error:', err);
      alert('Failed to reset library occupancy. Check server logs.');
    } finally {
      setResettingOccupancy(false);
    }
  };

  // Clear All Grievances Handler
  const handleConfirmClearGrievances = async () => {
    setClearingGrievances(true);
    try {
      const res = await clearAdminGrievances();
      if (res.success) {
        setGrievances([]);
        setShowClearGrievancesModal(false);
        setGrievanceToast(res.message || 'All grievance reports have been cleared successfully.');
        fetchOverview();
        setTimeout(() => setGrievanceToast(''), 4000);
      } else {
        alert(res.message || 'Failed to clear grievances.');
      }
    } catch (err) {
      console.error('Clear grievances error:', err);
      alert(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          'Failed to clear grievances.'
      );
    } finally {
      setClearingGrievances(false);
    }
  };

  // Add Book Handlers
  const handleOpenAddModal = () => {
    setBookForm({
      title: '',
      author: '',
      subjectCode: '',
      category: 'Computer Science',
      totalQuantity: 5,
      availableQuantity: 5,
      shelfLocation: '',
    });
    setBookFormError('');
    setBookFormSuccess('');
    setShowAddModal(true);
  };

  const handleSubmitAddBook = async (e) => {
    e.preventDefault();
    setBookFormError('');

    const totalQty = parseInt(bookForm.totalQuantity, 10);
    const availQty = parseInt(bookForm.availableQuantity, 10);

    if (availQty > totalQty) {
      setBookFormError('Available quantity cannot exceed total quantity.');
      return;
    }

    setSavingBook(true);
    try {
      const res = await addAdminBook({
        ...bookForm,
        totalQuantity: totalQty,
        availableQuantity: availQty,
      });
      if (res.success) {
        setShowAddModal(false);
        setBookFormSuccess('New book added successfully to the catalog!');
        fetchBooks(booksPagination.page);
        setTimeout(() => setBookFormSuccess(''), 4000);
      }
    } catch (err) {
      setBookFormError(err.response?.data?.error || 'Failed to add book.');
    } finally {
      setSavingBook(false);
    }
  };

  // Edit Book Handlers
  const handleOpenEditModal = (book) => {
    setSelectedBook(book);
    setBookForm({
      title: book.title || '',
      author: book.author || '',
      subjectCode: book.subjectCode || '',
      category: book.category || '',
      totalQuantity: book.totalQuantity ?? 1,
      availableQuantity: book.availableQuantity ?? 1,
      shelfLocation: book.shelfLocation || '',
    });
    setBookFormError('');
    setBookFormSuccess('');
    setShowEditModal(true);
  };

  const handleSubmitEditBook = async (e) => {
    e.preventDefault();
    setBookFormError('');

    const totalQty = parseInt(bookForm.totalQuantity, 10);
    const availQty = parseInt(bookForm.availableQuantity, 10);

    if (availQty > totalQty) {
      setBookFormError('Available quantity cannot exceed total quantity.');
      return;
    }

    setSavingBook(true);
    try {
      const res = await updateAdminBook(selectedBook._id, {
        ...bookForm,
        totalQuantity: totalQty,
        availableQuantity: availQty,
      });
      if (res.success) {
        setShowEditModal(false);
        setBookFormSuccess(`"${res.book?.title}" updated successfully!`);
        fetchBooks(booksPagination.page);
        setTimeout(() => setBookFormSuccess(''), 4000);
      }
    } catch (err) {
      setBookFormError(err.response?.data?.error || 'Failed to update book.');
    } finally {
      setSavingBook(false);
    }
  };

  // Grievance Status Handler
  const handleUpdateGrievanceStatus = async (id, newStatus) => {
    setUpdatingGrievanceId(id);
    try {
      const res = await updateAdminGrievanceStatus(id, newStatus);
      if (res.success) {
        setGrievanceToast(`Grievance marked as "${newStatus}"`);
        setGrievances((prev) =>
          prev.map((g) => (g._id === id ? { ...g, status: newStatus } : g))
        );
        // Ensure this grievance remains expanded after updating status
        setExpandedGrievanceId(id);
        setTimeout(() => setGrievanceToast(''), 3500);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update grievance status');
    } finally {
      setUpdatingGrievanceId(null);
    }
  };

  // Grievances filtered
  const filteredGrievances = grievances.filter((g) => {
    if (grievanceFilter === 'All') return true;
    return g.status === grievanceFilter;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-purple-500/30">
      {/* =========================================================================
          ======================= ADMIN TOP NAVIGATION HEADER =====================
          ========================================================================= */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand & Admin Badge */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-0.5 shadow-md shadow-indigo-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white">
                  Smart Library
                </span>
                <span className="badge-tag bg-purple-500/15 border-purple-500/40 text-purple-300 font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5">
                  Admin Console
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Admin: <span className="text-slate-200 font-semibold">{adminUser?.name || 'Arun Karthick'}</span> • {adminUser?.department || 'Library Administration'}
              </p>
            </div>
          </div>

          {/* Nav Tabs - Desktop & Tablet */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-900/90 border border-slate-800/90 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Library className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab('books')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'books'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Books</span>
            </button>

            <button
              onClick={() => setActiveTab('grievances')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'grievances'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Grievances</span>
              {overviewData?.stats?.pendingGrievances > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('payments')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'payments'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Payments</span>
            </button>
          </nav>

          {/* Right Action: Logout */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 hover:text-red-200 text-xs font-semibold transition cursor-pointer"
              title="Logout from Admin"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden flex items-center justify-around border-t border-slate-800/80 bg-slate-900/90 py-1.5 px-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 ${
              activeTab === 'overview' ? 'bg-purple-600 text-white' : 'text-slate-400'
            }`}
          >
            <Library className="w-3 h-3" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('books')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 ${
              activeTab === 'books' ? 'bg-purple-600 text-white' : 'text-slate-400'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            <span>Books</span>
          </button>
          <button
            onClick={() => setActiveTab('grievances')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 ${
              activeTab === 'grievances' ? 'bg-purple-600 text-white' : 'text-slate-400'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Grievances</span>
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 ${
              activeTab === 'payments' ? 'bg-purple-600 text-white' : 'text-slate-400'
            }`}
          >
            <CreditCard className="w-3 h-3" />
            <span>Payments</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          ======================= GLOBAL TOAST ALERTS ============================
          ========================================================================= */}
      {resetSuccessMessage && (
        <div className="bg-emerald-950/80 border-b border-emerald-500/40 text-emerald-200 px-4 py-2.5 text-center text-xs font-medium flex items-center justify-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{resetSuccessMessage}</span>
        </div>
      )}
      {bookFormSuccess && (
        <div className="bg-purple-950/80 border-b border-purple-500/40 text-purple-200 px-4 py-2.5 text-center text-xs font-medium flex items-center justify-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{bookFormSuccess}</span>
        </div>
      )}
      {grievanceToast && (
        <div className="bg-indigo-950/80 border-b border-indigo-500/40 text-indigo-200 px-4 py-2.5 text-center text-xs font-medium flex items-center justify-center gap-2 animate-fadeIn">
          <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>{grievanceToast}</span>
        </div>
      )}

      {/* =========================================================================
          ======================= MAIN DASHBOARD CONTAINER =======================
          ========================================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* =======================================================================
            TAB A: LIBRARY OVERVIEW & OCCUPANCY RESET
            ======================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Overview Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-white">
                  Library Operations Overview
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Real-time status of library facilities, catalog, student presence, and operations
                </p>
              </div>

              <button
                type="button"
                onClick={fetchOverview}
                disabled={loadingOverview}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer self-start sm:self-center transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingOverview ? 'animate-spin' : ''}`} />
                <span>Refresh Live Data</span>
              </button>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Card 1: Books */}
              <div className="app-card p-4 flex items-center gap-3.5 border border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Total Books
                  </p>
                  <p className="text-xl font-bold text-white mt-0.5">
                    {overviewData?.stats?.totalBooks ?? '...'}
                  </p>
                </div>
              </div>

              {/* Card 2: Students */}
              <div className="app-card p-4 flex items-center gap-3.5 border border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Student Members
                  </p>
                  <p className="text-xl font-bold text-white mt-0.5">
                    {overviewData?.stats?.totalStudents ?? '...'}
                  </p>
                </div>
              </div>

              {/* Card 3: Live Occupancy */}
              <div className="app-card p-4 flex items-center gap-3.5 border border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Currently in Library
                  </p>
                  <p className="text-xl font-bold text-emerald-300 mt-0.5">
                    {overviewData?.stats?.totalActiveOccupancy ?? 0}
                  </p>
                </div>
              </div>

              {/* Card 4: Grievances */}
              <div className="app-card p-4 flex items-center gap-3.5 border border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Pending Grievances
                  </p>
                  <p className="text-xl font-bold text-amber-300 mt-0.5">
                    {overviewData?.stats?.pendingGrievances ?? 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Occupancy Management Section (No sliders, no percentages) */}
            <div className="app-card-container p-5 sm:p-6 space-y-5 border border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                <div>
                  <div className="flex items-center gap-2">
                    <Building className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-base font-bold text-white">
                      Current Library Occupancy
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Total students currently active across library reading rooms and floors
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 text-xs font-bold transition cursor-pointer shadow-sm hover:scale-[1.01]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Library Count</span>
                  </button>
                </div>
              </div>

              {/* Big Occupancy Stat Banner */}
              <div className="p-4 sm:p-5 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">
                    Total students currently in library
                  </p>
                  <p className="text-3xl sm:text-4xl font-black text-white mt-1">
                    {overviewData?.occupancy?.total ?? 0}{' '}
                    <span className="text-sm font-semibold text-slate-400">active presence</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>Presence tracking updated live via periodic student pings</span>
                </div>
              </div>

              {/* Exact 6 Zone Counts (Per requirements) */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Zone Breakdown
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(overviewData?.occupancy?.zones || [
                    { name: 'First Floor', count: 0 },
                    { name: 'Second Floor', count: 0 },
                    { name: 'Reading Room', count: 0 },
                    { name: 'Discussion Room', count: 0 },
                    { name: 'Study Room', count: 0 },
                    { name: 'Reference Room', count: 0 },
                  ]).map((zone) => (
                    <div
                      key={zone.name}
                      className="app-card p-3.5 border border-slate-800 bg-slate-900/40 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-300">{zone.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Section count</p>
                      </div>
                      <span className="font-mono text-base font-bold text-indigo-300 bg-indigo-950/40 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                        {zone.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Link Navigation Tiles */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={() => setActiveTab('books')}
                className="app-card p-5 border border-slate-800 hover:border-purple-500/40 cursor-pointer transition group"
              >
                <div className="flex items-center justify-between">
                  <BookOpen className="w-5 h-5 text-purple-400 group-hover:scale-110 transition" />
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-300 group-hover:translate-x-0.5 transition" />
                </div>
                <h3 className="text-sm font-bold text-white mt-3">Book Management</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Add new catalog titles, modify availability, and update shelf locations.
                </p>
              </div>

              <div
                onClick={() => setActiveTab('grievances')}
                className="app-card p-5 border border-slate-800 hover:border-purple-500/40 cursor-pointer transition group"
              >
                <div className="flex items-center justify-between">
                  <AlertTriangle className="w-5 h-5 text-amber-400 group-hover:scale-110 transition" />
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-300 group-hover:translate-x-0.5 transition" />
                </div>
                <h3 className="text-sm font-bold text-white mt-3">Grievance Reports</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Review student book damage complaints, photos, and update resolution statuses.
                </p>
              </div>

              <div
                onClick={() => setActiveTab('payments')}
                className="app-card p-5 border border-slate-800 hover:border-purple-500/40 cursor-pointer transition group"
              >
                <div className="flex items-center justify-between">
                  <CreditCard className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition" />
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-300 group-hover:translate-x-0.5 transition" />
                </div>
                <h3 className="text-sm font-bold text-white mt-3">Payment Monitoring</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Monitor Razorpay transactions, settled fine payments, and order statuses.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =======================================================================
            TAB B: BOOK MANAGEMENT
            ======================================================================= */}
        {activeTab === 'books' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Header & Add Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-white">
                  Catalog & Book Management
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Add new books or adjust inventory quantity and shelf locations
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddModal}
                className="btn-primary py-2 px-4 text-xs flex items-center gap-1.5 self-start sm:self-center"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Book</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="app-card p-3 sm:p-4 border border-slate-800 flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={booksSearch}
                  onChange={(e) => setBooksSearch(e.target.value)}
                  placeholder="Search catalog by title, author, subject code, or shelf..."
                  className="app-input text-xs pl-9 w-full"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={booksCategory}
                  onChange={(e) => setBooksCategory(e.target.value)}
                  aria-label="Filter books by category"
                  className="app-input text-xs w-full sm:w-48 cursor-pointer"
                >
                  <option value="">All Categories</option>
                  <option value="Computer Science">Computer Science</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electronics & Communication">Electronics & Communication</option>
                  <option value="Electrical Engineering">Electrical Engineering</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                  <option value="Civil Engineering">Civil Engineering</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Physics">Physics</option>
                </select>

                <button
                  type="button"
                  onClick={() => fetchBooks(1)}
                  className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer shrink-0"
                >
                  Search
                </button>
              </div>
            </div>

            {/* Books Table / Cards */}
            <div className="app-card-container border border-slate-800 overflow-hidden">
              {loadingBooks ? (
                <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
                  <span>Loading catalog books...</span>
                </div>
              ) : books.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  No books found matching your criteria.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-3 px-4">Title & Author</th>
                        <th className="py-3 px-4">Subject Code</th>
                        <th className="py-3 px-4">Category</th>
                        <th className="py-3 px-4 text-center">Availability</th>
                        <th className="py-3 px-4">Shelf Location</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {books.map((b) => {
                        const isAvailable = b.availableQuantity > 0;
                        return (
                          <tr key={b._id} className="hover:bg-slate-900/40 transition">
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-white text-sm">{b.title}</p>
                              <p className="text-slate-400 text-[11px] mt-0.5">{b.author}</p>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-semibold text-slate-300">
                              {b.subjectCode}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="badge-tag text-[10px] text-slate-300">
                                {b.category}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <div className="inline-flex flex-col items-center">
                                <span
                                  className={`font-mono font-bold text-xs ${
                                    isAvailable ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  {b.availableQuantity} / {b.totalQuantity}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {isAvailable ? 'In Stock' : 'Out of Stock'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-slate-300">
                              {b.shelfLocation}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(b)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold cursor-pointer transition"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Books Pagination */}
              {booksPagination.totalPages > 1 && (
                <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Showing page {booksPagination.page} of {booksPagination.totalPages} ({booksPagination.total} books)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={booksPagination.page <= 1}
                      onClick={() => fetchBooks(booksPagination.page - 1)}
                      className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-40 cursor-pointer"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      disabled={booksPagination.page >= booksPagination.totalPages}
                      onClick={() => fetchBooks(booksPagination.page + 1)}
                      className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =======================================================================
            TAB C: GRIEVANCE REPORTS
            ======================================================================= */}
        {activeTab === 'grievances' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Header & Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-white">
                  Student Grievance Reports
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Manage book condition issues, missing pages, and damage reports
                </p>
              </div>

              {/* Action Controls & Status Filter Pills */}
              <div className="flex items-center gap-2.5 flex-wrap justify-end">
                {/* Clear All Grievances Button */}
                <button
                  type="button"
                  onClick={() => setShowClearGrievancesModal(true)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:border-rose-500/50 transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                  title="Clear all grievance reports from database"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Clear All Grievances</span>
                </button>

                {/* Status Filter Pills */}
                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800 overflow-x-auto">
                  {['All', 'Submitted', 'Under Review', 'Resolved', 'Rejected'].map((status) => (
                    <button
                      key={status}
                      onClick={() => setGrievanceFilter(status)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer whitespace-nowrap ${
                        grievanceFilter === status
                          ? 'bg-purple-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Grievances List */}
            {loadingGrievances ? (
              <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
                <span>Loading grievances...</span>
              </div>
            ) : filteredGrievances.length === 0 ? (
              <div className="app-card py-16 text-center text-xs text-slate-400 border border-slate-800">
                No grievance reports found in category &quot;{grievanceFilter}&quot;.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredGrievances.map((g) => {
                  const isExpanded = expandedGrievanceId === g._id;
                  const isUpdating = updatingGrievanceId === g._id;
                  const parsed = parseGrievanceReason(g.reasonText);
                  const catStyle = getCategoryBadgeStyle(parsed.category);

                  const statusColors = {
                    Submitted: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
                    'Under Review': 'bg-amber-500/10 border-amber-500/30 text-amber-300',
                    Resolved: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
                    Rejected: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
                  };

                  return (
                    <div
                      key={g._id}
                      className={`rounded-xl border transition duration-200 overflow-hidden ${
                        isExpanded
                          ? 'bg-slate-900 border-purple-500/50 shadow-xl shadow-purple-500/5'
                          : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800/90 hover:border-slate-700'
                      }`}
                    >
                      {/* DEFAULT COMPACT ROW (ONE-LINE / COMPACT HEADER) */}
                      <div
                        onClick={() => setExpandedGrievanceId(isExpanded ? null : g._id)}
                        className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer select-none"
                      >
                        {/* Left: Category • Book • Student • Shelf */}
                        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap min-w-0">
                          {/* Problem / Category Tag */}
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${catStyle.pill}`}
                          >
                            <span className="text-[10px] leading-none">{catStyle.dotEmoji}</span>
                            <span>{parsed.category}</span>
                          </span>

                          <span className="text-slate-600 hidden sm:inline text-xs">•</span>

                          {/* Book Title */}
                          <span
                            className="font-bold text-white text-xs sm:text-sm truncate max-w-[180px] sm:max-w-[260px] md:max-w-xs"
                            title={g.bookName}
                          >
                            {g.bookName}
                          </span>

                          <span className="text-slate-600 hidden sm:inline text-xs">•</span>

                          {/* Student Name */}
                          <span className="text-xs text-slate-300 shrink-0">
                            <strong>{g.studentName}</strong>
                            {g.regNo && (
                              <span className="text-slate-500 font-mono text-[11px] ml-1">
                                ({g.regNo})
                              </span>
                            )}
                          </span>

                          <span className="text-slate-600 hidden md:inline text-xs">•</span>

                          {/* Shelf Code */}
                          <span className="text-[11px] text-purple-300 font-mono bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded shrink-0 hidden md:inline">
                            {g.shelfCode}
                          </span>
                        </div>

                        {/* Right: Shelf on mobile + Status Badge + Expand/Collapse Indicator */}
                        <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                          <span className="text-[11px] text-purple-300 font-mono bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded shrink-0 md:hidden">
                            Shelf: {g.shelfCode}
                          </span>

                          <div className="flex items-center gap-2">
                            <span
                              className={`badge-tag text-[11px] font-bold px-2 py-0.5 ${
                                statusColors[g.status] || 'bg-slate-800 text-slate-300'
                              }`}
                            >
                              {g.status}
                            </span>
                            <div className="p-1 rounded-md text-slate-400 group-hover:text-white">
                              <ChevronDown
                                className={`w-4 h-4 transition-transform duration-200 ${
                                  isExpanded ? 'rotate-180 text-purple-400' : 'text-slate-500'
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* EXPANDED VIEW */}
                      {isExpanded && (
                        <div className="px-4 pb-5 pt-3 sm:px-6 sm:pb-6 border-t border-slate-800/80 space-y-5 animate-fadeIn bg-slate-950/40">
                          {/* 1. Details Metadata Grid */}
                          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider mb-1">
                                BOOK
                              </span>
                              <strong className="text-white text-sm block font-bold leading-snug">
                                {g.bookName}
                              </strong>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider mb-1">
                                STUDENT
                              </span>
                              <strong className="text-slate-200 block text-xs font-semibold">
                                {g.studentName}
                              </strong>
                              <span className="text-slate-400 font-mono text-[11px] block mt-0.5">
                                Reg No: {g.regNo}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider mb-1">
                                DEPARTMENT
                              </span>
                              <span className="text-slate-300 block font-medium">
                                {g.department || 'Computer Science & Engineering'}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider mb-1">
                                SHELF
                              </span>
                              <span className="text-purple-300 font-mono font-bold text-sm block">
                                {g.shelfCode}
                              </span>
                            </div>
                          </div>

                          {/* 2. Problem Category & Detailed Notes */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                                PROBLEM:
                              </span>
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${catStyle.pill}`}
                              >
                                <span>{catStyle.dotEmoji}</span>
                                <span>{parsed.category}</span>
                              </span>
                            </div>

                            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                              <span className="text-[10px] uppercase font-bold text-slate-500 block tracking-wider mb-1">
                                DETAILS:
                              </span>
                              <p className="whitespace-pre-wrap">{parsed.details}</p>
                            </div>
                          </div>

                          {/* 3. Photos (Cover Photo Preview & Damage Evidence Preview) */}
                          <div className="space-y-2">
                            <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider block">
                              PHOTOS:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <AdminGrievancePhotoPreview
                                url={g.coverPhotoUrl}
                                label="Book Cover Preview"
                                bookTitle={g.bookName}
                                onZoom={(url, title) => setPreviewPhoto({ url, title })}
                              />
                              <AdminGrievancePhotoPreview
                                url={g.reasonPhotoUrl}
                                label="Damage Evidence Preview"
                                bookTitle={g.bookName}
                                onZoom={(url, title) => setPreviewPhoto({ url, title })}
                              />
                            </div>
                          </div>

                          {/* 4. Status Controls */}
                          <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                                STATUS:
                              </span>
                              <span
                                className={`badge-tag text-xs font-bold px-2.5 py-0.5 ${
                                  statusColors[g.status] || 'bg-slate-800 text-slate-300'
                                }`}
                              >
                                {g.status}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] uppercase font-bold text-slate-500 mr-1 hidden sm:inline tracking-wider">
                                Change Status:
                              </span>
                              {['Submitted', 'Under Review', 'Resolved', 'Rejected'].map((status) => {
                                const isCurrent = g.status === status;
                                return (
                                  <button
                                    key={status}
                                    type="button"
                                    disabled={isUpdating || isCurrent}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUpdateGrievanceStatus(g._id, status);
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                                      isCurrent
                                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-400 cursor-default'
                                        : status === 'Resolved'
                                        ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300'
                                        : status === 'Under Review'
                                        ? 'bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300'
                                        : status === 'Rejected'
                                        ? 'bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300'
                                        : 'bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300'
                                    }`}
                                  >
                                    {isUpdating && <RefreshCw className="w-3 h-3 animate-spin" />}
                                    {status === 'Resolved' && !isUpdating && <Check className="w-3 h-3" />}
                                    {status === 'Rejected' && !isUpdating && <X className="w-3 h-3" />}
                                    {status === 'Under Review' && !isUpdating && <Clock className="w-3 h-3" />}
                                    {status === 'Submitted' && !isUpdating && (
                                      <AlertTriangle className="w-3 h-3" />
                                    )}
                                    <span>{status}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =======================================================================
            TAB D: PAYMENT MONITORING (Read-Only)
            ======================================================================= */}
        {activeTab === 'payments' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-white">
                  Razorpay Payment Monitoring
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Real-time ledger of Razorpay orders, verified transactions, and late fine settlements
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold self-start sm:self-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Test Mode Live Sync</span>
              </div>
            </div>

            {/* Payment Summary Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="app-card p-4 border border-slate-800">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Total Collected
                </p>
                <p className="text-xl font-bold text-emerald-400 mt-0.5">
                  ₹{paymentSummary?.totalPaidAmount ?? 0}
                </p>
              </div>

              <div className="app-card p-4 border border-slate-800">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Paid Settlements
                </p>
                <p className="text-xl font-bold text-white mt-0.5">
                  {paymentSummary?.countsByStatus?.Paid ?? 0}
                </p>
              </div>

              <div className="app-card p-4 border border-slate-800">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Pending Orders
                </p>
                <p className="text-xl font-bold text-amber-400 mt-0.5">
                  {paymentSummary?.countsByStatus?.Created ?? 0}
                </p>
              </div>

              <div className="app-card p-4 border border-slate-800">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Total Orders
                </p>
                <p className="text-xl font-bold text-slate-300 mt-0.5">
                  {paymentSummary?.totalTransactions ?? 0}
                </p>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="app-card p-3 sm:p-4 border border-slate-800 flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  placeholder="Search by student registration number (e.g. 2025503571)..."
                  className="app-input text-xs pl-9 w-full"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  aria-label="Filter payments by status"
                  className="app-input text-xs w-full sm:w-40 cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Paid">Paid</option>
                  <option value="Created">Created</option>
                  <option value="Failed">Failed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>

                <button
                  type="button"
                  onClick={() => fetchPayments(1)}
                  className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer shrink-0"
                >
                  Filter
                </button>
              </div>
            </div>

            {/* Payments Table */}
            <div className="app-card-container border border-slate-800 overflow-hidden">
              {loadingPayments ? (
                <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-purple-400" />
                  <span>Loading payment records...</span>
                </div>
              ) : payments.length === 0 ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  No payment records found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                      <tr>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Razorpay Order ID</th>
                        <th className="py-3 px-4">Payment ID</th>
                        <th className="py-3 px-4">Method</th>
                        <th className="py-3 px-4">Created Date</th>
                        <th className="py-3 px-4">Verified Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {payments.map((p) => {
                        const isPaid = p.status === 'Paid';
                        const isCreated = p.status === 'Created';
                        return (
                          <tr key={p._id} className="hover:bg-slate-900/40 transition">
                            <td className="py-3 px-4">
                              <p className="font-bold text-white font-mono">{p.regNo}</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">{p.studentName}</p>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono font-bold text-sm text-emerald-300">
                                ₹{p.amount}
                              </span>
                              <span className="text-[10px] text-slate-500 ml-1 font-mono">
                                {p.currency || 'INR'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`badge-tag text-[10px] font-bold px-2 py-0.5 ${
                                  isPaid
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                    : isCreated
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                }`}
                              >
                                {p.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                              {p.razorpayOrderId}
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-300 text-[11px]">
                              {p.razorpayPaymentId || <span className="text-slate-600">—</span>}
                            </td>
                            <td className="py-3 px-4 capitalize text-slate-400">
                              {p.paymentMethod || 'card / upi'}
                            </td>
                            <td className="py-3 px-4 text-slate-400 text-[11px]">
                              {p.createdAt ? new Date(p.createdAt).toLocaleString() : '—'}
                            </td>
                            <td className="py-3 px-4 text-slate-400 text-[11px]">
                              {p.verifiedAt ? (
                                <span className="text-emerald-400">
                                  {new Date(p.verifiedAt).toLocaleString()}
                                </span>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Payments Pagination */}
              {paymentsPagination.totalPages > 1 && (
                <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Page {paymentsPagination.page} of {paymentsPagination.totalPages} ({paymentsPagination.total} total)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={paymentsPagination.page <= 1}
                      onClick={() => fetchPayments(paymentsPagination.page - 1)}
                      className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-40 cursor-pointer"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      disabled={paymentsPagination.page >= paymentsPagination.totalPages}
                      onClick={() => fetchPayments(paymentsPagination.page + 1)}
                      className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Read-Only Safety Notice */}
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs text-slate-400 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                <strong>Read-Only Monitoring:</strong> Payment amounts and statuses are verified server-side via Razorpay cryptographic signatures. Manual modification is restricted to ensure transaction integrity.
              </span>
            </div>
          </div>
        )}
      </main>

      {/* =========================================================================
          ======================= MODALS =========================================
          ========================================================================= */}

      {/* 1. Reset Library Occupancy Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="app-card-container w-full max-w-md p-6 space-y-4 shadow-2xl border border-rose-500/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reset Library Count?</h3>
                <p className="text-xs text-slate-400 mt-0.5">Admin action confirmation</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
              Are you sure you want to reset the current library occupancy?
              <br />
              <br />
              This will deactivate all currently active student presence records so that current occupancy becomes zero. Historical borrow records and student account data will remain untouched.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={resettingOccupancy}
                onClick={() => setShowResetModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={resettingOccupancy}
                onClick={handleConfirmResetOccupancy}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-lg shadow-rose-600/30"
              >
                {resettingOccupancy ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Resetting...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Yes, Reset Occupancy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Add Book Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="app-card-container w-full max-w-lg max-h-[90vh] flex flex-col p-6 space-y-4 shadow-2xl border border-purple-500/30 overflow-hidden">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-400" />
                <h3 className="text-base font-bold text-white">Add New Catalog Book</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bookFormError && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                {bookFormError}
              </div>
            )}

            <form onSubmit={handleSubmitAddBook} className="space-y-3.5 overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Book Title *
                </label>
                <input
                  type="text"
                  required
                  value={bookForm.title}
                  onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                  placeholder="e.g. Operating System Concepts"
                  className="app-input text-xs w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Author *
                </label>
                <input
                  type="text"
                  required
                  value={bookForm.author}
                  onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                  placeholder="e.g. Abraham Silberschatz"
                  className="app-input text-xs w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Subject Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={bookForm.subjectCode}
                    onChange={(e) => setBookForm({ ...bookForm, subjectCode: e.target.value })}
                    placeholder="e.g. CS23302"
                    className="app-input text-xs w-full font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <input
                    type="text"
                    required
                    value={bookForm.category}
                    onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                    placeholder="e.g. Computer Science"
                    className="app-input text-xs w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Total Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={bookForm.totalQuantity}
                    onChange={(e) => setBookForm({ ...bookForm, totalQuantity: e.target.value })}
                    className="app-input text-xs w-full font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Available Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={bookForm.availableQuantity}
                    onChange={(e) => setBookForm({ ...bookForm, availableQuantity: e.target.value })}
                    className="app-input text-xs w-full font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Shelf Location *
                </label>
                <input
                  type="text"
                  required
                  value={bookForm.shelfLocation}
                  onChange={(e) => setBookForm({ ...bookForm, shelfLocation: e.target.value })}
                  placeholder="e.g. Rack 4, Shelf B"
                  className="app-input text-xs w-full font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBook}
                  className="btn-primary py-2 px-5 text-xs font-bold"
                >
                  {savingBook ? 'Saving...' : 'Add Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Edit Book Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="app-card-container w-full max-w-lg max-h-[90vh] flex flex-col p-6 space-y-4 shadow-2xl border border-indigo-500/30 overflow-hidden">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Edit Catalog Book</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bookFormError && (
              <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                {bookFormError}
              </div>
            )}

            <form onSubmit={handleSubmitEditBook} className="space-y-3.5 overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Book Title
                </label>
                <input
                  type="text"
                  required
                  value={bookForm.title}
                  onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                  className="app-input text-xs w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Author
                </label>
                <input
                  type="text"
                  required
                  value={bookForm.author}
                  onChange={(e) => setBookForm({ ...bookForm, author: e.target.value })}
                  className="app-input text-xs w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Subject Code
                  </label>
                  <input
                    type="text"
                    required
                    value={bookForm.subjectCode}
                    onChange={(e) => setBookForm({ ...bookForm, subjectCode: e.target.value })}
                    className="app-input text-xs w-full font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    required
                    value={bookForm.category}
                    onChange={(e) => setBookForm({ ...bookForm, category: e.target.value })}
                    className="app-input text-xs w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Total Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={bookForm.totalQuantity}
                    onChange={(e) => setBookForm({ ...bookForm, totalQuantity: e.target.value })}
                    className="app-input text-xs w-full font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Available Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={bookForm.availableQuantity}
                    onChange={(e) => setBookForm({ ...bookForm, availableQuantity: e.target.value })}
                    className="app-input text-xs w-full font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Shelf Location
                </label>
                <input
                  type="text"
                  required
                  value={bookForm.shelfLocation}
                  onChange={(e) => setBookForm({ ...bookForm, shelfLocation: e.target.value })}
                  className="app-input text-xs w-full font-mono"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingBook}
                  className="btn-primary py-2 px-5 text-xs font-bold"
                >
                  {savingBook ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Photo Lightbox Modal */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="app-card-container max-w-3xl max-h-[90vh] p-4 flex flex-col items-center space-y-3 border border-slate-700 w-full"
          >
            <div className="w-full flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-white truncate max-w-lg">
                {previewPhoto.title}
              </span>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800 cursor-pointer transition"
                title="Close Lightbox"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="w-full flex-1 overflow-auto flex items-center justify-center p-2 min-h-[260px]">
              {previewPhoto.url && !previewPhoto.url.includes('example.com') ? (
                <img
                  src={previewPhoto.url}
                  alt={previewPhoto.title || 'Preview'}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fb = e.currentTarget.parentElement?.querySelector('.lightbox-fallback');
                    if (fb) fb.classList.remove('hidden');
                  }}
                  className="max-h-[75vh] w-auto max-w-full rounded-lg object-contain shadow-2xl"
                />
              ) : null}
              <div
                className={`lightbox-fallback flex-col items-center justify-center p-12 text-center text-slate-500 ${
                  previewPhoto.url && !previewPhoto.url.includes('example.com') ? 'hidden' : 'flex'
                }`}
              >
                <ImageOff className="w-10 h-10 text-slate-600 mb-2" />
                <span className="text-sm font-semibold text-slate-400">Image unavailable</span>
                <span className="text-xs text-slate-600 mt-1">
                  The original image file could not be retrieved.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Clear All Grievances Confirmation Modal */}
      {showClearGrievancesModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="app-card-container w-full max-w-md p-6 space-y-4 shadow-2xl border border-rose-500/40">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">
                  Clear all grievance reports?
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  This will permanently remove every grievance submission from the database.
                </p>
                <p className="text-xs font-semibold text-rose-400">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-[11px] text-rose-200 leading-relaxed">
              ⚠️ <strong>Warning:</strong> All student book damage submissions, photo references, and grievance records will be permanently deleted from MongoDB.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                disabled={clearingGrievances}
                onClick={() => setShowClearGrievancesModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={clearingGrievances}
                onClick={handleConfirmClearGrievances}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {clearingGrievances ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Clearing Reports...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Yes, Clear All</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

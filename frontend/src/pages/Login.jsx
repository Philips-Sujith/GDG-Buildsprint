import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Library,
  Lock,
  User,
  AlertCircle,
  ArrowRight,
  Sparkles,
  X,
  Search,
  Check,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';
import { loginUser, getMockProfiles } from '../api/api';

const ADMIN_DEMO = {
  name: 'Arun Karthick',
  role: 'Administrator',
  regNo: 'ADMIN202501',
  password: 'Admin@123',
  department: 'Library Administration',
};

const FALLBACK_MOCK_PROFILES = [
  { regNo: '2025503570', name: 'Aarav Sharma', department: 'Computer Science & Engineering', year: 3, fineAmount: 0, booksCount: 1, password: 'Demo@123' },
  { regNo: '2025503571', name: 'Kavin Raj', department: 'Information Technology', year: 2, fineAmount: 50, booksCount: 2, password: 'Demo@123' },
  { regNo: '2025503572', name: 'Nithya Krishnan', department: 'Computer Science & Engineering', year: 4, fineAmount: 75, booksCount: 2, password: 'Demo@123' },
  { regNo: '2025503573', name: 'Aditya Menon', department: 'Electronics & Communication Engineering', year: 3, fineAmount: 100, booksCount: 1, password: 'Demo@123' },
  { regNo: '2025503574', name: 'Meera Nair', department: 'Electrical & Electronics Engineering', year: 1, fineAmount: 20, booksCount: 1, password: 'Demo@123' },
  { regNo: '2025503575', name: 'Arjun Kumar', department: 'Mechanical Engineering', year: 2, fineAmount: 120, booksCount: 3, password: 'Demo@123' },
  { regNo: '2025503576', name: 'Divya Varma', department: 'Computer Science & Engineering', year: 3, fineAmount: 150, booksCount: 1, password: 'Demo@123' },
  { regNo: '2025503577', name: 'Siddharth Balaji', department: 'Information Technology', year: 4, fineAmount: 200, booksCount: 2, password: 'Demo@123' },
  { regNo: '2025503578', name: 'Pooja Sundaram', department: 'Civil Engineering', year: 2, fineAmount: 250, booksCount: 2, password: 'Demo@123' },
  { regNo: '2025503579', name: 'Varun Venkatesh', department: 'Electronics & Communication Engineering', year: 3, fineAmount: 0, booksCount: 2, password: 'Demo@123' },
  { regNo: '2025503580', name: 'Shreya Rangarajan', department: 'Computer Science & Engineering', year: 1, fineAmount: 30, booksCount: 2, password: 'Demo@123' },
  { regNo: '2025503581', name: 'Pranav Chandran', department: 'Mechanical Engineering', year: 4, fineAmount: 180, booksCount: 1, password: 'Demo@123' },
  { regNo: '2025503582', name: 'Ananya Natarajan', department: 'Information Technology', year: 2, fineAmount: 80, booksCount: 1, password: 'Demo@123' },
  { regNo: '2025503583', name: 'Harish Raghavan', department: 'Electrical & Electronics Engineering', year: 3, fineAmount: 300, booksCount: 2, password: 'Demo@123' },
  { regNo: '2025503584', name: 'Rithika Subramanian', department: 'Computer Science & Engineering', year: 4, fineAmount: 0, booksCount: 2, password: 'Demo@123' },
];

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ regNo: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Mock Profiles Modal State
  const [showMockModal, setShowMockModal] = useState(false);
  const [mockProfiles, setMockProfiles] = useState(FALLBACK_MOCK_PROFILES);
  const [mockSearchQuery, setMockSearchQuery] = useState('');
  const [selectedRegNo, setSelectedRegNo] = useState(null);

  // Load live profiles from backend if available
  useEffect(() => {
    let isMounted = true;
    getMockProfiles()
      .then((res) => {
        if (isMounted && res.data?.profiles?.length > 0) {
          setMockProfiles(res.data.profiles);
        }
      })
      .catch(() => {
        // Gracefully use fallback data if backend is unreachable
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await loginUser(form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      if (data.user?.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          'Login failed. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMockProfile = (profile) => {
    setForm({
      regNo: profile.regNo,
      password: profile.password || 'Demo@123',
    });
    setSelectedRegNo(profile.regNo);
    setShowMockModal(false);
    setError('');
  };

  const handleSelectAdminDemo = () => {
    setForm({
      regNo: ADMIN_DEMO.regNo,
      password: ADMIN_DEMO.password,
    });
    setSelectedRegNo(ADMIN_DEMO.regNo);
    setShowMockModal(false);
    setError('');
  };

  const filteredMockProfiles = mockProfiles.filter((p) => {
    const q = mockSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.name?.toLowerCase().includes(q) ||
      p.regNo?.includes(q) ||
      p.department?.toLowerCase().includes(q) ||
      `₹${p.fineAmount}`.includes(q) ||
      `${p.fineAmount}`.includes(q)
    );
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-sans relative overflow-hidden">
      {/* Background glowing orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-0.5 shadow-xl shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Library className="w-7 h-7 text-indigo-400" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="heading-gradient">Smart Library</span>
          </h1>
          <p className="text-sm text-slate-400">Sign in to your library account</p>
        </div>

        {/* Demo Helper Pill Buttons */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowMockModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold transition cursor-pointer shadow-sm hover:scale-[1.02]"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Mock Profiles (15 Students)</span>
          </button>

          <button
            type="button"
            onClick={handleSelectAdminDemo}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition cursor-pointer shadow-sm hover:scale-[1.02]"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span>Admin Demo</span>
          </button>
        </div>

        {/* Login Form Container */}
        <form onSubmit={handleSubmit} className="app-card-container p-6 sm:p-8 space-y-5 shadow-2xl">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/60 text-red-200 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Registration Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Registration Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                name="regNo"
                value={form.regNo}
                onChange={handleChange}
                required
                className="app-input pl-10 font-mono"
                placeholder="e.g. 2025503570"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
                className="app-input pl-10"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Switch to Register */}
          <p className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold">
              Register now
            </Link>
          </p>
        </form>
      </div>

      {/* =========================================================================
         ================= MOCK PROFILES MODAL (DEMO ACCOUNTS) ===================
         ========================================================================= */}
      {showMockModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="app-card-container w-full max-w-2xl max-h-[90vh] flex flex-col p-5 sm:p-6 space-y-4 shadow-2xl border border-purple-500/30 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    MOCK PROFILES
                  </h2>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Demo accounts for presentation/testing — Click &quot;Use&quot; to autofill credentials
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowMockModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Filter */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={mockSearchQuery}
                onChange={(e) => setMockSearchQuery(e.target.value)}
                placeholder="Search by name, regNo, department, or fine amount (e.g. 'Arjun', '₹120', 'CSE')..."
                className="app-input text-xs pl-9 w-full"
              />
            </div>

            {/* Accounts List Table / Cards */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 max-h-[55vh]">
              {/* Featured Admin Demo Account Card */}
              {(!mockSearchQuery ||
                'arun karthick administrator admin admin202501 library administration'
                  .toLowerCase()
                  .includes(mockSearchQuery.toLowerCase().trim())) && (
                <div
                  className={`app-card p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border transition ${
                    form.regNo === ADMIN_DEMO.regNo
                      ? 'border-amber-500/80 bg-amber-950/30 shadow-md shadow-amber-500/10'
                      : 'border-amber-500/40 bg-amber-950/15 hover:border-amber-500/60'
                  }`}
                >
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="badge-tag text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border-amber-500/40">
                        {ADMIN_DEMO.role}
                      </span>
                      <h3 className="font-bold text-sm text-white truncate">
                        {ADMIN_DEMO.name}
                      </h3>
                      <span className="badge-tag font-mono text-[11px] text-amber-200 border-amber-500/30">
                        {ADMIN_DEMO.regNo}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-300 flex-wrap">
                      <span>Role: Administrator</span>
                      <span className="text-slate-600">•</span>
                      <span>{ADMIN_DEMO.department}</span>
                      <span className="text-slate-600">•</span>
                      <span className="font-mono text-amber-300">PW: {ADMIN_DEMO.password}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={handleSelectAdminDemo}
                      className={`text-xs py-1.5 px-3.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition ${
                        form.regNo === ADMIN_DEMO.regNo
                          ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                          : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/30'
                      }`}
                    >
                      {form.regNo === ADMIN_DEMO.regNo ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Selected</span>
                        </>
                      ) : (
                        <span>Use</span>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {filteredMockProfiles.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No mock student profiles match your search.
                </div>
              ) : (
                filteredMockProfiles.map((p) => {
                  const isCurrentForm = form.regNo === p.regNo;
                  const hasFine = p.fineAmount > 0;

                  return (
                    <div
                      key={p.regNo}
                      className={`app-card p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border transition ${
                        isCurrentForm
                          ? 'border-purple-500/60 bg-purple-950/20'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm text-white truncate">
                            {p.name}
                          </h3>
                          <span className="badge-tag font-mono text-[11px] text-slate-300">
                            {p.regNo}
                          </span>
                          {hasFine ? (
                            <span className="badge-tag text-[10px] font-mono text-amber-300 border-amber-500/30 bg-amber-500/10">
                              ₹{p.fineAmount} Due
                            </span>
                          ) : (
                            <span className="badge-tag text-[10px] font-mono text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                              ₹0 Due
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                          <span className="flex items-center gap-1">
                            <GraduationCap className="w-3 h-3 text-slate-500" />
                            <span>Year {p.year} • {p.department}</span>
                          </span>
                          <span className="text-slate-600">•</span>
                          <span>{p.booksCount || 0} {p.booksCount === 1 ? 'book' : 'books'}</span>
                          <span className="text-slate-600">•</span>
                          <span className="font-mono text-slate-500">PW: {p.password}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleSelectMockProfile(p)}
                          className={`text-xs py-1.5 px-3.5 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition ${
                            isCurrentForm
                              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                              : 'btn-primary'
                          }`}
                        >
                          {isCurrentForm ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Selected</span>
                            </>
                          ) : (
                            <span>Use</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span>Common Password:</span>
                <code className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-purple-300 font-mono">
                  Demo@123
                </code>
              </div>
              <span className="text-slate-500">
                15 accounts across 6 departments with ₹0–₹300 fines
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

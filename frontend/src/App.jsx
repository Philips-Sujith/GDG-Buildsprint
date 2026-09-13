import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Grievance from './pages/Grievance';
import BookSearch from './pages/BookSearch';
import Contribution from './pages/Contribution';
import Profile from './pages/Profile';
import PrivateSpace from './pages/PrivateSpace';
import Admin from './pages/Admin';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch {
    user = null;
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-white">
        <div className="max-w-md w-full app-card-container p-6 sm:p-8 text-center space-y-4 border border-rose-500/30 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto text-2xl">
            🔒
          </div>
          <h2 className="text-xl font-bold text-rose-400">
            Access Denied
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Administrator privileges are required to access this portal. Your current account does not have permission to view or manage the Admin Dashboard.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <a
              href="/"
              className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              Return to Student Home
            </a>
            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
              }}
              className="btn-primary py-2 px-4 text-xs font-bold"
            >
              Admin Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/books"
          element={
            <ProtectedRoute>
              <BookSearch />
            </ProtectedRoute>
          }
        />
        <Route
          path="/contributions"
          element={
            <ProtectedRoute>
              <Contribution />
            </ProtectedRoute>
          }
        />
        <Route
          path="/materials"
          element={
            <ProtectedRoute>
              <Contribution />
            </ProtectedRoute>
          }
        />
        <Route
          path="/grievance"
          element={
            <ProtectedRoute>
              <Grievance />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/private-space"
          element={
            <ProtectedRoute>
              <PrivateSpace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />
        {/* Wildcard redirect to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

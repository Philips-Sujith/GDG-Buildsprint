import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Library, Lock, User, Mail, GraduationCap, AlertCircle, ArrowRight } from 'lucide-react';
import { registerUser } from '../api/api';

const departments = ['CSE', 'ECE', 'IT', 'EEE', 'MECH', 'CIVIL', 'AIDS', 'AIML'];

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    regNo: '',
    year: '1',
    department: 'CSE',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await registerUser({ ...form, year: Number(form.year) });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 font-sans relative overflow-hidden">
      {/* Background glowing orb */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-lg relative z-10 space-y-6 my-8">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-0.5 shadow-xl shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Library className="w-7 h-7 text-indigo-400" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            <span className="heading-gradient">Create Student Account</span>
          </h1>
          <p className="text-sm text-slate-400">Join the Smart Library platform today</p>
        </div>

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="app-card-container p-6 sm:p-8 space-y-4 shadow-2xl">
          
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800/60 text-red-200 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Full Name <span className="text-indigo-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="app-input pl-10"
                placeholder="e.g. Sujith Kumar"
              />
            </div>
          </div>

          {/* Registration Number */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Registration Number <span className="text-indigo-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <GraduationCap className="w-4 h-4" />
              </div>
              <input
                name="regNo"
                value={form.regNo}
                onChange={handleChange}
                required
                className="app-input pl-10 font-mono"
                placeholder="e.g. 2023503518"
              />
            </div>
          </div>

          {/* Academic Year & Department */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Academic Year <span className="text-indigo-400">*</span>
              </label>
              <select
                name="year"
                value={form.year}
                onChange={handleChange}
                className="app-select w-full"
              >
                {[1, 2, 3, 4].map((y) => (
                  <option key={y} value={y} className="bg-slate-900">
                    Year {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Department <span className="text-indigo-400">*</span>
              </label>
              <select
                name="department"
                value={form.department}
                onChange={handleChange}
                className="app-select w-full"
              >
                {departments.map((d) => (
                  <option key={d} value={d} className="bg-slate-900">
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                className="app-input pl-10"
                placeholder="you@student.edu"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Password (min 6 characters) <span className="text-indigo-400">*</span>
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
                minLength={6}
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
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          {/* Switch to Login */}
          <p className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold">
              Sign In
            </Link>
          </p>
        </form>

      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../api/api';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ regNo: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await loginUser(form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-5xl">📚</span>
          <h1 className="mt-4 text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Smart Library</h1>
          <p className="mt-2 text-slate-400">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 shadow-2xl space-y-5">
          {error && <div className="bg-red-500/20 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-lg">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Registration No</label>
            <input name="regNo" value={form.regNo} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition" placeholder="2023503518" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition" placeholder="••••••••" />
          </div>

          <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold hover:from-blue-500 hover:to-cyan-500 transition-all duration-200 shadow-lg shadow-blue-500/25 disabled:opacity-50 cursor-pointer">
            {loading ? 'Signing in...' : 'Login'}
          </button>

          <p className="text-center text-sm text-slate-400">
            Don&apos;t have an account? <Link to="/register" className="text-blue-400 hover:text-blue-300 font-medium">Register</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

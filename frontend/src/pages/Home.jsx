import { useState, useEffect } from 'react';
import { getLibraryCount } from '../api/api';
import Navbar from '../components/Navbar';

export default function Home() {
  const [countData, setCountData] = useState(null);
  const [loading, setLoading] = useState(true);

  // TODO: Wire in once teammate implements GET /api/notifications/:regNo
  // import { getNotifications } from '../api/api';
  // const user = JSON.parse(localStorage.getItem('user') || '{}');
  // useEffect(() => { getNotifications(user.regNo).then(res => setNotifications(res.data)); }, []);
  const notifications = [];

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const { data } = await getLibraryCount();
        setCountData(data);
      } catch (err) {
        console.error('Failed to fetch library count:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCount();
    // Refresh every 30 seconds
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const floorIcons = {
    'Study Room': '📖',
    'Floor 1': '1️⃣',
    'Floor 2': '2️⃣',
    'Floor 3': '3️⃣',
    'Reference Room': '📑',
    'Computer Lab': '💻',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* Notification Banner */}
        {notifications.length > 0 && (
          <div className="space-y-3 mb-8">
            {notifications.map((n, i) => (
              <div
                key={i}
                className={`px-5 py-3 rounded-xl border text-sm font-medium flex items-center gap-3 ${
                  n.type === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                }`}
              >
                <span>{n.type === 'warning' ? '⚠️' : 'ℹ️'}</span>
                {n.message}
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Total Count Hero */}
            <div className="text-center mb-12">
              <p className="text-slate-400 text-lg mb-2">Currently in the Library</p>
              <div className="text-8xl font-extrabold bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                {countData?.total || 0}
              </div>
              <p className="text-slate-500 mt-2">people right now</p>
            </div>

            {/* Floor Breakdown */}
            <h2 className="text-xl font-semibold text-white mb-4">Breakdown by Area</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {countData?.byFloor && Object.entries(countData.byFloor).map(([floor, count]) => (
                <div key={floor} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-all duration-300 group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{floorIcons[floor] || '🏛️'}</span>
                      <span className="text-slate-300 font-medium">{floor}</span>
                    </div>
                    <span className="text-3xl font-bold text-white group-hover:text-cyan-400 transition-colors">{count}</span>
                  </div>
                </div>
              ))}
              {countData && (!countData.byFloor || Object.keys(countData.byFloor).length === 0) && (
                <div className="col-span-full text-center py-8 text-slate-500">
                  No floor data available yet
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

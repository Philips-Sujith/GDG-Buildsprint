import { useState } from 'react';
import { uploadFile, submitGrievance } from '../api/api';
import Navbar from '../components/Navbar';

const reasons = ['Page Missing', 'Bad Condition', 'Torn Pages', 'Other'];

export default function Grievance() {
  const [form, setForm] = useState({ bookName: '', reasonDropdown: 'Page Missing', reasonText: '', shelfCode: '' });
  const [coverPhoto, setCoverPhoto] = useState({ url: '', uploading: false, preview: '' });
  const [reasonPhoto, setReasonPhoto] = useState({ url: '', uploading: false, preview: '' });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handlePhotoUpload = async (file, setter) => {
    if (!file) return;
    setter((prev) => ({ ...prev, uploading: true, preview: URL.createObjectURL(file) }));
    try {
      const { data } = await uploadFile(file);
      setter((prev) => ({ ...prev, url: data.url, uploading: false }));
    } catch (err) {
      setter((prev) => ({ ...prev, uploading: false }));
      setError('Photo upload failed. Try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!coverPhoto.url || !reasonPhoto.url) {
      setError('Please upload both photos before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const reasonText = form.reasonDropdown === 'Other'
        ? form.reasonText
        : `${form.reasonDropdown}${form.reasonText ? ' - ' + form.reasonText : ''}`;
      const { data } = await submitGrievance({
        bookName: form.bookName,
        coverPhotoUrl: coverPhoto.url,
        reasonPhotoUrl: reasonPhoto.url,
        reasonText,
        shelfCode: form.shelfCode,
      });
      setSuccess(data.grievanceId);
    } catch (err) {
      setError(err.response?.data?.error || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950" style={{ fontFamily: 'Inter, sans-serif' }}>
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-10">
            <span className="text-6xl">✅</span>
            <h2 className="text-2xl font-bold text-white mt-4">Grievance Submitted!</h2>
            <p className="text-slate-400 mt-2">Your grievance ID:</p>
            <p className="text-lg font-mono text-emerald-400 mt-1 bg-white/5 rounded-lg px-4 py-2 inline-block">{success}</p>
            <p className="text-slate-500 text-sm mt-4">We&apos;ll look into this as soon as possible.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-2">Report a Grievance</h1>
        <p className="text-slate-400 mb-8">Found a damaged or missing book? Let us know.</p>

        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 shadow-2xl space-y-6">
          {error && <div className="bg-red-500/20 border border-red-500/30 text-red-300 text-sm px-4 py-3 rounded-lg">{error}</div>}

          {/* Book Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Book Name</label>
            <input name="bookName" value={form.bookName} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition" placeholder="Enter book name" />
          </div>

          {/* Cover Photo */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Cover Photo</label>
            <div className="flex items-center gap-4">
              <label className="flex-1 flex items-center justify-center gap-2 px-4 py-6 rounded-lg border-2 border-dashed border-white/20 hover:border-blue-500/50 transition cursor-pointer bg-white/5">
                <span className="text-slate-400 text-sm">{coverPhoto.uploading ? 'Uploading...' : coverPhoto.url ? '✅ Uploaded' : '📷 Click to upload'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e.target.files[0], setCoverPhoto)} />
              </label>
              {coverPhoto.preview && <img src={coverPhoto.preview} alt="Cover" className="w-16 h-16 rounded-lg object-cover border border-white/10" />}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Reason</label>
            <select name="reasonDropdown" value={form.reasonDropdown} onChange={handleChange} className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition">
              {reasons.map((r) => <option key={r} value={r} className="bg-slate-800">{r}</option>)}
            </select>
          </div>

          {/* Additional Details */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Additional Details</label>
            <textarea name="reasonText" value={form.reasonText} onChange={handleChange} rows={3} className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition resize-none" placeholder="Describe the issue in detail..." />
          </div>

          {/* Reason Photo */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Damage Photo</label>
            <div className="flex items-center gap-4">
              <label className="flex-1 flex items-center justify-center gap-2 px-4 py-6 rounded-lg border-2 border-dashed border-white/20 hover:border-blue-500/50 transition cursor-pointer bg-white/5">
                <span className="text-slate-400 text-sm">{reasonPhoto.uploading ? 'Uploading...' : reasonPhoto.url ? '✅ Uploaded' : '📷 Click to upload'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e.target.files[0], setReasonPhoto)} />
              </label>
              {reasonPhoto.preview && <img src={reasonPhoto.preview} alt="Damage" className="w-16 h-16 rounded-lg object-cover border border-white/10" />}
            </div>
          </div>

          {/* Shelf Code */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Shelf Code</label>
            <input name="shelfCode" value={form.shelfCode} onChange={handleChange} required className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition" placeholder="A-1" />
          </div>

          <button type="submit" disabled={submitting || coverPhoto.uploading || reasonPhoto.uploading} className="w-full py-3 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold hover:from-blue-500 hover:to-cyan-500 transition-all duration-200 shadow-lg shadow-blue-500/25 disabled:opacity-50 cursor-pointer">
            {submitting ? 'Submitting...' : 'Submit Grievance'}
          </button>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Upload,
  CheckCircle2,
  Image as ImageIcon,
  MapPin,
  FileText,
  BookOpen,
  ArrowLeft,
  X,
} from 'lucide-react';
import { uploadFile, submitGrievance } from '../api/api';
import Navbar from '../components/Navbar';

const reasons = [
  'Page Missing',
  'Bad Condition',
  'Torn Pages',
  'Water Damage',
  'Binding Issue',
  'Other',
];

export default function Grievance() {
  const [form, setForm] = useState({
    bookName: '',
    reasonDropdown: 'Page Missing',
    reasonText: '',
    shelfCode: '',
  });

  // Dedicated, consistent File and preview states
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [damageFile, setDamageFile] = useState(null);
  const [damagePreview, setDamagePreview] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submittingStep, setSubmittingStep] = useState('');
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCoverSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleDamageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setDamageFile(file);
    setDamagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate required text fields
    if (!form.bookName.trim()) {
      setError('Please enter the Book Title / Subject Code.');
      return;
    }
    if (!form.shelfCode.trim()) {
      setError('Please enter the Shelf Code / Rack.');
      return;
    }

    // Validate that BOTH file objects exist in state
    if (!coverFile || !damageFile) {
      setError('Please upload both the Book Cover and Damage Evidence photos.');
      return;
    }

    // Prevent duplicate submissions
    if (submitting) return;
    setSubmitting(true);

    try {
      // 1. Upload Book Cover
      setSubmittingStep('Uploading book cover photo...');
      let coverPhotoUrl = '';
      try {
        const coverRes = await uploadFile(coverFile);
        coverPhotoUrl = coverRes.url || coverRes.fileUrl || coverRes.data?.url;
        if (!coverPhotoUrl) {
          throw new Error('No URL returned for book cover');
        }
      } catch (coverErr) {
        console.error('Book cover upload failed:', coverErr);
        setError('Book cover upload failed. Please try again.');
        setSubmitting(false);
        setSubmittingStep('');
        return;
      }

      // 2. Upload Damage Evidence
      setSubmittingStep('Uploading damage evidence photo...');
      let reasonPhotoUrl = '';
      try {
        const damageRes = await uploadFile(damageFile);
        reasonPhotoUrl = damageRes.url || damageRes.fileUrl || damageRes.data?.url;
        if (!reasonPhotoUrl) {
          throw new Error('No URL returned for damage evidence');
        }
      } catch (damageErr) {
        console.error('Damage evidence upload failed:', damageErr);
        setError('Damage evidence upload failed. Please try again.');
        setSubmitting(false);
        setSubmittingStep('');
        return;
      }

      // 3. Submit Grievance with both URLs
      setSubmittingStep('Submitting grievance report...');
      const reasonText =
        form.reasonDropdown === 'Other'
          ? form.reasonText
          : `${form.reasonDropdown}${form.reasonText ? ' - ' + form.reasonText : ''}`;

      const res = await submitGrievance({
        bookName: form.bookName.trim(),
        coverPhotoUrl,
        reasonPhotoUrl,
        reasonText,
        shelfCode: form.shelfCode.trim(),
      });

      const grievanceId = res.data?.grievanceId || res.grievanceId || 'GRV-' + Date.now();
      setSuccess(grievanceId);

      // Clear form and file states ONLY after successful submission
      setForm({ bookName: '', reasonDropdown: 'Page Missing', reasonText: '', shelfCode: '' });
      setCoverFile(null);
      setCoverPreview('');
      setDamageFile(null);
      setDamagePreview('');
    } catch (err) {
      console.error('Grievance submission error:', err);
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Submission failed. Please check connection.'
      );
    } finally {
      setSubmitting(false);
      setSubmittingStep('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Header */}
          <div className="text-center space-y-2 pt-2 pb-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              <span className="heading-gradient">Report Book Grievance</span>
            </h1>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              Found missing pages, physical wear, or incorrect shelf placement? Submit a report for our library maintenance staff.
            </p>
          </div>

          {/* Success State View */}
          {success ? (
            <div className="app-card-container p-8 sm:p-12 text-center space-y-5 animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Grievance Submitted Successfully</h2>
                <p className="text-sm text-slate-400 mt-1">Our library staff has received your complaint and will inspect the book.</p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 inline-block max-w-xs w-full">
                <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">Tracking Ticket ID</span>
                <span className="font-mono text-base font-bold text-emerald-400 mt-0.5 block">{success}</span>
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSuccess(null);
                    setForm({ bookName: '', reasonDropdown: 'Page Missing', reasonText: '', shelfCode: '' });
                    setCoverFile(null);
                    setCoverPreview('');
                    setDamageFile(null);
                    setDamagePreview('');
                    setError('');
                  }}
                  className="btn-secondary"
                >
                  Submit Another Grievance
                </button>
                <Link to="/" className="btn-primary">
                  <span>Back to Home</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Grievance Form */
            <form onSubmit={handleSubmit} className="app-card-container p-6 sm:p-8 space-y-6 shadow-2xl">
              
              {/* Error Alert */}
              {error && (
                <div className="p-4 rounded-xl bg-red-950/60 border border-red-800/60 text-red-200 flex items-start gap-3 text-xs sm:text-sm">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Book Name & Shelf Location in 2 cols */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Book Title / Subject Code <span className="text-indigo-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <input
                      name="bookName"
                      value={form.bookName}
                      onChange={handleChange}
                      required
                      className="app-input pl-10"
                      placeholder="e.g. Operating Systems Concepts (CS23302)"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Shelf Code / Rack <span className="text-indigo-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <input
                      name="shelfCode"
                      value={form.shelfCode}
                      onChange={handleChange}
                      required
                      className="app-input pl-10 font-mono"
                      placeholder="e.g. CS-04"
                    />
                  </div>
                </div>
              </div>

              {/* Reason Dropdown & Description */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Primary Grievance Category <span className="text-indigo-400">*</span>
                  </label>
                  <select
                    name="reasonDropdown"
                    value={form.reasonDropdown}
                    onChange={handleChange}
                    className="app-select w-full"
                  >
                    {reasons.map((r) => (
                      <option key={r} value={r} className="bg-slate-900">
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Detailed Notes / Specific Page Numbers
                  </label>
                  <textarea
                    name="reasonText"
                    value={form.reasonText}
                    onChange={handleChange}
                    rows={3}
                    className="app-input resize-none"
                    placeholder="e.g. Pages 145-160 are torn off in Chapter 4 CPU Scheduling..."
                  />
                </div>
              </div>

              {/* Photo Uploads Grid (Cover Photo + Damage Photo) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                
                {/* Cover Photo */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    1. Book Cover Photo <span className="text-indigo-400">*</span>
                  </label>
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl bg-slate-950/60 hover:bg-slate-950 transition cursor-pointer group min-h-[120px]">
                    {coverPreview && coverFile ? (
                      <div className="relative w-full flex items-center justify-between">
                        <img src={coverPreview} alt="Cover" className="h-16 w-16 object-cover rounded-lg border border-slate-700" />
                        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Ready
                        </span>
                      </div>
                    ) : (
                      <div className="text-center space-y-1">
                        <ImageIcon className="w-6 h-6 text-slate-500 group-hover:text-indigo-400 mx-auto transition" />
                        <span className="text-xs text-slate-300 font-medium block">
                          Upload Cover Photo
                        </span>
                        <span className="text-[10px] text-slate-500">PNG, JPG up to 10MB</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverSelect}
                    />
                  </label>
                </div>

                {/* Damage Photo */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    2. Damage Evidence Photo <span className="text-indigo-400">*</span>
                  </label>
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl bg-slate-950/60 hover:bg-slate-950 transition cursor-pointer group min-h-[120px]">
                    {damagePreview && damageFile ? (
                      <div className="relative w-full flex items-center justify-between">
                        <img src={damagePreview} alt="Evidence" className="h-16 w-16 object-cover rounded-lg border border-slate-700" />
                        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Ready
                        </span>
                      </div>
                    ) : (
                      <div className="text-center space-y-1">
                        <ImageIcon className="w-6 h-6 text-slate-500 group-hover:text-indigo-400 mx-auto transition" />
                        <span className="text-xs text-slate-300 font-medium block">
                          Upload Damage Photo
                        </span>
                        <span className="text-[10px] text-slate-500">PNG, JPG up to 10MB</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleDamageSelect}
                    />
                  </label>
                </div>

              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full py-3.5"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>{submittingStep || 'Submitting Grievance Report...'}</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      <span>Submit Grievance Report</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>
      </main>
    </div>
  );
}

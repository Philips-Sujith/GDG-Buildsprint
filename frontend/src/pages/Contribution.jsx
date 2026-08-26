import React, { useState, useEffect } from 'react';
import {
  Upload,
  FileText,
  Link as LinkIcon,
  Download,
  ExternalLink,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  X,
  FileUp,
  Plus,
} from 'lucide-react';
import { uploadMaterial, searchMaterials, uploadFile } from '../api/api';
import Navbar from '../components/Navbar';

const YEARS = [
  { id: 'all', label: 'All Years', value: null },
  { id: '1', label: '1st Year', value: 1 },
  { id: '2', label: '2nd Year', value: 2 },
  { id: '3', label: '3rd Year', value: 3 },
  { id: '4', label: '4th Year', value: 4 },
];

export default function Contribution() {
  // Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Upload Form State
  const [uploadMode, setUploadMode] = useState('link'); // 'link' | 'file'
  const [year, setYear] = useState('2');
  const [subjectCode, setSubjectCode] = useState('');
  const [title, setTitle] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploaderRegNo, setUploaderRegNo] = useState(() => {
    return localStorage.getItem('regNo') || 'REG' + Math.floor(2023000 + Math.random() * 900);
  });

  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(null);
  const [formError, setFormError] = useState(null);

  // Search & Download Materials State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [searchError, setSearchError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch materials
  useEffect(() => {
    let isMounted = true;

    async function fetchMaterialsList() {
      setLoadingMaterials(true);
      setSearchError(null);

      try {
        const params = {
          q: debouncedQuery || undefined,
          year: selectedYearFilter || undefined,
        };

        const data = await searchMaterials(params);
        if (isMounted) {
          setMaterials(data.materials || []);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to fetch materials:', err);
          setSearchError('Could not load study materials. Ensure backend server is active.');
        }
      } finally {
        if (isMounted) {
          setLoadingMaterials(false);
        }
      }
    }

    fetchMaterialsList();

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery, selectedYearFilter, refreshTrigger]);

  // Handle Material Upload Submission
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    setFormSuccess(null);
    setFormError(null);

    if (!subjectCode.trim()) {
      setFormError('Please enter a Subject Code (e.g. CS23302).');
      return;
    }
    if (!title.trim()) {
      setFormError('Please provide a descriptive title for this material.');
      return;
    }

    let finalFileUrl = fileUrl.trim();

    try {
      setSubmitting(true);

      // If file mode is selected, first upload the file through /api/upload
      if (uploadMode === 'file') {
        if (!selectedFile) {
          setFormError('Please choose a file to upload (PDF, DOC, ZIP, etc.).');
          setSubmitting(false);
          return;
        }

        const uploadRes = await uploadFile(selectedFile);
        if (!uploadRes.url && !uploadRes.fileUrl) {
          throw new Error('File upload service did not return a valid resource URL.');
        }
        finalFileUrl = uploadRes.url || uploadRes.fileUrl;
      } else {
        // Link mode validation
        if (!finalFileUrl) {
          setFormError('Please enter a valid Google Drive, Dropbox, or Web resource URL.');
          setSubmitting(false);
          return;
        }
      }

      // Submit metadata to /api/materials
      const payload = {
        uploaderRegNo: uploaderRegNo.trim() || 'STUDENT_ANON',
        year: parseInt(year, 10),
        subjectCode: subjectCode.trim().toUpperCase(),
        title: title.trim(),
        fileUrl: finalFileUrl,
      };

      const response = await uploadMaterial(payload);

      if (response.success) {
        setFormSuccess('Study material contributed successfully! Thank you for helping your peers.');
        // Reset form
        setTitle('');
        setSubjectCode('');
        setFileUrl('');
        setSelectedFile(null);
        // Refresh materials list
        setRefreshTrigger((prev) => prev + 1);
      } else {
        setFormError(response.message || 'Contribution failed. Please verify the input.');
      }
    } catch (err) {
      console.error('Submission error:', err);
      setFormError(err?.response?.data?.message || err.message || 'Failed to contribute material. Check connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setIsUploadModalOpen(false);
    setFormSuccess(null);
    setFormError(null);
  };

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return 'Recent';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <div className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Page Header & Upload Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 pb-3 border-b border-slate-900">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Study Materials &amp; Notes Hub
            </h1>

            {/* + Upload Material Action Button */}
            <div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-purple-600/30 transition cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Upload Material</span>
              </button>
            </div>
          </div>

          {/* Main Browse & Download Section (Default View) */}
          <div className="space-y-6">
            
            {/* Controls Row: Year Filter Tabs & Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Year Filter Tabs */}
              <div className="flex items-center gap-1.5 flex-wrap bg-slate-900/80 p-1 rounded-xl border border-slate-800">
                {YEARS.map((y) => (
                  <button
                    key={y.id}
                    type="button"
                    onClick={() => setSelectedYearFilter(y.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      selectedYearFilter === y.value
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    {y.label}
                  </button>
                ))}
              </div>

              {/* Results Count & Subtitle */}
              <span className="text-xs text-slate-400">
                {!loadingMaterials && (
                  <>Found <strong className="text-white">{materials.length}</strong> study resources</>
                )}
              </span>
            </div>

            {/* Search Input for Materials */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Search className="w-5 h-5 text-purple-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search materials by subject code (CS23302) or title keywords ('scheduling', 'thermo', 'linear algebra')..."
                className="w-full pl-12 pr-12 py-3.5 bg-slate-900/90 border border-slate-800 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-purple-500 transition shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-white cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded-full p-0.5" />
                </button>
              )}
            </div>

            {/* Search Error Alert */}
            {searchError && (
              <div className="p-4 rounded-xl bg-red-950/50 border border-red-800/60 text-red-200 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-xs">{searchError}</p>
              </div>
            )}

            {/* Loading Skeletons */}
            {loadingMaterials && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-4 animate-pulse"
                  >
                    <div className="flex justify-between items-center">
                      <div className="h-5 bg-slate-800 rounded w-20"></div>
                      <div className="h-5 bg-slate-800 rounded w-16"></div>
                    </div>
                    <div className="h-6 bg-slate-800 rounded w-4/5"></div>
                    <div className="h-4 bg-slate-800 rounded w-1/2"></div>
                    <div className="pt-3 border-t border-slate-800/60 h-8 bg-slate-800 rounded"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Materials Grid */}
            {!loadingMaterials && materials.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {materials.map((item) => (
                  <div
                    key={item._id}
                    className="bg-slate-900/85 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/50 rounded-xl p-5 transition duration-200 flex flex-col justify-between shadow-lg shadow-black/40 hover:shadow-purple-950/20 group"
                  >
                    <div className="space-y-3">
                      {/* Top Badges: Subject Code & Year */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-purple-950 border border-purple-700/50 text-purple-300 group-hover:border-purple-500/60 transition">
                          {item.subjectCode}
                        </span>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                          Year {item.year}
                        </span>
                      </div>

                      {/* Material Title */}
                      <h3 className="font-bold text-base text-white group-hover:text-purple-200 transition line-clamp-2 leading-snug">
                        {item.title}
                      </h3>

                      {/* Contributor and Date Metadata */}
                      <div className="space-y-1 pt-1 text-xs text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>Uploaded by: <span className="font-mono text-slate-300">{item.uploaderRegNo}</span></span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Date: {formatDate(item.uploadDate || item.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Open / Download Button */}
                    <div className="pt-4 mt-4 border-t border-slate-800/80">
                      <a
                        href={item.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 hover:border-purple-500 text-purple-300 hover:text-white text-xs font-semibold transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download / Open Resource</span>
                        <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loadingMaterials && materials.length === 0 && !searchError && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <FileText className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white">No Study Materials Found</h3>
                <p className="text-sm text-slate-400">
                  {debouncedQuery || selectedYearFilter
                    ? `No resources match your filters. Try selecting "All Years" or clearing your search.`
                    : `Be the first to contribute study materials for this section!`}
                </p>
                <div className="flex items-center justify-center gap-3 pt-2">
                  {(debouncedQuery || selectedYearFilter) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedYearFilter(null);
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                    >
                      Clear Filters
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-lg transition cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Upload Material
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>

      {/* =========================================================================
         ===================== UPLOAD MATERIAL MODAL DIALOG ======================
         ========================================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          {/* Backdrop Click Area */}
          <div className="fixed inset-0" onClick={closeModal}></div>

          {/* Modal Content Box */}
          <div className="relative z-10 w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Contribute Study Material</h2>
                  <p className="text-xs text-slate-400">Share notes or helpful reference links with fellow engineering students</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Feedback Alerts inside Modal */}
            {formSuccess && (
              <div className="p-4 rounded-xl bg-emerald-950/70 border border-emerald-700/60 text-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <span className="text-xs sm:text-sm font-medium">{formSuccess}</span>
                </div>
                <button onClick={() => setFormSuccess(null)} className="text-emerald-400 hover:text-emerald-200">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {formError && (
              <div className="p-4 rounded-xl bg-red-950/70 border border-red-700/60 text-red-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                  <span className="text-xs sm:text-sm font-medium">{formError}</span>
                </div>
                <button onClick={() => setFormError(null)} className="text-red-400 hover:text-red-200">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Upload Form */}
            <form onSubmit={handleUploadSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Year Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Academic Year <span className="text-purple-400">*</span>
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition cursor-pointer"
                    required
                  >
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>

                {/* Subject Code */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Subject Code <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CS23302"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 font-mono text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 uppercase transition"
                    required
                  />
                </div>

                {/* Uploader Reg No */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Uploader Reg No <span className="text-slate-400 font-normal">(Auto)</span>
                  </label>
                  <input
                    type="text"
                    value={uploaderRegNo}
                    onChange={(e) => setUploaderRegNo(e.target.value)}
                    placeholder="e.g. 21CS045"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 font-mono text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    required
                  />
                </div>

                {/* Upload Mode Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Upload Mode
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-700">
                    <button
                      type="button"
                      onClick={() => setUploadMode('link')}
                      className={`flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        uploadMode === 'link'
                          ? 'bg-purple-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <LinkIcon className="w-3 h-3" /> Drive
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode('file')}
                      className={`flex items-center justify-center gap-1 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        uploadMode === 'file'
                          ? 'bg-purple-600 text-white shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <FileUp className="w-3 h-3" /> File
                    </button>
                  </div>
                </div>
              </div>

              {/* Title & Resource Link / File */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Material Title */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                    Material Title / Description <span className="text-purple-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Unit 3 CPU Scheduling & Deadlock Handwritten Notes"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                    required
                  />
                </div>

                {/* Conditional Input: File or Link */}
                <div>
                  {uploadMode === 'link' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                        Google Drive / Resource URL <span className="text-purple-400">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                          <LinkIcon className="w-4 h-4" />
                        </div>
                        <input
                          type="url"
                          value={fileUrl}
                          onChange={(e) => setFileUrl(e.target.value)}
                          placeholder="https://drive.google.com/file/d/..."
                          className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition"
                          required={uploadMode === 'link'}
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                        Select Document / PDF File <span className="text-purple-400">*</span>
                      </label>
                      <input
                        type="file"
                        onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.zip,.png,.jpg"
                        className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer focus:outline-none"
                        required={uploadMode === 'file'}
                      />
                      {selectedFile && (
                        <p className="text-[11px] text-purple-300 mt-1">
                          Ready: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-purple-600/30 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Upload &amp; Contribute</span>
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}

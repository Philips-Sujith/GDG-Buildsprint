import axios from 'axios';

/**
 * Resolves the authoritative backend API base URL:
 * 1. Reads VITE_API_BASE_URL or VITE_API_URL if configured.
 * 2. Normalizes trailing slashes and ensures /api path exists without double slashes.
 * 3. In production mode, defaults to 'https://gdg-buildsprint.onrender.com/api'.
 * 4. In development mode, defaults to '/api' (proxied by Vite to local backend http://localhost:5000).
 */
const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    let cleanUrl = envUrl.trim().replace(/\/+$/, '');
    if (!cleanUrl.endsWith('/api')) {
      cleanUrl = `${cleanUrl}/api`;
    }
    return cleanUrl;
  }
  if (import.meta.env.PROD) {
    return 'https://gdg-buildsprint.onrender.com/api';
  }
  return '/api';
};

/**
 * Single shared Axios instance for all teammates (Person 1, Person 2, Person 3)
 */
const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token automatically to every outgoing request if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      // Only attach Authorization header to our library backend API requests, never to third-party endpoints (e.g. Cloudinary)
      const url = config.url || '';
      const isExternal =
        (url.startsWith('http://') || url.startsWith('https://')) &&
        !url.includes(window.location.host) &&
        !url.includes('gdg-buildsprint.onrender.com');
      if (!isExternal) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for graceful error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const url = error.config?.url || '';
      // CRITICAL: File upload requests (Cloudinary or backend /upload) must NEVER clear user auth
      const isUploadRequest = url.includes('/upload') || url.includes('cloudinary');
      
      if (!isUploadRequest) {
        const path = window.location.pathname;
        const isPublicPage = path === '/login' || path === '/register' || path === '/books' || path === '/contributions';

        // Only log out if it's a verified JWT session expiration on an authenticated API
        const errorMsg = String(error.response.data?.error || error.response.data?.message || '').toLowerCase();
        const isTokenExpired = errorMsg.includes('token') || errorMsg.includes('unauthorized');

        if (!isPublicPage && isTokenExpired) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

/* =========================================================================
   =================== PERSON 1: AUTH & CORE SERVICES ======================
   ========================================================================= */

/**
 * Register a new student account
 * @param {Object} userData - { name, regNo, year, department, email, password }
 */
export const registerUser = (userData) => api.post('/auth/register', userData);

/**
 * Login existing student
 * @param {Object} credentials - { regNo, password }
 */
export const loginUser = (credentials) => api.post('/auth/login', credentials);

/**
 * Fetch demo mock profiles for presentation
 */
export const getMockProfiles = () => api.get('/auth/mock-profiles');

/**
 * Fetch live library crowd count
 */
export const getLibraryCount = () => api.get('/library/count');

/**
 * Submit book grievance with damage details
 * @param {Object} grievanceData - { bookName, coverPhotoUrl, reasonPhotoUrl, reasonText, shelfCode }
 */
export const submitGrievance = (grievanceData) => api.post('/grievance', grievanceData);

/**
 * Upload single file (book cover, damage photo, study note) to backend
 * Handles both JSON responses and FormData payloads
 * @param {File} file - Browser File object
 */
export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  const resData = response.data || {};
  return {
    ...response,
    data: resData,
    url: resData.url || resData.fileUrl,
    fileUrl: resData.fileUrl || resData.url,
  };
};

/* =========================================================================
   =================== PERSON 2: BOOK SEARCH & CONTRIBUTIONS ===============
   ========================================================================= */

/**
 * Fetch books catalog with optional pagination, category, and stock filters
 * @param {Object} params - { page, limit, category, inStock }
 */
export const getBooks = async (params = {}) => {
  const response = await api.get('/books', { params });
  return response.data;
};

/**
 * Relevance-ranked smart search for books
 * Matches subject code, partial words (e.g. "eng physics"), titles, authors, and categories
 * @param {string} query - Search term
 * @param {Object} params - Optional extra filters: { category, inStock, limit }
 */
export const searchBooks = async (query = '', params = {}) => {
  const response = await api.get('/books/search', {
    params: {
      q: query,
      ...params,
    },
  });
  return response.data;
};

/**
 * Get a single book by ID
 * @param {string} bookId
 */
export const getBookById = async (bookId) => {
  const response = await api.get(`/books/${bookId}`);
  return response.data;
};

/**
 * Contribute/Upload new study material (PDF, drive link, handwritten notes)
 * @param {Object} materialData - { uploaderRegNo, year, subjectCode, title, fileUrl }
 */
export const uploadMaterial = async (materialData) => {
  const response = await api.post('/materials', materialData);
  return response.data;
};

/**
 * Search study materials by query and optional year filter
 * @param {Object} params - { q, year }
 */
export const searchMaterials = async (params = {}) => {
  const response = await api.get('/materials/search', { params });
  return response.data;
};

/**
 * Fetch all study materials
 * GET /api/materials
 * @param {Object} params - { year, subjectCode }
 */
export const getMaterials = async (params = {}) => {
  const response = await api.get('/materials', { params });
  return response.data;
};

/* =========================================================================
   =================== PERSON 3: PROFILE, PAYMENTS, GROUPS & PRESENCE ======
   ========================================================================= */

/**
 * Fetch Student Profile details (borrowed books, dues, fine totals)
 * GET /api/profile/:regNo
 */
export const getProfile = async (regNo) => {
  const response = await api.get(`/profile/${regNo}`);
  return response.data;
};

/**
 * Create a Razorpay Test Mode Payment Order for fine dues
 * POST /api/payment/create-order
 * @param {string} regNo
 */
export const createPaymentOrder = async (regNo) => {
  const response = await api.post('/payment/create-order', { regNo });
  return response.data;
};

/**
 * Verify Razorpay Test Mode Payment with backend signature check
 * POST /api/payment/verify
 * @param {Object} payload - { regNo, razorpay_order_id, razorpay_payment_id, razorpay_signature }
 */
export const verifyPayment = async ({
  regNo,
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) => {
  const response = await api.post('/payment/verify', {
    regNo,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });
  return response.data;
};

/**
 * Create a new Study/Material Sharing Group
 * POST /api/groups
 * @param {string} ownerRegNo
 * @param {string[]} memberRegNos
 * @param {string} [name]
 */
export const createGroup = async (ownerRegNo, memberRegNos, name) => {
  const response = await api.post('/groups', { ownerRegNo, memberRegNos, name });
  return response.data;
};

/**
 * Fetch Study Groups accessible to Student
 * GET /api/groups/:regNo
 */
export const getGroups = async (regNo) => {
  const response = await api.get(`/groups/${regNo}`);
  return response.data;
};

/**
 * Share a Material to a Group
 * POST /api/groups/:id/share
 */
export const shareToGroup = async (groupId, materialId, regNo) => {
  const response = await api.post(`/groups/${groupId}/share`, { materialId, regNo });
  return response.data;
};

/**
 * Check-in to Library Presence
 * POST /api/presence/checkin
 */
export const checkIn = async (regNo, floor) => {
  const response = await api.post('/presence/checkin', { regNo, floor });
  return response.data;
};

/**
 * Check-out / Leave Library Presence
 * POST /api/presence/checkout
 */
export const checkOut = async (regNo) => {
  const response = await api.post('/presence/checkout', { regNo });
  return response.data;
};

/**
 * Respond to Library Presence Ping Alert ("Are you still in library?")
 * POST /api/presence/ping-response
 */
export const respondToPing = async (regNo, stillHere) => {
  const response = await api.post('/presence/ping-response', { regNo, stillHere });
  return response.data;
};

/**
 * Get Presence Status for Student
 * GET /api/presence/:regNo
 */
export const getPresence = async (regNo) => {
  const response = await api.get(`/presence/${regNo}`);
  return response.data;
};

/**
 * Fetch Unread Notifications for Student
 * GET /api/notifications/:regNo
 */
export const getNotifications = async (regNo) => {
  const response = await api.get(`/notifications/${regNo}`);
  return response.data;
};

/**
 * Dismiss a specific notification by ID
 * POST /api/notifications/:id/read
 */
export const dismissNotification = async (id) => {
  const response = await api.post(`/notifications/${id}/read`);
  return response.data;
};

/**
 * Dismiss unread notifications by message pattern
 * POST /api/notifications/dismiss
 */
export const dismissNotificationsByPattern = async (regNo, message) => {
  const response = await api.post('/notifications/dismiss', { regNo, message });
  return response.data;
};

/* =========================================================================
   =================== ADMIN DASHBOARD APIs ===============================
   ========================================================================= */

/**
 * Fetch overview stats and live occupancy breakdown
 */
export const getAdminOverview = async () => {
  const response = await api.get('/admin/overview');
  return response.data;
};

/**
 * Fetch books with pagination & search
 */
export const getAdminBooks = async (params = {}) => {
  const response = await api.get('/admin/books', { params });
  return response.data;
};

/**
 * Add a new catalog book
 */
export const addAdminBook = async (bookData) => {
  const response = await api.post('/admin/books', bookData);
  return response.data;
};

/**
 * Update an existing catalog book
 */
export const updateAdminBook = async (id, bookData) => {
  const response = await api.put(`/admin/books/${id}`, bookData);
  return response.data;
};

/**
 * Fetch all student grievances
 */
export const getAdminGrievances = async () => {
  const response = await api.get('/admin/grievances');
  return response.data;
};

/**
 * Update grievance status
 */
export const updateAdminGrievanceStatus = async (id, status) => {
  const response = await api.put(`/admin/grievances/${id}/status`, { status });
  return response.data;
};

/**
 * Fetch Razorpay payment transactions with filter
 */
export const getAdminPayments = async (params = {}) => {
  const response = await api.get('/admin/payments', { params });
  return response.data;
};

/**
 * Reset active library occupancy to zero
 */
export const resetLibraryOccupancy = async () => {
  const response = await api.post('/admin/library/reset');
  return response.data;
};

export default api;


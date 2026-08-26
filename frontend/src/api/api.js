import axios from 'axios';

/**
 * Single shared Axios instance for all teammates (Person 1, Person 2, Person 3)
 */
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token automatically to every outgoing request if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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
      // Don't auto-redirect on public search pages
      const path = window.location.pathname;
      if (path !== '/login' && path !== '/register' && path !== '/books' && path !== '/contributions') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
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
 * Create a Demo Payment Order for fine dues
 * POST /api/payment/create-order
 */
export const createPaymentOrder = async (regNo, amount) => {
  const response = await api.post('/payment/create-order', { regNo, amount });
  return response.data;
};

/**
 * Process / Verify Demo Payment Order
 * POST /api/payment/verify
 */
export const verifyPayment = async (orderId, regNo, paymentMethod = 'UPI', transactionId = null, amount = 0) => {
  const response = await api.post('/payment/verify', { orderId, regNo, paymentMethod, transactionId, amount });
  return response.data;
};

/**
 * Create a new Study/Material Sharing Group
 * POST /api/groups
 */
export const createGroup = async (ownerRegNo, memberRegNos) => {
  const response = await api.post('/groups', { ownerRegNo, memberRegNos });
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

export default api;

import axios from 'axios';

// Base API configuration (configurable via VITE_API_URL or defaults to localhost backend)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor to attach shared Auth Token (JWT)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for consistent error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Call Error:', error?.response?.data || error.message);
    return Promise.reject(error);
  }
);

/* =========================================================================
   =================== BOOK SEARCH & CONTRIBUTION MODULE ===================
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
 * @param {Object} params - { q, year, limit }
 */
export const searchMaterials = async (params = {}) => {
  const response = await api.get('/materials/search', { params });
  return response.data;
};

/**
 * Helper to upload raw file (PDF, doc) to shared backend upload endpoint
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
  return response.data;
};

/* =========================================================================
   ===================== TEAMMATE MODULE HOOKS / STUBS =====================
   ========================================================================= */

// Teammates can plug auth/borrowing APIs here:
// export const login = async (credentials) => ...
// export const register = async (userData) => ...
// export const borrowBook = async (bookId) => ...

export default api;

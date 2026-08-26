import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5000/api' });

// Attach JWT to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ===== Auth =====
export const registerUser = (data) => API.post('/auth/register', data);
export const loginUser = (data) => API.post('/auth/login', data);

// ===== Library =====
export const getLibraryCount = () => API.get('/library/count');

// ===== Grievance =====
export const submitGrievance = (data) => API.post('/grievance', data);

// ===== Upload =====
export const uploadFile = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return API.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// ===== Notifications (TODO: teammate will implement backend) =====
// export const getNotifications = (regNo) => API.get(`/notifications/${regNo}`);

export default API;

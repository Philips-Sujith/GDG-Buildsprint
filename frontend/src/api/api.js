import axios from "axios";

// Shared Axios Instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor for Auth Token Header Setup
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;

/* ==========================================================================
   STUDENT PROFILE MODULE API FUNCTIONS
   ========================================================================== */

/**
 * Fetch Student Profile with Borrowed Books and Total Due Fine
 * GET /api/profile/:regNo
 */
export const getProfile = async (regNo) => {
  const response = await api.get(`/profile/${regNo}`);
  return response.data;
};

/**
 * Create Payment Order via Cashfree Sandbox
 * POST /api/payment/create-order
 */
export const createPaymentOrder = async (regNo, amount) => {
  const response = await api.post("/payment/create-order", { regNo, amount });
  return response.data;
};

/**
 * Verify Cashfree Payment Order
 * POST /api/payment/verify
 */
export const verifyPayment = async (orderId, regNo) => {
  const response = await api.post("/payment/verify", { orderId, regNo });
  return response.data;
};

/**
 * Create a new Study/Material Sharing Group
 * POST /api/groups
 */
export const createGroup = async (ownerRegNo, memberRegNos) => {
  const response = await api.post("/groups", { ownerRegNo, memberRegNos });
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
  const response = await api.post("/presence/checkin", { regNo, floor });
  return response.data;
};

/**
 * Respond to Library Presence Ping Alert ("Are you still in library?")
 * POST /api/presence/ping-response
 */
export const respondToPing = async (regNo, stillHere) => {
  const response = await api.post("/presence/ping-response", { regNo, stillHere });
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

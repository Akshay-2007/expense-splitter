import axios from 'axios';

// Create axios instance with base URL pointing to the backend (via Vite proxy or env)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token from localStorage to every request
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

// Response interceptor — on 401 Unauthorized, clear session and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ────────────────────────────────────────────────────────────────
export const authAPI = {
  /** Register a new user */
  register: (data) => api.post('/auth/register', data),
  /** Login with email & password */
  login: (data) => api.post('/auth/login', data),
  /** Get the currently authenticated user profile */
  getMe: () => api.get('/auth/me'),
};

// ─── Group API ───────────────────────────────────────────────────────────────
export const groupAPI = {
  /** Create a new group */
  create: (data) => api.post('/groups', data),
  /** Get all groups the current user belongs to */
  getAll: () => api.get('/groups'),
  /** Get a single group by ID */
  getById: (id) => api.get(`/groups/${id}`),
  /** Add a member to a group by email */
  addMember: (id, email) => api.post(`/groups/${id}/members`, { email }),
  /** Remove a member from a group */
  removeMember: (groupId, userId) =>
    api.delete(`/groups/${groupId}/members/${userId}`),
};

// ─── Expense API ─────────────────────────────────────────────────────────────
export const expenseAPI = {
  /** Create a new expense in a group */
  create: (groupId, data) => api.post(`/groups/${groupId}/expenses`, data),
  /** Get all expenses for a group (supports query params for filters) */
  getAll: (groupId, params = {}) =>
    api.get(`/groups/${groupId}/expenses`, { params }),
  /** Update an existing expense */
  update: (id, data) => api.put(`/expenses/${id}`, data),
  /** Delete an expense */
  delete: (id) => api.delete(`/expenses/${id}`),
};

// ─── Balance API ─────────────────────────────────────────────────────────────
export const balanceAPI = {
  /** Get balances for every member in a group */
  get: (groupId) => api.get(`/groups/${groupId}/balances`),
};

// ─── Settlement API ──────────────────────────────────────────────────────────
export const settlementAPI = {
  /** Record a new settlement */
  create: (groupId, data) =>
    api.post(`/groups/${groupId}/settlements`, data),
  /** Get all settlements for a group */
  getAll: (groupId) => api.get(`/groups/${groupId}/settlements`),
};

export default api;

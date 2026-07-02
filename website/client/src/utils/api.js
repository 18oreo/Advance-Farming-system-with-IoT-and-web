import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const CHANNEL_ID = (process.env.REACT_APP_THINGSPEAK_CHANNEL || '').trim();
const READ_KEY = (process.env.REACT_APP_THINGSPEAK_READ_KEY || '').trim();
const THINGSPEAK_BASE = 'https://api.thingspeak.com';

const buildThingSpeakUrl = (path, params = {}) => {
  if (!CHANNEL_ID) {
    throw new Error('Missing REACT_APP_THINGSPEAK_CHANNEL. Add it in client/.env to enable guest ThingSpeak access.');
  }

  const query = new URLSearchParams(params);
  if (READ_KEY) query.set('api_key', READ_KEY);

  const queryString = query.toString();
  return `${THINGSPEAK_BASE}/channels/${CHANNEL_ID}${path}${queryString ? `?${queryString}` : ''}`;
};

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('agritech_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ThingSpeak Direct API (for real-time)
export const thingspeakAPI = {
  getLatest: () =>
    axios.get(buildThingSpeakUrl('/feeds/last.json')),
  getFeeds: (results = 100) =>
    axios.get(buildThingSpeakUrl('/feeds.json', { results })),
  getChannelInfo: () =>
    axios.get(buildThingSpeakUrl('/feeds.json', { results: 1 })),
  getFieldData: (field, results = 100) =>
    axios.get(buildThingSpeakUrl(`/fields/${field}.json`, { results }))
};

// Backend API
export const sensorAPI = {
  getLatest: () => api.get('/thingspeak/latest'),
  getFeeds: (results = 100) => api.get(`/thingspeak/feeds?results=${results}`),
  getChannelInfo: () => api.get('/thingspeak/channel'),
  getStats: (hours = 24) => api.get(`/sensors/stats?hours=${hours}`),
  getChartData: (field, hours = 24) => api.get(`/sensors/chart?field=${field}&hours=${hours}`),
  sync: () => api.post('/thingspeak/sync'),
};

export const alertAPI = {
  getAll: (params = {}) => api.get('/alerts', { params }),
  resolve: (id) => api.put(`/alerts/${id}/resolve`),
  resolveAll: () => api.put('/alerts/resolve-all'),
};

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  register: (data) => api.post('/auth/register', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getProfile: () => api.get('/auth/profile'),
};

export default api;

import axios from 'axios';

const baseURL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: `${baseURL}/api`,
  headers: { 'Content-Type': 'application/json' },
  // Firestore-backed writes can take longer than the initial catalog request.
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  try {
    const session = JSON.parse(localStorage.getItem('lazada_session') || 'null');
    if (session?.token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${session.token}`;
  } catch {
    // Ignore broken local session data; protected endpoints will return 401.
  }
  return config;
});

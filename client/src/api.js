import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const API_ORIGIN = new URL(API_URL, window.location.origin).origin;

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('movie_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

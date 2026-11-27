import axios from "axios";

// One place for the server address. It follows the address the website was opened from,
// so localhost and 127.0.0.1 both work. Set VITE_API_URL in client/.env to use another server.
export const API_BASE = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:5000/api`;

// The login token is added to every request.
const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

import axios from 'axios';
 
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});
 
// attach the JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
 
// if the token is rejected, clear it and go back to the login page
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthCall = err.config?.url?.startsWith('/auth/login') || err.config?.url?.startsWith('/auth/register');
    if (err.response?.status === 401 && !isAuthCall && localStorage.getItem('token')) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
 
// turns an axios error into a readable message
export const getError = (err) =>
  err.response?.data?.message || err.message || 'Something went wrong';
 
export default api;


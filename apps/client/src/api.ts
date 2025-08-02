import axios from 'axios';
import { cfg } from './config';

export const api = axios.create({
  baseURL: cfg.apiBase,
  timeout: 20000,
});

api.interceptors.response.use(
  (r) => r,
  (e) => {
    const msg =
      e?.response?.data?.message ||
      e?.response?.data?.error ||
      e?.message ||
      'Network error';
    return Promise.reject(new Error(msg));
  }
);
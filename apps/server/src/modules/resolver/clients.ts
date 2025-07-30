import axios from 'axios';
import { ENV as env } from '../../shared/config.module';

export const oneInch = axios.create({
  baseURL: `https://api.1inch.dev/swap/v6.1/${env.ONEINCH_CHAIN_FOR_QUOTES}`,
  headers: { Authorization: `Bearer ${env.ONEINCH_API_KEY}` },
  timeout: 8000,
});

export const horizon = axios.create({
  baseURL: env.HORIZON_URL,
  timeout: 8000,
});